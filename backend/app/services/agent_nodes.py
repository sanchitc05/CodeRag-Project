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
_MAX_CHUNK_CHARS = 800


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
    """Generate a debugging hypothesis using Gemma 3."""
    query = state["query"]
    ctx = state.get("retrieval_context") or {}
    code_chunks = ctx.get("code_chunks", [])
    history = list(state.get("hypothesis_history", []))

    # Format the top 3 code chunks for the prompt with metadata
    code_block_parts: list[str] = []
    for i, chunk in enumerate(code_chunks[:3], start=1):
        code_block_parts.append(_format_chunk_for_prompt(chunk, i))

    has_code = bool(code_block_parts)
    code_block = "\n\n".join(code_block_parts) if has_code else None

    # Include previous hypotheses so the model can refine them
    history_str = "\n".join(f"- {h}" for h in history[-2:]) if history else None

    if has_code:
        prompt = (
            "You are an expert software engineering assistant. Your goal is to determine if the "
            "developer's question is about a specific bug in this codebase OR if it is a general question.\n\n"
            f"Developer question: {query}\n\n"
            f"Retrieved code chunks from the repository:\n{code_block}\n\n"
            "INSTRUCTIONS:\n"
            "1. If the retrieved code chunks ARE NOT relevant to the question, ignore them and answer the question "
            "directly using your general software knowledge.\n"
            "2. If the question is about a bug/issue and the code SEEMS relevant, generate a concise hypothesis "
            "about the root cause in the codebase.\n"
            "3. If previous hypotheses exist, refine or confirm them based on new evidence.\n\n"
        )
        if history_str:
            prompt += f"Previous hypotheses:\n{history_str}\n\n"
        prompt += (
            "Write a specific hypothesis (or a general answer if the question is generic). "
            "Be direct and technical. Do not repeat the question."
        )
    else:
        # No code retrieved — answer the question directly with general knowledge
        prompt = (
            "You are a helpful software engineering assistant. "
            f"Answer the following question clearly and concisely using your general knowledge:\n\n{query}"
        )

    try:
        hypothesis = model_manager.generate(prompt, max_new_tokens=256)
    except Exception as e:
        logger.error(f"[ANALYZE] Generation failed: {e}")
        hypothesis = f"Analysis failed: {e}"

    hypothesis = hypothesis.strip()

    # Fallback if model returned nothing useful
    if not hypothesis or len(hypothesis) < 10:
        if code_chunks:
            top = code_chunks[0]
            hypothesis = (
                f"The issue may be in '{top.get('name', 'unknown function')}' "
                f"at {top.get('file_path', 'unknown file')} "
                f"(line {top.get('start_line', '?')})."
            )
        else:
            hypothesis = (
                "No relevant code was found for this query. "
                "Ensure the repository has been ingested and try a more specific question."
            )

    history.append(hypothesis)
    new_iteration = state.get("iteration", 0) + 1

    preview = hypothesis[:80] + "..." if len(hypothesis) > 80 else hypothesis
    logger.info(f"[ANALYZE] Iteration {new_iteration} — hypothesis: {preview}")
    print(f"[ANALYZE] Iteration {new_iteration} — hypothesis: {preview}")

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
    unique_files = {c.get("file_path", "") for c in code_chunks if c.get("file_path")}
    depth_score = min(len(unique_files) / 3, 1.0) * 0.2

    # ── 4. Iteration bonus (0.0 – 0.15) ─────────────────────────────
    iteration_score = min(iteration / 3, 1.0) * 0.15

    confidence = round(similarity_score + keyword_score + depth_score + iteration_score, 4)

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
        f"[VERIFY] Confidence: {confidence:.2f} "
        f"(sim={similarity_score:.2f}, kw={keyword_score:.2f}, "
        f"depth={depth_score:.2f}, iter={iteration_score:.2f})"
    )
    print(
        f"[VERIFY] Confidence: {confidence:.2f} "
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
    CONFIDENCE_THRESHOLD = 0.5
    MAX_ITERATIONS = 2

    ctx = state.get("retrieval_context") or {}
    has_code = bool(ctx.get("code_chunks"))
    has_logs = bool(ctx.get("log_results"))

    # If retrieval found nothing, go straight to respond (Gemma handles it gracefully)
    if not has_code and not has_logs:
        return "respond"

    if state["confidence"] >= CONFIDENCE_THRESHOLD or state["iteration"] >= MAX_ITERATIONS:
        return "respond"
    return "analyze"


# ─────────────────────────────────────────────────────────────────────
# Node 5 — Respond
# ─────────────────────────────────────────────────────────────────────

def respond_node(state: AgentState) -> dict:
    """Produce the final structured debugging report using Gemma 3."""
    query = state["query"]
    hypothesis = state.get("hypothesis", "No hypothesis generated")
    evidence = state.get("evidence", [])
    confidence = state.get("confidence", 0.0)
    iteration = state.get("iteration", 0)

    # ── No evidence or very low confidence: answer with general knowledge ──
    # If confidence is < 0.35, we treat it as a general question to avoid hallucinations.
    low_confidence = confidence < 0.35
    if not evidence or low_confidence:
        prompt = (
            "You are a helpful software engineering assistant. "
            "Answer the following question as clearly and helpfully as possible. "
            "If it is a general programming/software concept, explain it well. "
        )
        if low_confidence and evidence:
            prompt += (
                "The system found some code but it has low relevance to your question. "
                "I will answer based on general best practices.\n\n"
            )
        else:
            prompt += (
                "If it seems like a codebase-specific debugging question, note that "
                "no code was retrieved and suggest the user re-ingest their repository.\n\n"
            )
        
        prompt += f"Question: {query}"
        
        try:
            root_cause = model_manager.generate(prompt, max_new_tokens=500).strip()
        except Exception as e:
            root_cause = f"Could not generate answer: {e}"

        final_response: dict[str, Any] = {
            "root_cause": root_cause,
            "suggested_fix": (
                "Review the explanation above for guidance."
                if low_confidence else 
                "If this was a code-specific question: re-ingest the repository."
            ),
            "evidence": evidence if low_confidence else [],
            "confidence": confidence,
            "iterations": iteration,
            "hypothesis_chain": list(state.get("hypothesis_history", [])),
            "retrieval_warning": (
                "Low confidence match — answered from general knowledge."
                if low_confidence else "No code evidence was retrieved."
            ),
        }
        return {
            "root_cause": root_cause,
            "suggested_fix": final_response["suggested_fix"],
            "final_response": final_response,
        }

    # Build evidence summary for prompts
    evidence_lines = []
    for e in evidence:
        fp = e.get("file_path", "unknown")
        name = e.get("name", "")
        sl = e.get("start_line", "?")
        el = e.get("end_line", "?")
        score = e.get("score", 0.0)
        label = fp
        if name:
            label += f"::{name}"
        label += f" (lines {sl}–{el}, relevance={score:.2f})"
        evidence_lines.append(label)
    evidence_summary = "\n".join(f"  - {l}" for l in evidence_lines)

    # Build code context from top evidence chunk
    top_content = _truncate(evidence[0].get("content", ""), 600) if evidence else ""
    top_file = evidence[0].get("file_path", "unknown") if evidence else "unknown"
    top_name = evidence[0].get("name", "") if evidence else ""
    fn_label = f"::{top_name}" if top_name else ""

    # ── Single combined prompt for Gemma 3 ──────────────────────────
    combined_prompt = (
        "You are an expert software debugger. Based on the analysis and code evidence below, "
        "provide a clear debugging report.\n\n"
        f"Developer question: {query}\n\n"
        f"Hypothesis: {hypothesis}\n\n"
        f"Evidence files:\n{evidence_summary}\n\n"
        f"Most relevant code from {top_file}{fn_label}:\n"
        f"```\n{top_content}\n```\n\n"
        "Respond in this exact format:\n\n"
        "ROOT CAUSE:\n"
        "<one clear sentence explaining the root cause>\n\n"
        "SUGGESTED FIX:\n"
        "<specific, actionable fix mentioning file name and what to change>\n\n"
        "Be concise, technical, and grounded in the code evidence above."
    )

    try:
        raw_response = model_manager.generate(combined_prompt, max_new_tokens=500).strip()
    except Exception as e:
        logger.error(f"[RESPOND] Generation failed: {e}")
        raw_response = ""

    # Parse ROOT CAUSE and SUGGESTED FIX sections from response
    root_cause = ""
    suggested_fix = ""

    if "ROOT CAUSE:" in raw_response and "SUGGESTED FIX:" in raw_response:
        try:
            rc_part = raw_response.split("ROOT CAUSE:", 1)[1]
            sf_part = rc_part.split("SUGGESTED FIX:", 1)
            root_cause = sf_part[0].strip()
            suggested_fix = sf_part[1].strip() if len(sf_part) > 1 else ""
        except (IndexError, ValueError):
            pass

    # Fallbacks if parsing failed or model returned something unexpected
    if not root_cause or len(root_cause) < 10:
        root_cause = hypothesis or f"Issue likely originates in {top_file}{fn_label}."
    if not suggested_fix or len(suggested_fix) < 10:
        suggested_fix = f"Review {top_file}{fn_label} and address: {root_cause}"

    # ── Assemble final response ──────────────────────────────────────
    final_response = {
        "root_cause": root_cause,
        "suggested_fix": suggested_fix,
        "evidence": evidence,
        "confidence": confidence,
        "iterations": iteration,
        "hypothesis_chain": list(state.get("hypothesis_history", [])),
    }

    logger.info(
        f"[RESPOND] Final answer generated. "
        f"Confidence: {confidence:.2f}, Iterations: {iteration}"
    )
    print(
        f"[RESPOND] Final answer generated. "
        f"Confidence: {confidence:.2f}, Iterations: {iteration}"
    )

    return {
        "root_cause": root_cause,
        "suggested_fix": suggested_fix,
        "final_response": final_response,
    }
