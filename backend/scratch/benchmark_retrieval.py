import sys
import os
import json
from pathlib import Path

# Add backend to path so we can import app
sys.path.append(str(Path(__file__).resolve().parents[1]))

from app.services.retrieval import retrieve_context
from app.config import settings

def run_benchmark(repo_id: str, queries: list[str]):
    print(f"--- Benchmarking Retrieval for {repo_id} ---")
    results = []
    
    for query in queries:
        print(f"\nQuery: {query}")
        try:
            # We need to make sure we are calling the retrieval service
            context = retrieve_context(query, repo_id)
            chunks = context.get("code_chunks", [])
            
            query_results = {
                "query": query,
                "retrieved_files": [c.get("file_path") for c in chunks],
                "scores": [c.get("score", "N/A") for c in chunks],
                "count": len(chunks)
            }
            results.append(query_results)
            
            print(f"Retrieved {len(chunks)} chunks.")
            for i, chunk in enumerate(chunks[:5]):
                score = chunk.get('score', 'N/A')
                print(f"  [{i+1}] {chunk.get('file_path')} (Score: {score})")
                
        except Exception as e:
            print(f"  Error: {e}")
            results.append({"query": query, "error": str(e)})

    return results

if __name__ == "__main__":
    test_repo = "InsightBank-AI"
    test_queries = [
        "Why did the payment fail?",
        "Handle database connection error",
        "Explain transaction processing logic",
        "Where is the user authentication handled?"
    ]
    
    # Check if repo exists
    repo_path = os.path.join(settings.resolved_repos_dir, test_repo)
    if not os.path.exists(repo_path):
        print(f"Error: Repo {test_repo} not found at {repo_path}")
        sys.exit(1)
        
    benchmark_data = run_benchmark(test_repo, test_queries)
    
    output_file = Path(__file__).parent / "benchmark_results_before.json"
    with open(output_file, "w") as f:
        json.dump(benchmark_data, f, indent=2)
    
    print(f"\nResults saved to {output_file}")
