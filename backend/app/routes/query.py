"""Query and ingestion routes including streaming responses."""

import json
import logging
import os
from typing import Mapping

from fastapi import APIRouter, BackgroundTasks, Depends
from fastapi.responses import StreamingResponse

from app.config import settings
from app.models.user import User
from app.schemas.query_schemas import IngestRequest, QueryRequest
from app.services.agent_state import initial_state
from app.services.agent_graph import agent as langgraph_agent
from app.services.auth_service import get_current_user
from app.services.elasticsearch_service import index_logs_from_repo
from app.services.embeddings import embed_and_store_chunks
from app.services.ingestion import ingest_repository

router = APIRouter(tags=["query"])
logger = logging.getLogger(__name__)


def run_ingestion_pipeline(github_url: str, repo_id: str) -> None:
    """Execute full ingestion pipeline so the repo is query-ready."""
    result = ingest_repository(github_url, repo_id)
    chunks = result.get("chunks", [])
    stored_chunks = embed_and_store_chunks(chunks, repo_id)

    repo_path = os.path.join(settings.resolved_repos_dir, repo_id)
    indexed_logs = index_logs_from_repo(repo_path, repo_id)

    logger.info(
        "Ingestion pipeline completed for %s: extracted=%s stored=%s indexed_logs=%s",
        repo_id,
        result.get("total_chunks", 0),
        stored_chunks,
        indexed_logs,
    )


@router.post("/ingest", status_code=202)
def start_ingestion(
    request: IngestRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
):
    """Trigger background clone and ingestion of a remote GitHub repository."""
    background_tasks.add_task(run_ingestion_pipeline, request.github_url, request.repo_id)
    return {
        "repo_id": request.repo_id,
        "status": "accepted",
        "message": f"Ingestion pipeline started for {request.repo_id} in the background.",
    }


@router.get("/repos")
def list_ingested_repos(current_user: User = Depends(get_current_user)):
    """List repositories that are actually available on disk for querying."""
    repos_dir = settings.resolved_repos_dir
    if not os.path.isdir(repos_dir):
        return {"repos": []}

    repos = [
        entry.name
        for entry in os.scandir(repos_dir)
        if entry.is_dir()
    ]
    repos.sort()
    return {"repos": repos}


async def stream_agent_steps(query: str, repo_id: str):
    """Generator to yield events from the LangGraph agent step-by-step."""
    state = initial_state(query, repo_id)
    final_result = None
    try:
        # Initial event so UI can show immediate progress.
        yield f"data: {json.dumps({'status': 'retrieving'})}\n\n"

        # updates mode yields {node_name: partial_state_update}
        async for output in langgraph_agent.astream(state, stream_mode="updates"):
            for node_name, node_state in output.items():
                if not isinstance(node_state, Mapping):
                    continue

                event_data = {"node": node_name}

                if node_name == "retrieve":
                    ctx = node_state.get("retrieval_context") or {}
                    chunks = len(ctx.get("code_chunks", []))
                    logs = len(ctx.get("log_results", []))
                    event_data = {
                        "status": "retrieved",
                        "chunks": chunks,
                        "logs": logs,
                    }

                elif node_name == "analyze":
                    event_data = {
                        "status": "analyzing",
                        "iteration": node_state.get("iteration", 0),
                    }

                elif node_name == "respond":
                    final_result = node_state.get("final_response")

                # We don't want to dump the entire state, only relevant chunks
                if "error" in node_state and node_state["error"]:
                    event_data = {
                        "status": "error",
                        "message": node_state["error"],
                    }
                    yield f"data: {json.dumps(event_data)}\n\n"
                    return
                
                # Yield an SSE-formatted string
                yield f"data: {json.dumps(event_data)}\n\n"

        if final_result is not None:
            yield f"data: {json.dumps({'status': 'complete', 'result': final_result})}\n\n"
        else:
            yield f"data: {json.dumps({'status': 'error', 'message': 'Agent completed without a final response'})}\n\n"
    except Exception as e:
        yield f"data: {json.dumps({'status': 'error', 'message': str(e)})}\n\n"


@router.post("/query")
async def run_query(
    request: QueryRequest,
    current_user: User = Depends(get_current_user),
):
    """Run an agentic debugging query. Returns an SSE stream of thought process."""
    return StreamingResponse(
        stream_agent_steps(request.query, request.repo_id),
        media_type="text/event-stream"
    )
