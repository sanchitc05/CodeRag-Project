"""Node functions for the CodeRAG LangGraph reasoning agent.

Each function takes a full AgentState and returns a *partial* dict
containing only the fields it updates.
"""

import logging
from typing import Any

from app.services.agent_state import AgentState
from app.services.model_loader import model_manager
from app.services.retrieval import retrieve_context

logger = logging.getLogger(__name__)

# ── Stopwords used by the verify node for keyword filtering ──────────
_STOPWORDS: set[str] = {
    "about", "after", "again", "being", "below", "between", "could",
    "does", "doing", "during", "each", "from", "further", "have",
    "having", "here", "itself", "just", "more", "most", "other",
    "over", "same", "should", "some", "such", "than", "that", "their",
    "them", "then", "there", "these", "they", "this", "those",
    "through", "under", "very", "what", "when", "where", "which",
    "while", "will", "with", "would",
}


# ─────────────────────────────────────────────────────────────────────
# Node 1 — Retrieve
# ─────────────────────────────────────────────────────────────────────

def retrieve_node(state: AgentState) -> dict:
    """Call the RAG retrieval pipeline and store the result in state."""
    try:
        context = retrieve_context(state["query"], state["repo_id"])
        # RetrievalContext is a TypedDict — convert to plain dict for safety
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
    """Generate a debugging hypothesis using FLAN-T5."""
    query = state["query"]
    ctx = state.get("retrieval_context") or {}
    code_chunks = ctx.get("code_chunks", [])
    history = list(state.get("hypothesis_history", []))

    # Format the top 3 code chunks for the prompt
    code_block_parts: list[str] = []
    for chunk in code_chunks[:3]:
        file_path = chunk.get("file_path", "unknown")
        start_line = chunk.get("start_line", "?")
        content = chunk.get("content", "")
        code_block_parts.append(
            f"File: {file_path} (line {start_line})\n{content}"
        )
    code_block = "\n\n".join(code_block_parts) if code_block_parts else "(no code retrieved)"

    history_str = " | ".join(history) if history else "(none)"

    prompt = (
        "You are a debugging assistant. Analyze the following code and "
        "generate a hypothesis about the root cause of this issue.\n\n"
        f"User question: {query}\n\n"
        f"Relevant code:\n{code_block}\n\n"
        f"Previous hypotheses (if any): {history_str}\n\n"
        "Generate a specific, one-paragraph hypothesis about what is "
        "causing this issue.\nHypothesis:"
    )

    try:
        hypothesis = model_manager.generate(prompt, max_new_tokens=120)
    except Exception as e:
        logger.error(f"[ANALYZE] Generation failed: {e}")
        hypothesis = f"Analysis failed: {e}"

    # Clean up echoed prefix
    hypothesis = hypothesis.strip()
    if hypothesis.lower().startswith("hypothesis:"):
        hypothesis = hypothesis[len("hypothesis:"):].strip()

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

    # ── 1. Keyword overlap score (0.0 – 0.4) ────────────────────────
    hyp_words = {
        w.lower()
        for w in hypothesis.split()
        if len(w) > 4 and w.lower() not in _STOPWORDS
    }
    total_keywords = len(hyp_words)

    all_content = " ".join(c.get("content", "") for c in code_chunks).lower()
    matches = sum(1 for w in hyp_words if w in all_content)
    keyword_score = min(matches / max(total_keywords, 1), 1.0) * 0.4

    # ── 2. Evidence depth score (0.0 – 0.3) ──────────────────────────
    unique_files = {c.get("file_path", "") for c in code_chunks if c.get("file_path")}
    depth_score = min(len(unique_files) / 3, 1.0) * 0.3

    # ── 3. Iteration bonus (0.0 – 0.3) ──────────────────────────────
    iteration_score = min(iteration / 3, 1.0) * 0.3

    confidence = round(keyword_score + depth_score + iteration_score, 4)

    # ── Collect top-3 evidence chunks ────────────────────────────────
    evidence: list[dict] = []
    for chunk in code_chunks[:3]:
        evidence.append({
            "file_path": chunk.get("file_path", ""),
            "start_line": chunk.get("start_line", 0),
            "end_line": chunk.get("end_line", 0),
            "content": chunk.get("content", ""),
            "name": chunk.get("name", ""),
        })

    logger.info(f"[VERIFY] Confidence score: {confidence:.2f}")
    print(f"[VERIFY] Confidence score: {confidence:.2f}")

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

    # If retrieval found nothing, avoid extra expensive analyze loops.
    if not has_code and not has_logs:
        return "respond"

    if state["confidence"] >= CONFIDENCE_THRESHOLD or state["iteration"] >= MAX_ITERATIONS:
        return "respond"
    return "analyze"


