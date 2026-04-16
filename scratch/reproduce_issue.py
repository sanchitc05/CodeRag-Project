
import os
import sys

# Add the backend directory to sys.path
backend_dir = os.path.join(os.getcwd(), "backend")
if backend_dir not in sys.path:
    sys.path.append(backend_dir)

from app.services.ingestion import ingest_repository
from app.services.embeddings import embed_and_store_chunks, get_or_create_collection
from app.services.elasticsearch_service import index_logs_from_repo, search_logs
from app.services.retrieval import retrieve_context
from app.services.model_loader import model_manager

def test_pipeline():
    repo_id = "test-retrieval-fix"
    github_url = "https://github.com/octocat/Spoon-Knife" # Small repo
    
    print("\n--- Testing Ingestion ---")
    result = ingest_repository(github_url, repo_id)
    repo_path = result.get("repo_path")
    chunks = result.get("chunks", [])
    print(f"Repo path: {repo_path}")
    print(f"Chunks extracted: {len(chunks)}")
    
    if not repo_path or not os.path.exists(repo_path):
        print("FAILED: Repo path invalid")
        return

    print("\n--- Testing Embeddings (768d) ---")
    # Verify model dimension
    test_emb = model_manager.embed_code("def hello(): pass")
    print(f"Test embedding dimension: {len(test_emb)}")
    if len(test_emb) != 768:
        print(f"FAILED: Expected 768d, got {len(test_emb)}d")
    
    count = embed_and_store_chunks(chunks, repo_id)
    print(f"Chunks stored in ChromaDB: {count}")
    
    print("\n--- Testing Elasticsearch (Broad Scanning) ---")
    # Create a dummy log file in a non-standard location
    dummy_log_dir = os.path.join(repo_path, "some", "nested", "folder")
    os.makedirs(dummy_log_dir, exist_ok=True)
    dummy_log_path = os.path.join(dummy_log_dir, "debug.out")
    with open(dummy_log_path, "w") as f:
        f.write("2024-01-01 12:00:00 ERROR: Critical failure in test component\n")
    
    log_count = index_logs_from_repo(repo_path, repo_id)
    print(f"Logs indexed: {log_count}")
    
    print("\n--- Testing Retrieval ---")
    ctx = retrieve_context("Critical failure", repo_id)
    print(f"Retrieval Results:")
    print(f"  Code chunks: {len(ctx['code_chunks'])}")
    print(f"  Logs: {len(ctx['log_results'])}")
    
    if len(ctx['log_results']) > 0:
        print(f"SUCCESS: Found log from .out file in nested folder!")
    else:
        print("FAILED: Could not find the nested log.")

if __name__ == "__main__":
    # Ensure uvicorn environment variables or defaults are handled if needed
    # (The services use app.config which reads from .env)
    test_pipeline()
