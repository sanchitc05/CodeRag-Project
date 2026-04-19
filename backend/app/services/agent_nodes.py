"""Node functions for the CodeRAG LangGraph reasoning agent.

Each function takes a full AgentState and returns a *partial* dict
containing only the fields it updates.

Generation is handled by Gemma 3 (via Google AI API) through model_manager.generate().
Prompts are written as instruction-style messages suited for a chat/instruction-tuned LLM.
"""

import logging
from typing import Any

from app.services.agent_state import AgentState
from app.services.model_loader import model_manager
from app.services.retrieval import retrieve_context

logger = logging.getLogger(__name__)

# Stopwords used by the verify node for keyword filtering
_STOPWORDS: set[str] = {
    "about", "after", "again", "being", "below", "between", "could",
    "does", "doing", "during", "each", "from", "further", "have",
    "having", "here", "itself", "just", "more", "most", "other",
    "over", "same", "should", "some", "such", "than", "that", "their",
    "them", "then", "there", "these", "they", "this", "those",
    "through", "under", "very", "what", "when", "where", "which",
    "while", "will", "with", "would",
}

# Maximum characters per code chunk in prompts — prevents token overflow
# Gemini 1.5 Pro can handle much more, but we keep it reasonable for cost/speed.
_MAX_CHUNK_CHARS = 1500


def _truncate(text: str, max_chars: int = _MAX_CHUNK_CHARS) -> str:
    """Truncate text to max_chars, appending ellipsis if needed."""
    if len(text) <= max_chars:
        return text
    return text[:max_chars] + "…"


def _format_chunk_for_prompt(chunk: dict, index: int) -> str:
    """Format a code chunk for inclusion in a prompt."""
    file_path = chunk.get("file_path", "unknown")
    start_line = chunk.get("start_line", "?")
    end_line = chunk.get("end_line", "?")
    name = chunk.get("name", "")
    content = _truncate(chunk.get("content", ""), _MAX_CHUNK_CHARS)
    score = chunk.get("score", 0.0)

    header = f"[{index}] {file_path}"
    if name:
        header += f" — {name}"
    header += f" (lines {start_line}–{end_line}, relevance={score:.2f})"
    return f"{header}\n```\n{content}\n```"


# ─────────────────────────────────────────────────────────────────────
# Node 1 — Retrieve
# ─────────────────────────────────────────────────────────────────────

def retrieve_node(state: AgentState) -> dict:
    """Call the RAG retrieval pipeline and store the result in state."""
    try:
        context = retrieve_context(state["query"], state["repo_id"])
        context_dict = dict(context)
        n_code = len(context_dict.get("code_chunks", []))
        n_logs = len(context_dict.get("log_results", []))
        logger.info(f"[RETRIEVE] Got {n_code} code chunks, {n_logs} log results")
        print(f"[RETRIEVE] Got {n_code} code chunks, {n_logs} log results")
        return {"retrieval_context": context_dict}
    except Exception as e:
        logger.error(f"[RETRIEVE] Failed: {e}")
        print(f"[RETRIEVE] Failed: {e}")
        return {"retrieval_context": None, "error": str(e)}


# ─────────────────────────────────────────────────────────────────────
# Node 2 — Analyze
# ─────────────────────────────────────────────────────────────────────

def analyze_node(state: AgentState) -> dict:
    """Generate a debugging hypothesis or architectural overview using Gemini."""
    query = state["query"]
    ctx = state.get("retrieval_context") or {}
    intent = ctx.get("intent", "CODE_LEVEL")
    code_chunks = ctx.get("code_chunks", [])
    history = list(state.get("hypothesis_history", []))

    # Format code chunks for the prompt
    code_block_parts: list[str] = []
    # For Gemini Pro, we can include more chunks (up to 5)
    for i, chunk in enumerate(code_chunks[:5], start=1):
        code_block_parts.append(_format_chunk_for_prompt(chunk, i))

    has_code = bool(code_block_parts)
    code_block = "\n\n".join(code_block_parts) if has_code else None
    history_str = "\n".join(f"- {h}" for h in history[-2:]) if history else None

    # Base System Prompt
    system_role = (
        "You are an Elite Software Architect and Debugging Assistant. "
        "Your goal is to provide deep, accurate insights into the provided codebase.\n\n"
    )

    if intent == "REPO_LEVEL":
        prompt = (
            f"{system_role}"
            f"USER QUERY: {query}\n\n"
            "CONTEXT (Top-level files and project structure):\n"
            f"{code_block if has_code else 'No specific files retrieved.'}\n\n"
            "INSTRUCTIONS:\n"
            "Analyze the project structure and provided files. Explain how the project is organized "
            "and what the primary components do in relation to the user's query. Be architectural and concise."
        )
    elif intent == "LOG_LEVEL":
        log_block = "\n".join([f"LOG: {l.get('message', '')}" for l in ctx.get("log_results", [])[:5]])
        prompt = (
            f"{system_role}"
            f"USER QUERY: {query}\n\n"
            f"LOG ERRORS DETECTED:\n{log_block}\n\n"
            "CHOSEN CODE CONTEXT:\n"
            f"{code_block if has_code else 'No relevant code found.'}\n\n"
            "INSTRUCTIONS:\n"
            "Correlate the log errors with the code context. Identify the specific failure point or "
            "provide a hypothesis on why these logs are occurring."
        )
    else:  # CODE_LEVEL
        prompt = (
            f"{system_role}"
            f"USER QUERY: {query}\n\n"
            f"RELEVANT CODE CHUNKS:\n{code_block}\n\n"
            "INSTRUCTIONS:\n"
            "1. Analyze the code blocks to answer the technical question or find the bug root cause.\n"
            "2. Be extremely specific about variable names, logic flow, and edge cases.\n"
            "3. If previous hypotheses exist, refine them based on this code evidence."
        )

    if history_str:
        prompt += f"\n\nPREVIOUS ANALYSIS:\n{history_str}"

    try:
        hypothesis = model_manager.generate(prompt, max_new_tokens=512)
    except Exception as e:
        logger.error(f"[ANALYZE] Generation failed: {e}")
        hypothesis = f"Analysis failed: {e}"

    hypothesis = hypothesis.strip()
    history.append(hypothesis)
    new_iteration = state.get("iteration", 0) + 1

    return {
        "hypothesis": hypothesis,
        "hypothesis_history": history,
        "iteration": new_iteration,
    }


