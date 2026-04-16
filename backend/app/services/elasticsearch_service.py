"""Indexes logs into Elasticsearch and provides BM25 keyword search."""

import logging
import os

from elasticsearch import Elasticsearch
from elasticsearch.helpers import bulk

from app.config import settings

logger = logging.getLogger(__name__)

INDEX_NAME: str = "coderag_logs"

# File extensions treated as log files
LOG_EXTENSIONS: set[str] = {".log", ".txt", ".out"}


def _get_es_client() -> Elasticsearch:
    """Create an Elasticsearch client."""
    return Elasticsearch(settings.resolved_elasticsearch_url)


def ensure_index_exists() -> None:
    """Create the log index with proper mappings if it doesn't exist."""
    es = _get_es_client()
    if es.indices.exists(index=INDEX_NAME):
        return

    mappings = {
        "mappings": {
            "properties": {
                "repo_id": {"type": "keyword"},
                "file_path": {"type": "keyword"},
                "content": {
                    "type": "text",
                    "analyzer": "english",
                },
                "log_level": {"type": "keyword"},
                "timestamp": {"type": "date", "ignore_malformed": True},
            }
        }
    }
    es.indices.create(index=INDEX_NAME, body=mappings)
    logger.info(f"Created Elasticsearch index '{INDEX_NAME}'.")


def _detect_log_level(line: str) -> str:
    """Heuristically detect the log level from a log line."""
    upper = line.upper()
    for level in ("ERROR", "WARN", "WARNING", "INFO", "DEBUG", "CRITICAL", "FATAL"):
        if level in upper:
            return level
    return "UNKNOWN"


def index_logs_from_repo(repo_path: str, repo_id: str) -> int:
    """Walk a repo for log files and bulk-index their lines into Elasticsearch."""
    ensure_index_exists()
    es = _get_es_client()
    actions: list[dict] = []

    for root, dirs, files in os.walk(repo_path):
        for filename in files:
            ext = os.path.splitext(filename)[1].lower()
            if ext not in LOG_EXTENSIONS:
                continue

            file_path = os.path.relpath(os.path.join(root, filename), repo_path)

            try:
                with open(
                    os.path.join(root, filename), "r", encoding="utf-8", errors="ignore"
                ) as f:
                    for line in f:
                        line = line.strip()
                        if len(line) <= 20:
                            continue
                        actions.append(
                            {
                                "_index": INDEX_NAME,
                                "_source": {
                                    "repo_id": repo_id,
                                    "file_path": file_path,
                                    "content": line,
                                    "log_level": _detect_log_level(line),
                                },
                            }
                        )
            except (OSError, IOError) as e:
                logger.warning(f"Skipping unreadable log file {file_path}: {e}")

    if not actions:
        logger.info(f"No log lines found for repo {repo_id}.")
        return 0

    # Bulk-index in chunks of 500
    success_count, errors = bulk(es, actions, chunk_size=500, raise_on_error=False)
    if errors:
        logger.warning(f"Elasticsearch bulk indexing had {len(errors)} errors.")
    
    msg = f"[LOGS] Indexed {success_count} log lines for repo {repo_id}."
    logger.info(msg)
    print(msg)
    return success_count


def search_logs(query: str, repo_id: str, top_k: int = 5) -> list[dict]:
    """Run a BM25 multi_match query on logs filtered by repo_id."""
    es = _get_es_client()

    # Gracefully handle missing index
    try:
        if not es.indices.exists(index=INDEX_NAME):
            return []
    except Exception:
        return []

    body = {
        "size": top_k,
        "query": {
            "bool": {
                "must": [
                    {"multi_match": {"query": query, "fields": ["content"]}},
                ],
                "filter": [
                    {"term": {"repo_id": repo_id}},
                ],
            }
        },
    }

    try:
        response = es.search(index=INDEX_NAME, body=body)
    except Exception as e:
        logger.warning(f"Elasticsearch search failed: {e}")
        print(f"[RETRIEVE] Elasticsearch search failed for repo {repo_id}: {e}")
        return []

    results: list[dict] = []
    hits = response.get("hits", {}).get("hits", [])
    if not hits:
        print(f"[RETRIEVE] Elasticsearch returned 0 log results for repo {repo_id}.")
        return []

    print(f"[RETRIEVE] Elasticsearch returned {len(hits)} log lines for repo {repo_id}.")
    for hit in hits:
        source = hit.get("_source", {})
        results.append(
            {
                "content": source.get("content", ""),
                "file_path": source.get("file_path", ""),
                "log_level": source.get("log_level", ""),
                "score": hit.get("_score", 0.0),
            }
        )

    return results
