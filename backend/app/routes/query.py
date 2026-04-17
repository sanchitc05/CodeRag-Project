"""Query and ingestion routes including streaming responses."""

import asyncio
import json
import logging
import os
from concurrent.futures import ThreadPoolExecutor
from typing import Mapping

from fastapi import APIRouter, BackgroundTasks, Depends
from fastapi.responses import StreamingResponse

from app.config import settings
from app.database import SessionLocal
from app.models.query_history import QueryHistory
from app.models.user import User
from app.schemas.query_schemas import IngestRequest, QueryRequest
from app.services.agent_state import initial_state
from app.services.agent_graph import agent as langgraph_agent
from app.services.auth_service import get_current_user
from app.services.elasticsearch_service import index_logs_from_repo
from app.services.embeddings import embed_and_store_chunks, get_or_create_collection
from app.services.ingestion import ingest_repository

router = APIRouter(tags=["query"])
logger = logging.getLogger(__name__)

# Thread pool for running sync LangGraph operations off the async event loop
_executor = ThreadPoolExecutor(max_workers=4)

# In-memory ingestion status tracker {repo_id: status_dict}
_ingestion_status: dict[str, dict] = {}


def run_ingestion_pipeline(github_url: str, repo_id: str) -> None:
    """Execute full ingestion pipeline so the repo is query-ready."""
    _ingestion_status[repo_id] = {"status": "running", "chunks": 0, "logs": 0}
    try:
        result = ingest_repository(github_url, repo_id)
        repo_path = result.get("repo_path", "")
        chunks = result.get("chunks", [])

        stored_chunks_count = embed_and_store_chunks(chunks, repo_id)
        indexed_logs_count = index_logs_from_repo(repo_path, repo_id)

        _ingestion_status[repo_id] = {
            "status": "complete",
            "chunks": stored_chunks_count,
            "logs": indexed_logs_count,
        }

        msg = (
            f"Ingestion pipeline completed for {repo_id}: "
            f"path={repo_path} extracted={len(chunks)} stored={stored_chunks_count} logs={indexed_logs_count}"
        )
        logger.info(msg)
        print(f"[PIPELINE] {msg}")
    except Exception as e:
        _ingestion_status[repo_id] = {"status": "failed", "error": str(e), "chunks": 0, "logs": 0}
        logger.error(f"[PIPELINE] Ingestion failed for {repo_id}: {e}")
        raise


@router.post("/ingest", status_code=202)
def start_ingestion(
    request: IngestRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
):
    """Trigger background clone and ingestion of a remote GitHub repository."""
    background_tasks.add_task(run_ingestion_pipeline, request.github_url, request.repo_id)
    _ingestion_status[request.repo_id] = {"status": "queued", "chunks": 0, "logs": 0}
    return {
        "repo_id": request.repo_id,
        "status": "accepted",
        "message": f"Ingestion pipeline started for {request.repo_id} in the background.",
    }


@router.get("/ingest/{repo_id}/status")
def get_ingestion_status(
    repo_id: str,
    current_user: User = Depends(get_current_user),
):
    """Poll ingestion progress for a repository.

    Returns status: queued | running | complete | failed
    Also checks ChromaDB to report actual stored chunk count.
    """
    # Check in-memory tracker first
    mem_status = _ingestion_status.get(repo_id, {})

    # Also verify ChromaDB for persisted state
    chroma_count = 0
    try:
        collection = get_or_create_collection(repo_id)
        chroma_count = collection.count()
    except Exception:
        pass

    # Check disk
    repos_dir = settings.resolved_repos_dir
    on_disk = os.path.isdir(os.path.join(repos_dir, repo_id))

    if not mem_status and not on_disk and chroma_count == 0:
        return {
            "repo_id": repo_id,
            "status": "not_found",
            "message": "Repository has not been ingested.",
            "chunks_in_chromadb": 0,
            "on_disk": False,
        }

    # If ChromaDB has data but no memory tracker, ingestion was done in a prior session
    if chroma_count > 0 and not mem_status:
        return {
            "repo_id": repo_id,
            "status": "complete",
            "chunks_in_chromadb": chroma_count,
            "on_disk": on_disk,
            "message": f"Repository is ready. {chroma_count} chunks in ChromaDB.",
        }

    return {
        "repo_id": repo_id,
        **mem_status,
        "chunks_in_chromadb": chroma_count,
        "on_disk": on_disk,
    }


