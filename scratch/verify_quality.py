import requests
import json
import time

BASE_URL = "http://localhost:8000"

def get_token():
    print("Getting authentication token...")
    # Try logging in with a test account
    test_email = "test_quality@example.com"
    test_pass = "testpass123"
    
    # Try register first in case it doesn't exist
    try:
        requests.post(f"{BASE_URL}/auth/register", json={"email": test_email, "password": test_pass}, timeout=5)
    except:
        pass
        
    # Login
    response = requests.post(f"{BASE_URL}/auth/login", data={"username": test_email, "password": test_pass}, timeout=5)
    if response.status_code == 200:
        return response.json()["access_token"]
    else:
        print(f"Login failed: {response.status_code} - {response.text}")
        return None

def test_query(query, description, token):
    print(f"\n--- Testing {description} ---")
    print(f"Query: {query}")
    
    headers = {"Authorization": f"Bearer {token}"}
    payload = {
        "repo_id": "test-repo",
        "query": query,
        "stream": False
    }
    
    try:
        response = requests.post(f"{BASE_URL}/query", json=payload, headers=headers, timeout=30)
        print(f"DEBUG: Status {response.status_code}")
        print(f"DEBUG: Content-Length {len(response.content)}")
        if response.status_code == 200:
            if not response.content:
                print("ERROR: Empty response body")
                return
            try:
                data = response.json()
            except Exception as e:
                print(f"JSON Parse Error: {e}")
                print(f"Raw Response: {response.text}")
                return
            
            print(f"Confidence: {data.get('confidence')}")
            # The structure might have changed, check final_response if exists
            final = data.get('final_response') or data
            print(f"Root Cause: {str(final.get('root_cause'))[:200]}...")
            
            if final.get('evidence'):
                print(f"Evidence found: {len(final['evidence'])} chunks")
            else:
                print("No evidence found.")
            
            # Check if it was a general answer
            if "general knowledge" in str(final.get('retrieval_warning', '')).lower():
                print("PASSED: Answered from general knowledge.")
            elif final.get('evidence'):
                print("PASSED: Answered from code evidence.")
            else:
                print("RESULT: No evidence, no warning.")
        else:
            print(f"FAILED: Status {response.status_code} - {response.text}")
    except Exception as e:
        print(f"ERROR: {e}")

if __name__ == "__main__":
    # Wait for backend to be ready
    print("Waiting for backend...")
    time.sleep(5)
    
    token = get_token()
    if not token:
        exit(1)
    
    # 1. General Question (Should be handled by LLM knowledge)
    test_query("what is a relational database?", "General Question", token)
    
    # 2. Code Question (Should find relevant chunks)
    test_query("how is user authentication implemented?", "Code Question", token)
    
    # 3. Junk Question
    test_query("asdfghjkl qwertyuiop", "Junk Question", token)
