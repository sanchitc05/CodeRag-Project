"""Unified retrieval combining ChromaDB vector search and Elasticsearch BM25."""

import logging
import os
import re
from typing import TypedDict

from app.config import settings
from app.services.embeddings import query_chromadb
from app.services.elasticsearch_service import search_logs
from app.services.model_loader import model_manager
from app.utils.chunker import SUPPORTED_EXTENSIONS

logger = logging.getLogger(__name__)

SKIP_DIRS: set[str] = {
    ".git",
    "node_modules",
    "__pycache__",
    "venv",
    ".venv",
    "dist",
    "build",
    "target",
    "out",
    ".next",
    ".aws",
}

JUNK_EXTENSIONS: set[str] = {
    ".gsd", ".tmp", ".log", ".zip", ".tar", ".gz", ".rar", ".7z",
    ".pdf", ".docx", ".png", ".jpg", ".jpeg", ".gif", ".ico", ".svg",
    ".bin", ".exe", ".dll", ".so", ".pyc", ".ipynb",
}

JUNK_PATTERNS: list[str] = [
    r"\.gsd$",
    r"\.tmp$",
    r"package-lock\.json",
    r"yarn\.lock",
    r"pnpm-lock\.yaml",
    r"docs/.*",
    r"test_results/.*",
    r".*\.log$",
]


def _is_junk_file(file_path: str) -> bool:
    """Check if a file should be completely excluded from retrieval."""
    filename = os.path.basename(file_path).lower()
    ext = os.path.splitext(filename)[1]
    
    if ext in JUNK_EXTENSIONS:
        return True
    
    path_lower = file_path.lower()
    for pattern in JUNK_PATTERNS:
        if re.search(pattern, path_lower):
            return True
            
    return False


def _first_non_empty_line(content: str) -> int:
    for idx, line in enumerate(content.splitlines(), start=1):
        if line.strip():
            return idx
    return 1


def _build_fallback_chunk(relative_path: str, content: str, score: int) -> dict:
    start_line = _first_non_empty_line(content)
    lines = content.splitlines()
    end_line = min(start_line + 79, len(lines) if lines else start_line)
    return {
        "content": content,
        "file_path": relative_path,
        "name": os.path.basename(relative_path),
        "start_line": start_line,
        "end_line": end_line,
        "distance": float(max(0, 100 - score)) / 100.0,
    }


def _fallback_overview_chunks(repo_path: str, top_k: int) -> list[dict]:
    """
    Tiered priority: README.md > package/config files > entry points > repo_summary > folders
    """
    # Priority tiers (lower index = higher priority)
    tiers: list[list[str]] = [
        ["readme.md"], # Tier 0
        ["package.json", "requirements.txt", "docker-compose.yml", "go.mod", "pom.xml", "makefile", "setup.py"], # Tier 1
        ["main.py", "app.py", "index.ts", "server.js", "app.tsx"], # Tier 2
    ]
    
    found_chunks: list[list[dict]] = [[] for _ in range(len(tiers) + 2)] # +1 for repo_summary, +1 for others
    
    for root, dirs, files in os.walk(repo_path):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
        for filename in files:
            if _is_junk_file(filename):
                continue
                
            file_path = os.path.join(root, filename)
            relative_path = os.path.relpath(file_path, repo_path)
            lower_name = filename.lower()
            
            # Determine Tier
            tier_idx = len(tiers) + 1 # default to 'others'
            for i, tier_names in enumerate(tiers):
                if lower_name in tier_names:
                    tier_idx = i
                    break
            
            # Special case for repo_summary
            if "repo_summary" in lower_name:
                tier_idx = len(tiers)
                
            # If not in tiers and not a supported code extension, skip
            ext = os.path.splitext(filename)[1].lower()
            if tier_idx > len(tiers) and ext not in SUPPORTED_EXTENSIONS:
                continue

            try:
                # For overview, we just want the beginning of the file
                with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                    content = "\n".join(f.read().splitlines()[:150]) # slightly more context
            except (OSError, IOError):
                continue

            if not content.strip():
                continue
                
            chunk = _build_fallback_chunk(relative_path, content, score=100 - (tier_idx * 10))
            found_chunks[tier_idx].append(chunk)

    # Flatten and return up to top_k
    flat_results = []
    for tier in found_chunks:
        tier.sort(key=lambda x: x["file_path"].count(os.sep)) # prefer shallower files within a tier
        flat_results.extend(tier)
        if len(flat_results) >= top_k:
            break
            
    return flat_results[:top_k]