# ─────────────────────────────────────────────────────────────────────
# Node 3 — Verify
# ─────────────────────────────────────────────────────────────────────

def verify_node(state: AgentState) -> dict:
    """Score hypothesis confidence and collect evidence chunks."""
    hypothesis = state.get("hypothesis", "") or ""
    ctx = state.get("retrieval_context") or {}
    code_chunks = ctx.get("code_chunks", [])
    iteration = state.get("iteration", 1)
    intent = ctx.get("intent", "CODE_LEVEL")

    # ── 1. Semantic similarity score (0.0 – 0.4) ────────────────────
    sim_scores = [c.get("score", 0.0) for c in code_chunks if c.get("score") is not None]
    if sim_scores:
        avg_sim = sum(sim_scores) / len(sim_scores)
        similarity_score = min(avg_sim, 1.0) * 0.4
    else:
        similarity_score = 0.0

    # ── 2. Keyword overlap score (0.0 – 0.25) ───────────────────────
    hyp_words = {
        w.lower()
        for w in hypothesis.split()
        if len(w) > 4 and w.lower() not in _STOPWORDS
    }
    total_keywords = len(hyp_words)
    all_content = " ".join(c.get("content", "") for c in code_chunks).lower()
    matches = sum(1 for w in hyp_words if w in all_content)
    keyword_score = min(matches / max(total_keywords, 1), 1.0) * 0.25

    # ── 3. Evidence depth score (0.0 – 0.2) ─────────────────────────
    unique_files = {c.get("file_path", "").lower() for c in code_chunks if c.get("file_path")}
    depth_score = min(len(unique_files) / 3, 1.0) * 0.2

    # ── 4. Iteration bonus (0.0 – 0.15) ─────────────────────────────
    iteration_score = min(iteration / 3, 1.0) * 0.15

    confidence = round(similarity_score + keyword_score + depth_score + iteration_score, 4)

    # ── 5. REPO_LEVEL BOOST (STRICT REQUIRMENT) ──────────────────────
    if intent == "REPO_LEVEL":
        # Check for README + Config/Package files
        has_readme = any("readme.md" in f for f in unique_files)
        config_files = ["package.json", "requirements.txt", "docker-compose.yml", "go.mod", "pom.xml"]
        has_config = any(any(cfg in f for cfg in config_files) for f in unique_files)
        
        if has_readme and has_config:
            # Boost to 0.85 - 0.95 range if both found
            confidence = max(confidence, 0.85 + (iteration * 0.05))
        elif has_readme or has_config:
            # Boost to 0.70 - 0.75 range if either found
            confidence = max(confidence, 0.70)
        
        # Cap confidence
        confidence = min(confidence, 0.98)

    # ── Collect top-3 evidence chunks ────────────────────────────────
    evidence: list[dict] = []
    for chunk in code_chunks[:3]:
        evidence.append({
            "file_path": chunk.get("file_path", ""),
            "start_line": chunk.get("start_line", 0),
            "end_line": chunk.get("end_line", 0),
            "content": _truncate(chunk.get("content", ""), 400),
            "name": chunk.get("name", ""),
            "score": chunk.get("score", 0.0),
        })

    logger.info(
        f"[VERIFY] Intent: {intent}, Confidence: {confidence:.2f} "
        f"(sim={similarity_score:.2f}, kw={keyword_score:.2f}, "
        f"depth={depth_score:.2f}, iter={iteration_score:.2f})"
    )
    return {
        "confidence": confidence,
        "evidence": evidence,
    }