@router.get("/repos")
def list_ingested_repos(current_user: User = Depends(get_current_user)):
    """List repositories that are actually available on disk for querying."""
    repos_dir = settings.resolved_repos_dir
    if not os.path.isdir(repos_dir):
        return {"repos": []}

    repos = []
    for entry in os.scandir(repos_dir):
        if entry.is_dir():
            # Only count as ingested if there are files besides .git
            contents = [d.name for d in os.scandir(entry.path) if d.name != ".git"]
            if contents:
                repos.append(entry.name)

    repos.sort()
    return {"repos": repos}


def _run_agent_sync(query: str, repo_id: str) -> dict:
    """Run the LangGraph agent synchronously — safe to call from a thread."""
    from app.services.agent_graph import run_agent
    return run_agent(query, repo_id)


def _run_agent_nodes_with_steps(query: str, repo_id: str) -> list[dict]:
    """Run agent nodes one by one and collect step events + final result.

    LangGraph's sync `stream()` is used here since we run this in a thread
    executor to avoid blocking the async event loop.
    """
    from app.services.agent_state import initial_state as mk_state

    state = mk_state(query, repo_id)
    steps = []
    final_result = None

    try:
        # Use sync stream — runs in thread pool, not on the event loop
        for output in langgraph_agent.stream(state, stream_mode="updates"):
            for node_name, node_state in output.items():
                if not isinstance(node_state, Mapping):
                    continue

                event: dict = {"node": node_name}

                if node_name == "retrieve":
                    ctx = node_state.get("retrieval_context") or {}
                    event = {
                        "status": "retrieved",
                        "chunks": len(ctx.get("code_chunks", [])),
                        "logs": len(ctx.get("log_results", [])),
                    }
                elif node_name == "analyze":
                    event = {
                        "status": "analyzing",
                        "iteration": node_state.get("iteration", 0),
                    }
                elif node_name == "verify":
                    event = {
                        "status": "verifying",
                        "confidence": node_state.get("confidence", 0.0),
                    }
                elif node_name == "decide":
                    event = {"status": "deciding"}
                elif node_name == "respond":
                    final_result = node_state.get("final_response")
                    event = {"status": "responding"}

                if "error" in node_state and node_state["error"]:
                    event = {"status": "error", "message": node_state["error"]}
                    steps.append(event)
                    return steps

                steps.append(event)
    except Exception as e:
        steps.append({"status": "error", "message": str(e)})
        return steps

    if final_result is not None:
        steps.append({"status": "complete", "result": final_result})
    else:
        steps.append({"status": "error", "message": "Agent completed without a final response"})

    return steps


async def stream_agent_steps(query: str, repo_id: str, user_id: int):
    """Generator that yields SSE events from the LangGraph agent."""
    # Immediately signal start
    yield f"data: {json.dumps({'status': 'retrieving'})}\n\n"

    loop = asyncio.get_event_loop()

    try:
        # Run the blocking LangGraph call in a thread to avoid blocking the event loop
        steps = await loop.run_in_executor(
            _executor,
            _run_agent_nodes_with_steps,
            query,
            repo_id,
        )
    except Exception as e:
        yield f"data: {json.dumps({'status': 'error', 'message': str(e)})}\n\n"
        return

    final_result = None
    for event in steps:
        yield f"data: {json.dumps(event)}\n\n"
        if event.get("status") == "complete":
            final_result = event.get("result")
        elif event.get("status") == "error":
            return

    # Save to history if we got a result
    if final_result is not None:
        db = SessionLocal()
        try:
            history_entry = QueryHistory(
                user_id=user_id,
                repo_id=repo_id,
                query=query,
                response=json.dumps(final_result)
            )
            db.add(history_entry)
            db.commit()
        except Exception as he:
            logger.error(f"Failed to save query history: {he}")
        finally:
            db.close()


@router.post("/query")
async def run_query(
    request: QueryRequest,
    current_user: User = Depends(get_current_user),
):
    """Run an agentic debugging query. Returns an SSE stream of thought process."""
    return StreamingResponse(
        stream_agent_steps(request.query, request.repo_id, current_user.id),
        media_type="text/event-stream"
    )
