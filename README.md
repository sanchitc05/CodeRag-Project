# 🚀 CodeRAG – AI-Powered Repository Chat Assistant

CodeRAG is an advanced **Retrieval-Augmented Generation (RAG)** based system that helps developers understand, search, and interact with large codebases using natural language.

Instead of manually exploring files and functions, users can simply ask questions like:

- *Where is user authentication implemented?*
- *Explain the login flow.*
- *Which files are responsible for vector search?*
- *How does the API routing work?*

CodeRAG intelligently indexes your repository, retrieves relevant code chunks, and uses LLMs to generate accurate answers with context.

---

# 🌟 Features

## 🔍 Smart Code Search
Search across your entire repository using natural language queries.

## 🧠 AI Code Understanding
Get explanations of logic, functions, classes, architecture, and workflows.

## ⚡ Real-Time Streaming Chat
Fast token-by-token streaming responses for smooth conversations.

## 📂 Multi-Repository Support
Upload or connect multiple repositories and query them separately.

## 🔐 Authentication System
Secure user signup, login, and protected sessions.

## 📑 Citation-Based Answers
Every AI response references exact source files and chunks.

## 🗃 Vector Database Support
Uses semantic embeddings for accurate code retrieval.

## 📊 Scalable Architecture
Designed for enterprise-scale repositories.

---

# 🛠 Tech Stack

## Frontend
- React + TypeScript
- Vite
- Tailwind CSS
- Zustand
- React Query

## Backend
- FastAPI
- Python
- LangChain
- Sentence Transformers
- JWT Authentication

## Databases
- MySQL → Users & metadata
- ChromaDB → Vector storage
- Elasticsearch → Hybrid search

## DevOps / Tools
- Docker Compose
- Uvicorn
- GitHub

---

## 🏗️ Architecture

Built on a modern, scalable, and intelligent AI-powered technology stack.

### 🌐 Frontend
- **Framework:** React + TypeScript + Vite (Fast and modern UI development)
- **State Management:** Zustand + React Query (Efficient state & API caching)
- **Styling:** Tailwind CSS (Responsive and clean design system)
- **User Experience:** Real-time streaming chat interface
- **Build Tool:** Vite (Lightning-fast development environment)

### ⚙️ Backend
- **Framework:** FastAPI (High-performance async Python backend)
- **Authentication:** JWT-based secure login system
- **API Layer:** RESTful endpoints with scalable architecture
- **Validation:** Pydantic models for strict type safety
- **Server:** Uvicorn (ASGI production-ready server)

### 🗄️ Databases & Search
- **Relational Database:** MySQL 8.0 (Users, sessions, metadata)
- **Vector Database:** ChromaDB (Semantic embedding search)
- **Search Engine:** Elasticsearch (Keyword + hybrid retrieval)

### 🤖 AI & Retrieval Layer
- **LLM Provider:** Google Gemini API
- **Embedding Engine:** Sentence Transformers
- **Framework:** LangChain (RAG orchestration pipeline)
- **Retrieval Method:** Hybrid Search (Semantic + Keyword matching)
- **Output:** Context-aware answers with source citations

### 🐳 DevOps & Deployment
- **Containerization:** Docker Compose
- **Version Control:** Git + GitHub
- **Environment Management:** `.env` based configuration
- **Scalability:** Multi-service modular architecture

---

## 🗂️ Project Structure

```
CodeRag-Project/
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI app entry point
│   │   ├── models/          # SQLAlchemy ORM models
│   │   ├── routes/          # API routes (auth, query, history)
│   │   ├── services/        # Business logic & RAG pipeline
│   │   └── utils/           # Logging, health checks, exceptions
│   ├── requirements.txt
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/           # Route-level pages
│   │   ├── hooks/           # Custom React hooks
│   │   └── store/           # Zustand global state
│   └── package.json
├── scripts/
│   ├── setup.sh             # One-click initialization
│   ├── verify.sh            # Health verification
│   └── teardown.sh          # Clean shutdown
├── docker-compose.yml
├── Makefile
└── README.md
```

---

## 🚀 Getting Started

Follow these steps to run a local instance of **CodeRAG** on your machine.

### Prerequisites
- Python 3.10+
- Node.js 18+
- Docker Desktop
- Git

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/snehas-05/CodeRag-Project.git
cd CodeRag-Project
```

### 2️⃣ Start Core Services

```bash
docker compose up mysql chromadb elasticsearch
```

This starts:

MySQL Database → localhost:3306

ChromaDB Vector Store → localhost:8000

Elasticsearch → localhost:9200

> ⚠️ **Wait for Elasticsearch to be fully healthy before starting the backend.**
> Elasticsearch can take **30–60 seconds** to initialize. You can monitor readiness with:
> ```bash
> curl http://localhost:9200/_cluster/health?wait_for_status=yellow&timeout=60s
> ```

### 3️⃣ Backend Setup

```bash
# Open a new terminal
cd backend

