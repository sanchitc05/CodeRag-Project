

"""Embeds code chunks and stores/queries them in ChromaDB."""

import logging
import chromadb

from app.services.model_loader import model_manager

logger = logging.getLogger(__name__)

BATCH_SIZE: int = 32


def _get_chroma_client() -> chromadb.HttpClient:
    """Create a ChromaDB HTTP client."""
    from app.config import settings
    return chromadb.HttpClient(
        host=settings.resolved_chroma_host,
        port=settings.resolved_chroma_port,
        settings=chromadb.Settings(anonymized_telemetry=False)
    )

def get_or_create_collection(repo_id: str) -> chromadb.Collection:
    """Return a ChromaDB collection for the given repo, creating it if needed."""
    client = _get_chroma_client()
    collection_name = f"coderag_{repo_id}"

    return client.get_or_create_collection(
        name=collection_name,
        metadata={"hnsw:space": "cosine"},
    )


def embed_and_store_chunks(chunks: list[dict], repo_id: str) -> int:
    """Embed code chunks in batches and store them in ChromaDB."""
    collection = get_or_create_collection(repo_id)
    stored_count = 0

    for i in range(0, len(chunks), BATCH_SIZE):
        batch = chunks[i : i + BATCH_SIZE]

        ids = []
        embeddings = []
        documents = []
        metadatas = []

        for chunk in batch:
            content = chunk.get("content", "")
            if not content.strip():
                continue

            try:
                embedding = model_manager.embed_code(content)
            except Exception as e:
                logger.warning(f"Embedding failed: {e}")
                continue

            ids.append(chunk["chunk_id"])
            embeddings.append(embedding)
            documents.append(content)
            metadatas.append(
                {
                    "file_path": chunk.get("file_path", ""),
                    "language": chunk.get("language", ""),
                    "chunk_type": chunk.get("chunk_type", ""),
                    "name": chunk.get("name", ""),
                    "start_line": chunk.get("start_line", 0),
                    "end_line": chunk.get("end_line", 0),
                    "repo_id": repo_id,
                }
            )

        if ids:
            try:
                collection.add(
                    ids=ids,
                    embeddings=embeddings,
                    documents=documents,
                    metadatas=metadatas,
                )
                stored_count += len(ids)
            except Exception as e:
                logger.error(f"ChromaDB add failed: {e}")

    msg = f"[STORE] Stored {stored_count}/{len(chunks)} chunks for repo {repo_id} in ChromaDB."
    logger.info(msg)
    print(msg)
    return stored_count


def query_chromadb(
    query_embedding: list[float],
    repo_id: str,
    top_k: int = 5,
    similarity_threshold: float = 0.55,
) -> list[dict]:
    """Query ChromaDB for nearest code chunks with distance scores.

    Args:
        query_embedding: Pre-computed query vector from embed_query().
        repo_id: Which ChromaDB collection to search.
        top_k: Maximum number of results to return.
        similarity_threshold: Minimum cosine similarity (0–1). Chunks with
            similarity < threshold are discarded. Default 0.5.
    """
    try:
        collection = get_or_create_collection(repo_id)
        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=top_k,
            include=["documents", "metadatas", "distances"],
        )
    except Exception as e:
        logger.warning(f"ChromaDB query failed: {e}")
        print(f"[RETRIEVE] ChromaDB query failed for repo {repo_id}: {e}")
        return []

    items = []

    if not results or not results.get("ids") or not results["ids"][0]:
        print(f"[RETRIEVE] ChromaDB returned 0 results for repo {repo_id}.")
        return items

    raw_count = len(results["ids"][0])
    print(f"[RETRIEVE] ChromaDB returned {raw_count} raw chunks for repo {repo_id}.")

    for i in range(raw_count):
        metadata = results["metadatas"][0][i] if results.get("metadatas") else {}
        distance = results["distances"][0][i] if results.get("distances") else 1.0
        # ChromaDB cosine distance: distance=0 means identical, distance=1 means orthogonal
        # Convert to similarity: similarity = 1 - distance
        similarity = round(1.0 - distance, 4)

        if similarity < similarity_threshold:
            logger.debug(
                f"[RETRIEVE] Skipping chunk (similarity={similarity:.3f} < threshold={similarity_threshold})"
            )
            continue

        items.append(
            {
                "content": results["documents"][0][i] if results.get("documents") else "",
                "file_path": metadata.get("file_path", ""),
                "name": metadata.get("name", ""),
                "start_line": metadata.get("start_line", 0),
                "end_line": metadata.get("end_line", 0),
                "distance": distance,
                "score": similarity,
            }
        )

    if not items:
        print(
            f"[RETRIEVE] [RELEVANCE_FAILURE] 0/{raw_count} chunks passed similarity "
            f"threshold of {similarity_threshold} for repo {repo_id}."
        )
    else:
        print(f"[RETRIEVE] {len(items)}/{raw_count} chunks passed similarity threshold for repo {repo_id}.")

    return items
