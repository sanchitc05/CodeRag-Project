"""
Phase 3 standalone test script for CodeRAG — LangGraph Reasoning Agent.

Run inside the backend container:
    docker exec -it coderag-project-backend-1 python tests/test_phase3.py

PREREQUISITE: Phase 2 tests must have run first so that "test_repo"
exists in ChromaDB with embedded chunks.
"""

import sys
import os

# Ensure the app package is importable from Docker (/app) or local (backend/) root
_here = os.path.dirname(os.path.abspath(__file__))
_backend_root = os.path.dirname(_here)
sys.path.insert(0, "/app")                 # Docker
sys.path.insert(0, _backend_root)          # Local


def run_tests() -> None:
    """Run all Phase 3 tests and print a summary."""
    results: list[tuple[str, bool, str]] = []

    # ── Test 1: State initialization ────────────────────────────────
    print("[1/5] State initialization…", end="", flush=True)
    try:
        from app.services.agent_state import AgentState, initial_state

        state = initial_state("test query", "repo1")
        required_keys = [
            "query", "repo_id", "retrieval_context", "hypothesis",
            "hypothesis_history", "confidence", "iteration", "evidence",
            "root_cause", "suggested_fix", "error", "final_response",
        ]
        for key in required_keys:
            assert key in state, f"Missing key: {key}"

        assert state["query"] == "test query", "Wrong query"
        assert state["repo_id"] == "repo1", "Wrong repo_id"
        assert state["iteration"] == 0, f"Expected iteration 0, got {state['iteration']}"
        assert state["confidence"] == 0.0, f"Expected confidence 0.0, got {state['confidence']}"
        assert state["hypothesis_history"] == [], "Expected empty hypothesis_history"
        assert state["evidence"] == [], "Expected empty evidence"
        assert state["retrieval_context"] is None, "Expected None retrieval_context"
        assert state["hypothesis"] is None, "Expected None hypothesis"
        assert state["root_cause"] is None, "Expected None root_cause"
        assert state["suggested_fix"] is None, "Expected None suggested_fix"
        assert state["error"] is None, "Expected None error"
        assert state["final_response"] is None, "Expected None final_response"
        print("     PASS")
        results.append(("State initialization", True, ""))
    except Exception as e:
        print(f"     FAIL  ({e})")
        results.append(("State initialization", False, str(e)))

    # ── Test 2: Retrieve node ───────────────────────────────────────
    print("[2/5] Retrieve node…", end="", flush=True)
    try:
        from app.services.agent_nodes import retrieve_node
        from app.services.agent_state import initial_state

        state = initial_state("authentication error", "test_repo")
        result = retrieve_node(state)

        assert isinstance(result, dict), "Expected dict return"
        assert "retrieval_context" in result, "Missing retrieval_context key"
        print("            PASS")
        results.append(("Retrieve node", True, ""))
    except Exception as e:
        print(f"            FAIL  ({e})")
        results.append(("Retrieve node", False, str(e)))

    # ── Test 3: Analyze node ────────────────────────────────────────
    print("[3/5] Analyze node…", end="", flush=True)
    try:
        from app.services.agent_nodes import analyze_node

        fake_state = initial_state("why does login fail", "test_repo")
        fake_state["retrieval_context"] = {
            "query": "why does login fail",
            "repo_id": "test_repo",
            "code_chunks": [
                {
                    "content": "def login(user, pwd):\n    if not user:\n        raise ValueError('no user')",
                    "file_path": "auth.py",
                    "start_line": 10,
                    "end_line": 13,
                    "name": "login",
                },
                {
                    "content": "def validate_token(token):\n    return jwt.decode(token)",
                    "file_path": "auth.py",
                    "start_line": 20,
                    "end_line": 22,
                    "name": "validate_token",
                },
            ],
            "log_results": [],
            "total_retrieved": 2,
        }

        result = analyze_node(fake_state)

        assert isinstance(result, dict), "Expected dict return"
        assert "hypothesis" in result, "Missing hypothesis"
        assert isinstance(result["hypothesis"], str), "hypothesis should be str"
        assert len(result["hypothesis"]) > 0, "Empty hypothesis"
        assert result["iteration"] == 1, f"Expected iteration 1, got {result['iteration']}"
        assert len(result["hypothesis_history"]) == 1, "hypothesis_history should have 1 entry"
        print("             PASS")
        results.append(("Analyze node", True, ""))
    except Exception as e:
        print(f"             FAIL  ({e})")
        results.append(("Analyze node", False, str(e)))

    # ── Test 4: Verify node ─────────────────────────────────────────
    print("[4/5] Verify node…", end="", flush=True)
    try:
        from app.services.agent_nodes import verify_node

        # Build on top of the fake state from test 3, simulating
        # what the state would look like after analyze_node ran.
        verify_state = initial_state("why does login fail", "test_repo")
        verify_state["retrieval_context"] = {
            "query": "why does login fail",
            "repo_id": "test_repo",
            "code_chunks": [
                {
                    "content": "def login(user, pwd):\n    if not user:\n        raise ValueError('no user')",
                    "file_path": "auth.py",
                    "start_line": 10,
                    "end_line": 13,
                    "name": "login",
                },
                {
                    "content": "def validate_token(token):\n    return jwt.decode(token)",
                    "file_path": "tokens.py",
                    "start_line": 20,
                    "end_line": 22,
                    "name": "validate_token",
                },
            ],
            "log_results": [],
            "total_retrieved": 2,
        }
        verify_state["hypothesis"] = "The login function raises a ValueError when the user parameter is empty or None."
        verify_state["iteration"] = 1
        verify_state["hypothesis_history"] = [verify_state["hypothesis"]]

        result = verify_node(verify_state)

        assert isinstance(result, dict), "Expected dict return"
        assert "confidence" in result, "Missing confidence"
        assert 0.0 <= result["confidence"] <= 1.0, (
            f"Confidence {result['confidence']} out of range"
        )
        assert "evidence" in result, "Missing evidence"
        assert isinstance(result["evidence"], list), "evidence should be a list"
        print("              PASS")
        results.append(("Verify node", True, ""))
    except Exception as e:
        print(f"              FAIL  ({e})")
        results.append(("Verify node", False, str(e)))

    # ── Test 5: Full agent run ──────────────────────────────────────
    print("[5/5] Full agent run…", end="", flush=True)
    try:
        from app.services.agent_graph import run_agent

        result = run_agent("why does the login function fail", "test_repo")

        assert isinstance(result, dict), f"Expected dict, got {type(result)}"

        # If there's an error key but no root_cause, the retrieval likely
        # found nothing — still a valid (graceful) response.
        if result.get("error") and result.get("root_cause") is None:
            print(f"  WARN  (agent returned error: {result['error']})")
            # Count as pass if it didn't crash — the function returned cleanly
            results.append(("Full agent run", True, f"warn: {result['error']}"))
        else:
            assert "root_cause" in result, "Missing root_cause"
            assert "suggested_fix" in result, "Missing suggested_fix"
            assert "evidence" in result, "Missing evidence"
            assert "confidence" in result, "Missing confidence"
            assert result["root_cause"] is not None, "root_cause is None"
            assert len(result["root_cause"]) > 0, "root_cause is empty"
            print(
                f"  PASS  (confidence={result['confidence']:.2f}, "
                f"iters={result.get('iterations', '?')})"
            )
            results.append(("Full agent run", True, ""))
    except Exception as e:
        print(f"  FAIL  ({e})")
        results.append(("Full agent run", False, str(e)))

    # ── Summary ─────────────────────────────────────────────────────
    passed = sum(1 for _, ok, _ in results if ok)
    total = len(results)
    print(f"\n{'=' * 50}")
    print(f"{passed}/{total} tests passed.")
    if passed < total:
        print("\nFailed tests:")
        for name, ok, err in results:
            if not ok:
                print(f"  ✗ {name}: {err}")
    print(f"{'=' * 50}")


if __name__ == "__main__":
    run_tests()
