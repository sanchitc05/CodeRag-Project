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
}


def _first_non_empty_line(content: str) -> int:
    for idx, line in enumerate(content.splitlines(), start=1):
        if line.strip():
            return idx
    return 1


def _build_fallback_chunk(relative_path: str, content: str, score: int) -> dict:
    start_line = _first_non_empty_line(content)
    end_line = min(start_line + 79, len(content.splitlines()) or start_line)
    return {
        "content": content,
        "file_path": relative_path,
        "name": os.path.basename(relative_path),
        "start_line": start_line,
        "end_line": end_line,
        "distance": float(max(0, 100 - score)) / 100.0,
    }


def _fallback_overview_chunks(repo_path: str, top_k: int) -> list[dict]:
    preferred_names = {
        "readme.md",
        "requirements.txt",
        "package.json",
        "docker-compose.yml",
        "main.py",
        "app.py",
        "index.ts",
        "index.js",
    }
    chunks: list[dict] = []

    for root, dirs, files in os.walk(repo_path):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
        for filename in files:
            ext = os.path.splitext(filename)[1].lower()
            lower_name = filename.lower()
            if lower_name not in preferred_names and ext not in SUPPORTED_EXTENSIONS:
                continue

            file_path = os.path.join(root, filename)
            relative_path = os.path.relpath(file_path, repo_path)
            try:
                with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                    content = "\n".join(f.read().splitlines()[:120])
            except (OSError, IOError):
                continue

            if not content.strip():
                continue
            chunks.append(_build_fallback_chunk(relative_path, content, score=1))
            if len(chunks) >= top_k:
                return chunks
    return chunks


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
    max_files = 120

    for root, dirs, files in os.walk(repo_path):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
        for filename in files:
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
        return _fallback_overview_chunks(repo_path, top_k)

    scored.sort(key=lambda x: x[0], reverse=True)
    return [item for _, item in scored[:top_k]]


class RetrievalContext(TypedDict):
    """Combined retrieval result from all search backends."""

    query: str
    repo_id: str
    code_chunks: list[dict]  # from ChromaDB
    log_results: list[dict]  # from Elasticsearch
    total_retrieved: int


def retrieve_context(
    query: str, repo_id: str, top_k: int = 5
) -> RetrievalContext:
    """Retrieve relevant code chunks and log lines for a debugging query."""
    # Embed the query for vector search using code embeddings to match dimensionality
    try:
        query_embedding = model_manager.embed_code(query)
    except Exception as e:
        logger.error(f"Query embedding failed: {e}")
        query_embedding = None

    # Vector search in ChromaDB
    code_chunks: list[dict] = []
    if query_embedding is not None:
        try:
            code_chunks = query_chromadb(query_embedding, repo_id, top_k)
        except Exception as e:
            logger.warning(f"ChromaDB query failed: {e}")
            print(f"[RETRIEVE] ChromaDB exception: {e}")

    # BM25 keyword search in Elasticsearch
    log_results: list[dict] = []
    try:
        log_results = search_logs(query, repo_id, top_k)
    except Exception as e:
        logger.warning(f"Elasticsearch search failed: {e}")
        print(f"[RETRIEVE] Elasticsearch exception: {e}")

    if not code_chunks:
        try:
            print(f"[RETRIEVE] No vector results. Triggering fallback search for {repo_id}…")
            code_chunks = _fallback_repo_search(query, repo_id, top_k)
            if code_chunks:
                logger.info(
                    "Fallback repository retrieval returned %s chunk(s) for %s",
                    len(code_chunks),
                    repo_id,
                )
                print(f"[RETRIEVE] Fallback found {len(code_chunks)} chunks.")
        except Exception as e:
            logger.warning(f"Fallback repo search failed: {e}")
            print(f"[RETRIEVE] Fallback search exception: {e}")

    retrieval_msg = f"[RETRIEVE] Final: {len(code_chunks)} code chunks, {len(log_results)} logs retrieved."
    logger.info(retrieval_msg)
    print(retrieval_msg)

    return RetrievalContext(
        query=query,
        repo_id=repo_id,
        code_chunks=code_chunks,
        log_results=log_results,
        total_retrieved=len(code_chunks) + len(log_results),
    )
