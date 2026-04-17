"""Local runner for test_phase3.py — patches the /app Docker path for Windows dev."""
import sys, os

# Allow both Docker (/app) and local (repo/backend) paths
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from tests.test_phase3 import run_tests  # noqa: E402

if __name__ == "__main__":
    run_tests()
