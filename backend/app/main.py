from contextlib import asynccontextmanager
import logging

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.database import Base, engine
import app.models  # noqa: F401
from app.routes import auth, history, query
from app.utils.logging_utils import LoggingMiddleware
from app.utils.exception_handlers import (
    http_exception_handler, 
    validation_exception_handler, 
    generic_exception_handler
)
from app.utils.healthchecks import check_dependencies

logger = logging.getLogger("coderag.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Verify dependencies and create database tables on startup."""
    logger.info("Backend starting up...")
    
    # 1. Check external dependencies (MySQL, Chroma, ES)
    deps_ok = check_dependencies()
    if not deps_ok:
        logger.error("Backend startup delayed: One or more dependencies are offline.")
    
    # 2. Create database tables
    Base.metadata.create_all(bind=engine)
    
    logger.info("Backend is ready to serve requests.")
    yield


app = FastAPI(
    title="CodeRAG",
    description="AI-powered debugging assistant for developers",
    version="0.1.0",
    lifespan=lifespan,
)

# Exception Handlers
app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, generic_exception_handler)

# Middlewares
app.add_middleware(LoggingMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:5176",
        "http://localhost:5177",
        "http://localhost:5178",
        "http://localhost:5179",
        "http://localhost:5180",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:5175",
        "http://127.0.0.1:5176",
        "http://127.0.0.1:5177",
        "http://127.0.0.1:5178",
        "http://127.0.0.1:5179",
        "http://127.0.0.1:5180",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
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