# ─────────────────────────────────────────────────────────────────────
# Node 5 — Respond
# ─────────────────────────────────────────────────────────────────────

def respond_node(state: AgentState) -> dict:
    """Produce the final structured debugging report."""
    query = state["query"]
    hypothesis = state.get("hypothesis", "No hypothesis generated")
    evidence = state.get("evidence", [])
    confidence = state.get("confidence", 0.0)
    iteration = state.get("iteration", 0)

    if not evidence:
        root_cause = (
            "No repository evidence was retrieved for this query, so a reliable diagnosis cannot be produced yet."
        )
        suggested_fix = (
            "Re-ingest the repository, confirm ChromaDB/Elasticsearch are reachable, "
            "and retry with a specific code-level question that includes an error message or file name."
        )
        final_response: dict[str, Any] = {
            "root_cause": root_cause,
            "suggested_fix": suggested_fix,
            "evidence": [],
            "confidence": confidence,
            "iterations": iteration,
            "hypothesis_chain": list(state.get("hypothesis_history", [])),
        }
        return {
            "root_cause": root_cause,
            "suggested_fix": suggested_fix,
            "final_response": final_response,
        }

    evidence_files = ", ".join(e.get("file_path", "unknown") for e in evidence) or "none"

    # ── Prompt 1: Root Cause ─────────────────────────────────────────
    root_cause_prompt = (
        "Based on this debugging analysis, state the root cause "
        "clearly and concisely.\n\n"
        f"Question: {query}\n"
        f"Hypothesis: {hypothesis}\n"
        f"Evidence files: {evidence_files}\n\n"
        "Root cause (one clear sentence):"
    )

    try:
        root_cause = model_manager.generate(root_cause_prompt, max_new_tokens=90).strip()
    except Exception as e:
        logger.error(f"[RESPOND] Root-cause generation failed: {e}")
        root_cause = f"Could not determine root cause: {e}"

    # Clean echoed prefix
    if root_cause.lower().startswith("root cause"):
        root_cause = root_cause.split(":", 1)[-1].strip()

    # ── Prompt 2: Suggested Fix ───────────────────────────────────────
    top_file = evidence[0].get("file_path", "unknown") if evidence else "unknown"
    top_content = evidence[0].get("content", "") if evidence else ""

    fix_prompt = (
        "Given this root cause, suggest a specific fix.\n\n"
        f"Root cause: {root_cause}\n"
        f"Relevant code from {top_file}:\n{top_content}\n\n"
        "Suggested fix (be specific, mention file and line if possible):"
    )

    try:
        suggested_fix = model_manager.generate(fix_prompt, max_new_tokens=120).strip()
    except Exception as e:
        logger.error(f"[RESPOND] Fix generation failed: {e}")
        suggested_fix = f"Could not generate fix: {e}"

    # Clean echoed prefix
    if suggested_fix.lower().startswith("suggested fix"):
        suggested_fix = suggested_fix.split(":", 1)[-1].strip()

    # ── Assemble final response ──────────────────────────────────────
    final_response: dict[str, Any] = {
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