def _fallback_repo_search(query: str, repo_id: str, top_k: int) -> list[dict]:
    repo_path = os.path.join(settings.resolved_repos_dir, repo_id)
    if not os.path.isdir(repo_path):
        return []

    terms = {
        t
        for t in re.findall(r"[a-zA-Z_][a-zA-Z0-9_]+", query.lower())
        if len(t) > 2
    }
    scored: list[tuple[int, dict]] = []
    files_scanned = 0
    max_files = 150

    for root, dirs, files in os.walk(repo_path):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
        for filename in files:
            if _is_junk_file(filename):
                continue
                
            ext = os.path.splitext(filename)[1].lower()
            if ext not in SUPPORTED_EXTENSIONS:
                continue

            files_scanned += 1
            if files_scanned > max_files:
                break

            file_path = os.path.join(root, filename)
            relative_path = os.path.relpath(file_path, repo_path)
            try:
                with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                    content = f.read()
            except (OSError, IOError):
                continue

            if not content.strip():
                continue

            lowered = content.lower()
            score = sum(1 for term in terms if term in lowered)
            if score <= 0:
                continue

            excerpt = "\n".join(content.splitlines()[:120])
            scored.append((score, _build_fallback_chunk(relative_path, excerpt, score)))

        if files_scanned > max_files:
            break

    if not scored:
        return []

    scored.sort(key=lambda x: x[0], reverse=True)
    return [item for _, item in scored[:top_k]]


class RetrievalContext(TypedDict):
    """Combined retrieval result from all search backends."""

    query: str
    repo_id: str
    intent: str  # REPO_LEVEL, CODE_LEVEL, LOG_LEVEL
    code_chunks: list[dict]  # from ChromaDB
    log_results: list[dict]  # from Elasticsearch
    total_retrieved: int


def detect_query_intent(query: str) -> str:
    """Identify if the user is asking about the repo as a whole or specific code/logs."""
    q = query.lower()

    # Log-level indicators
    if any(k in q for k in ["error", "exception", "log", "failed", "crash", "stacktrace", "traceback"]):
        return "LOG_LEVEL"

    # Repo-level indicators (broad architectural/overview questions)
    repo_keywords = [
        "what does", "how to use", "project structure", "architecture",
        "folder", "overview", "readme", "summary", "everything",
        "how is it", "tell me about", "what is this", "purpose",
        "main functionality", "tech stack", "explain project",
        "getting started", "setup", "how do i start", "how works"
    ]
    if any(k in q for k in repo_keywords) or len(q.split()) < 4:
        return "REPO_LEVEL"

    return "CODE_LEVEL"


def retrieve_context(
    query: str, repo_id: str, top_k: int = 5
) -> RetrievalContext:
    """Retrieve relevant code chunks and log lines for a debugging query."""
    intent = detect_query_intent(query)
    logger.info(f"Query intent detected: {intent}")

    # Vector search in ChromaDB
    code_chunks: list[dict] = []
    if intent != "LOG_LEVEL":
        try:
            query_embedding = model_manager.embed_query(query)
            if query_embedding is not None:
                raw_chunks = query_chromadb(query_embedding, repo_id, top_k * 2)
                # Filter out junk from vector search too
                code_chunks = [c for c in raw_chunks if not _is_junk_file(c["file_path"])]
        except Exception as e:
            logger.warning(f"ChromaDB query failed: {e}")

    # If it's a REPO_LEVEL query, augment with top-level repository overview files
    if intent == "REPO_LEVEL":
        repo_path = os.path.join(settings.resolved_repos_dir, repo_id)
        if os.path.isdir(repo_path):
            overview = _fallback_overview_chunks(repo_path, top_k=top_k)
            # Mix them in: keep unique files, prioritize overview
            existing_paths = {c["file_path"] for c in code_chunks}
            for ov_chunk in overview:
                if ov_chunk["file_path"] not in existing_paths:
                    code_chunks.insert(0, ov_chunk)

    # BM25 keyword search in Elasticsearch
    log_results: list[dict] = []
    if intent != "CODE_LEVEL":
        try:
            log_results = search_logs(query, repo_id, top_k)
        except Exception as e:
            logger.warning(f"Elasticsearch search failed: {e}")

    # Final fallback if absolutely nothing found
    if not code_chunks and intent != "LOG_LEVEL":
        try:
            code_chunks = _fallback_repo_search(query, repo_id, top_k)
        except Exception as e:
            logger.warning(f"Fallback repo search failed: {e}")

    return RetrievalContext(
        query=query,
        repo_id=repo_id,
        intent=intent,
        code_chunks=code_chunks[: top_k * 2],
        log_results=log_results,
        total_retrieved=len(code_chunks) + len(log_results),
    )
