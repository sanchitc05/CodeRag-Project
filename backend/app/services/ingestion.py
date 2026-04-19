"""Clones GitHub repositories and extracts code chunks for indexing."""

import logging
import os

import git
import shutil

from app.config import settings
from app.utils.chunker import CodeChunk, chunk_file, SUPPORTED_EXTENSIONS

logger = logging.getLogger(__name__)

REPOS_DIR: str = settings.resolved_repos_dir

# Directories to skip during file tree traversal
SKIP_DIRS: set[str] = {
    ".git",
    "node_modules",
    "__pycache__",
    "venv",
    ".venv",
    "dist",
    "build",
}


def clone_repository(github_url: str, repo_id: str) -> str:
    """Clone a GitHub repository (or pull latest if it already exists)."""
    if not github_url.startswith("https://github.com/"):
        raise ValueError(
            f"Invalid GitHub URL: {github_url}. Must start with https://github.com/"
        )

    repo_path = os.path.join(REPOS_DIR, repo_id)

    try:
        if os.path.isdir(repo_path):
            logger.info(f"Repository {repo_id} exists, pulling latest…")
            repo = git.Repo(repo_path)
            repo.remotes.origin.pull()
        else:
            logger.info(f"Cloning {github_url} into {repo_path}…")
            os.makedirs(repo_path, exist_ok=True)
            git.Repo.clone_from(github_url, repo_path)
        logger.info(f"Repository {repo_id} ready at {repo_path}.")
        return repo_path
    except git.exc.GitCommandError as e:
        if os.path.exists(repo_path):
            shutil.rmtree(repo_path)
        raise ValueError(f"Git operation failed for {github_url}: {e}") from e
    except Exception as e:
        if os.path.exists(repo_path):
            shutil.rmtree(repo_path)
        raise ValueError(f"Failed to clone {github_url}: {e}") from e


FILE_PRIORITY_MAP: dict[str, float] = {
    "README.md": 1.0,
    "package.json": 1.0,
    "requirements.txt": 1.0,
    "main.py": 1.0,
    "index.js": 1.0,
    "app.py": 1.0,
    "docker-compose.yml": 0.9,
    "Makefile": 0.9,
}


def calculate_file_priority(relative_path: str) -> float:
    """Calculate a priority score (0-1) for a file based on its name and depth."""
    filename = os.path.basename(relative_path)
    
    # Check exact match in priority map
    if filename in FILE_PRIORITY_MAP:
        return FILE_PRIORITY_MAP[filename]
    
    # Base priority starts higher for root-level files
    depth = relative_path.count(os.sep)
    if depth == 0:
        return 0.8
    elif depth == 1:
        return 0.7
    else:
        return max(0.4, 0.6 - (depth * 0.05))


def extract_chunks_from_repo(
    repo_path: str, repo_id: str
) -> list[CodeChunk]:
    """Walk a repo directory and extract code chunks from all supported files."""
    all_chunks: list[CodeChunk] = []
    file_count = 0

    for root, dirs, files in os.walk(repo_path):
        # Prune skipped directories in-place so os.walk won't descend into them
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]

        for filename in files:
            ext = os.path.splitext(filename)[1].lower()
            if ext not in SUPPORTED_EXTENSIONS:
                continue

            file_count += 1
            file_path = os.path.join(root, filename)
            # Store path relative to repo root for portability
            relative_path = os.path.relpath(file_path, repo_path)

            try:
                with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                    source = f.read()
                    f.seek(0, os.SEEK_END)
                    file_size = f.tell()
            except (OSError, IOError) as e:
                logger.warning(f"Skipping unreadable file {relative_path}: {e}")
                continue

            if not source.strip():
                continue

            priority = calculate_file_priority(relative_path)
            metadata = {
                "file_size": file_size,
                "depth": relative_path.count(os.sep),
            }

            file_chunks = chunk_file(
                source, 
                relative_path, 
                repo_id=repo_id, 
                priority=priority, 
                metadata=metadata
            )
            all_chunks.extend(file_chunks)

    logger.info(
        f"[INGEST] Parsed {file_count} files, extracted {len(all_chunks)} chunks from {repo_id}."
    )
    return all_chunks


def ingest_repository(github_url: str, repo_id: str) -> dict:
    """Clone a repo and extract all code chunks from it."""
    try:
        repo_path = clone_repository(github_url, repo_id)
        chunks = extract_chunks_from_repo(repo_path, repo_id)
        return {
            "repo_id": repo_id,
            "repo_path": repo_path,
            "total_chunks": len(chunks),
            "chunks": chunks,
            "status": "success",
        }
    except Exception as e:
        # Cleanup directory if it was created but something failed
        repo_path = os.path.join(REPOS_DIR, repo_id)
        if os.path.exists(repo_path):
            shutil.rmtree(repo_path)
        logger.error(f"Ingestion failed for {github_url}: {e}")
        raise