# Create virtual environment
python -m venv .venv

# Activate environment

# Windows
.venv\Scripts\Activate.ps1

# macOS / Linux
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env

# Edit .env and add:
# GOOGLE_API_KEY
# MYSQL credentials
# JWT secret

# Start backend server
uvicorn app.main:app --reload
```
Backend URL: http://localhost:8000

Swagger Docs: http://localhost:8000/docs

### 4️⃣ Frontend Setup

```bash
# Open another terminal
cd frontend

# Install dependencies
npm install

# Start frontend server
npm run dev
```
Frontend URL: http://localhost:5176

### 5️⃣ Ready to Use
Open your browser and start chatting with repositories using CodeRAG 🚀

---

## 🔑 Environment Variables

Create a `.env` file in the **project root** (or copy `.env.example`):

```bash
cp .env.example .env
```

Then configure the following values:

```env
# App Mode ("local" for dev, "docker" for Docker Compose)
APP_ENV=local

# MySQL
MYSQL_ROOT_PASSWORD=rootpassword
MYSQL_DATABASE=coderag
MYSQL_USER=coderag_user
MYSQL_PASSWORD=coderag_pass
MYSQL_URL=mysql+pymysql://coderag_user:coderag_pass@mysql:3306/coderag
MYSQL_HOST_PORT=3307

# Security
SECRET_KEY=your-secret-key-change-in-production
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# ChromaDB
CHROMA_HOST=chromadb
CHROMA_PORT=8000
CHROMA_HOST_PORT=8001

# Elasticsearch
ELASTICSEARCH_URL=http://elasticsearch:9200

# Storage Paths
MODEL_CACHE_DIR=/app/model_cache
REPOS_DIR=/app/repos

# Google Gemini API
GEMINI_API_KEY=your_api_key_here
GEMINI_REASONING_MODEL=gemini-2.0-flash
```

📌 **Notes**

- Replace all placeholder values with your actual credentials.
- Keep your `.env` file private and never push it to GitHub.
- Make sure Docker services are running before starting the backend.
- Restart the backend server after changing environment variables.

---

## 🤖 AI Model Used

CodeRAG uses **Google Gemini 2.0 Flash** for intelligent response generation — a state-of-the-art multimodal LLM optimized for speed and accuracy.

### ✨ Capabilities
- Context-aware repository conversations
- Accurate code explanations
- Natural language Q&A over codebases
- Smart summarization of files and folders
- Fast streaming responses

---

## 💬 Example Queries

Try asking questions like:

- Explain the authentication flow
- Which file handles login?
- Summarize this repository
- Show all backend API routes
- Explain vector search logic
- Where is JWT implemented?
- Which files use MySQL?
- How does the chat pipeline work?

---

## 🔒 Security Features

Built with modern security best practices.

- JWT Authentication
- Password Hashing
- Protected API Routes
- Secure Session Handling
- Request Validation
- CORS Protection
- Environment Variable Secrets

---

## 🚀 Future Improvements

Planned upgrades for upcoming versions:

- GitHub Repository Auto Import
- Multi-Repository Workspace
- Pull Request Review Assistant
- AI Bug Detection
- Codebase Visualization Graph
- Team Collaboration Features
- Voice Commands
- Deployment Dashboard

---

## 🤝 Contributing

Contributions are welcome and appreciated.

```bash
# Fork the repository
# Create your feature branch
git checkout -b feature/amazing-feature

# Commit your changes
git commit -m "Add amazing feature"

# Push to branch
git push origin feature/amazing-feature

# Open a Pull Request
```
Contribution Guidelines:
Follow clean code practices

Write meaningful commit messages

Test before submitting PRs

Keep pull requests focused

---

👩‍💻 Author

Sneha Singhania
B.Tech CSE | AI Developer | Full Stack Enthusiast

GitHub: https://github.com/snehas-05

---

⭐ Support

If you found this project useful:

Give it a Star ⭐ on GitHub
Share it with developers
Contribute new features

---

💡 Why CodeRAG?

Modern repositories are large and complex.

Reading files manually takes time.

CodeRAG transforms codebases into conversations.

Ask questions.
Get accurate answers.
Understand faster.
Build smarter.

---

## 📄 License

This project is licensed under the **MIT License**.

```
MIT License

Copyright (c) 2026 Sneha Singhania

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

See the [LICENSE](./LICENSE) file for full details.

---
