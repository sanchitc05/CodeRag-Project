from contextlib import asynccontextmanager

from fastapi import FastAPI

from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine
import app.models  # noqa: F401
from app.routes import auth, history, query


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Create database tables on startup."""
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title="CodeRAG",
    description="AI-powered debugging assistant for developers",
    version="0.1.0",
    lifespan=lifespan,
)

# Add CORS middleware for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth.router)
app.include_router(query.router)
app.include_router(history.router)


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "ok", "service": "coderag"}