# ─────────────────────────────────────────────────────────────────────
# Node 4 — Decide (pass-through routing anchor)
# ─────────────────────────────────────────────────────────────────────

def decide_node(state: AgentState) -> dict:
    """Pass-through node. Routing logic is in should_continue()."""
    next_step = should_continue(state)
    confidence = state.get("confidence", 0.0)
    logger.info(f"[DECIDE] Confidence {confidence:.2f} — routing to {next_step}")
    print(f"[DECIDE] Confidence {confidence:.2f} — routing to {next_step}")
    return {}


def should_continue(state: AgentState) -> str:
    """Returns 'respond' if confident enough or max iterations hit, else 'analyze'."""
    CONFIDENCE_THRESHOLD = 0.55  # Slightly higher for Pro
    MAX_ITERATIONS = 2

    ctx = state.get("retrieval_context") or {}
    intent = ctx.get("intent", "CODE_LEVEL")
    has_code = bool(ctx.get("code_chunks"))
    has_logs = bool(ctx.get("log_results"))

    # If it's a REPO_LEVEL query, one iteration is usually enough with Gemini Pro
    if intent == "REPO_LEVEL":
        return "respond"

    # If retrieval found nothing, go straight to respond
    if not has_code and not has_logs:
        return "respond"

    if state["confidence"] >= CONFIDENCE_THRESHOLD or state["iteration"] >= MAX_ITERATIONS:
        return "respond"
    return "analyze"


# ─────────────────────────────────────────────────────────────────────
# Node 5 — Respond
# ─────────────────────────────────────────────────────────────────────

def respond_node(state: AgentState) -> dict:
    """Produce the final high-fidelity response using Gemini 1.5 Pro."""
    query = state["query"]
    hypothesis = state.get("hypothesis", "No hypothesis generated")
    evidence = state.get("evidence", [])
    confidence = state.get("confidence", 0.0)
    iteration = state.get("iteration", 0)
    ctx = state.get("retrieval_context") or {}
    intent = ctx.get("intent", "CODE_LEVEL")

    # Build evidence summary
    evidence_lines = []
    for e in evidence:
        fp = e.get("file_path", "unknown")
        name = e.get("name", "")
        sl = e.get("start_line", "?")
        label = f"{fp}" + (f" (at {name})" if name else "")
        evidence_lines.append(f"- {label} [Line {sl}]")
    evidence_summary = "\n".join(evidence_lines)

    # Top code context
    top_content = ""
    if evidence:
        top_content = _truncate(evidence[0].get("content", ""), 2000)

    # REPO_LEVEL uses a specific structure
    if intent == "REPO_LEVEL":
        prompt = (
            "You are a Technical Lead providing a high-level overview of a repository.\n\n"
            f"USER QUESTION: {query}\n"
            "TECHNICAL CONTEXT:\n"
            f"{hypothesis}\n\n"
            "PROJECT SNIPPET:\n"
            f"```\n{top_content}\n```\n\n"
            "TASK:\n"
            "Provide a concise, high-quality repository overview. Use the exact sections below.\n\n"
            "FORMAT YOUR RESPONSE WITH THESE EXACT SECTIONS:\n"
            "1. **PROJECT PURPOSE**\n"
            "2. **CORE FEATURES**\n"
            "3. **TECH STACK**\n"
            "4. **ARCHITECTURE**\n"
            "5. **KEY MODULES**\n"
        )
    else:
        # Prompt Engineering for High Fidelity (CODE/LOG level)
        prompt = (
            "You are a Technical Lead providing a final solution to a developer.\n\n"
            f"USER QUESTION: {query}\n"
            f"QUERY INTENT: {intent}\n\n"
            "TECHNICAL ANALYSIS:\n"
            f"{hypothesis}\n\n"
            "CODE EVIDENCE:\n"
            f"{evidence_summary}\n\n"
            "RELEVANT SNIPPET:\n"
            f"```\n{top_content}\n```\n\n"
            "TASK:\n"
            "Provide a comprehensive yet concise answer. If it's a bug, explain precisely why it's "
            "happening and give a specific fix. If it's a structural question, describe the architecture. "
            "Be extremely technical and helpful.\n\n"
            "FORMAT YOUR RESPONSE WITH SECTIONS:\n"
            "1. **ROOT CAUSE / SUMMARY**\n"
            "2. **TECHNICAL DETAILS**\n"
            "3. **SUGGESTED NEXT STEPS / FIX**\n"
        )

    try:
        final_text = model_manager.generate(prompt, max_new_tokens=1000).strip()
    except Exception as e:
        final_text = f"Failed to generate final response: {e}"

    # Final response object for the frontend
    final_response = {
        "root_cause": final_text,
        "suggested_fix": "See technical details above.",
        "evidence": evidence,
        "confidence": confidence,
        "iterations": iteration,
        "intent": intent,
        "hypothesis_chain": state.get("hypothesis_history", []),
    }

    return {
        "root_cause": final_text,
        "suggested_fix": "See technical details above.",
        "final_response": final_response,
    }
