"""AST-based code chunking for CodeRAG ingestion pipeline."""

import ast
import os
import uuid
from typing import TypedDict


class CodeChunk(TypedDict):
    """Represents a single chunk of source code."""

    chunk_id: str
    repo_id: str
    file_path: str
    language: str
    chunk_type: str  # "function", "class", or "block"
    name: str  # function/class name, or "block_N"
    start_line: int
    end_line: int
    content: str
    priority: float  # 0.0 to 1.0, higher means more important
    metadata: dict  # flexibility for extra info (size, complexity, etc.)


# Map file extensions to language names
EXTENSION_MAP: dict[str, str] = {
    ".py": "python",
    ".js": "javascript",
    ".ts": "typescript",
    ".java": "java",
    ".go": "go",
    ".cpp": "cpp",
    ".c": "c",
    ".rb": "ruby",
    ".md": "markdown",
    ".json": "json",
}

SUPPORTED_EXTENSIONS: set[str] = set(EXTENSION_MAP.keys())


def _make_chunk(
    file_path: str,
    language: str,
    chunk_type: str,
    name: str,
    start_line: int,
    end_line: int,
    content: str,
    repo_id: str = "default",
    priority: float = 0.5,
    metadata: dict = None,
) -> CodeChunk:
    """Create a CodeChunk dict with a unique ID."""
    return CodeChunk(
        chunk_id=str(uuid.uuid4()),
        repo_id=repo_id,
        file_path=file_path,
        language=language,
        chunk_type=chunk_type,
        name=name,
        start_line=start_line,
        end_line=end_line,
        content=content,
        priority=priority,
        metadata=metadata or {},
    )


def _split_into_blocks(
    source: str,
    file_path: str,
    language: str,
    block_size: int = 50,
    overlap: int = 0,
    repo_id: str = "default",
    priority: float = 0.5,
    metadata: dict = None,
) -> list[CodeChunk]:
    """Split source code into fixed-size line blocks with optional overlap."""
    lines = source.splitlines(keepends=True)
    chunks: list[CodeChunk] = []
    step = max(block_size - overlap, 1)
    block_num = 0

    i = 0
    while i < len(lines):
        end = min(i + block_size, len(lines))
        block_content = "".join(lines[i:end])
        if block_content.strip():  # skip empty blocks
            block_num += 1
            chunks.append(
                _make_chunk(
                    file_path=file_path,
                    language=language,
                    chunk_type="block",
                    name=f"block_{block_num}",
                    start_line=i + 1,
                    end_line=end,
                    content=block_content,
                    repo_id=repo_id,
                    priority=priority,
                    metadata=metadata,
                )
            )
        i += step

    return chunks


def chunk_python_file(
    source: str,
    file_path: str,
    repo_id: str = "default",
    priority: float = 0.5,
    metadata: dict = None,
) -> list[CodeChunk]:
    """Parse a Python file using AST and extract functions and classes as chunks."""
    chunks: list[CodeChunk] = []
    lines = source.splitlines(keepends=True)

    try:
        tree = ast.parse(source)
    except SyntaxError:
        # File can't be parsed — fall back to line blocks
        return _split_into_blocks(
            source,
            file_path,
            "python",
            block_size=50,
            repo_id=repo_id,
            priority=priority,
            metadata=metadata,
        )

    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            chunk_type = "function"
        elif isinstance(node, ast.ClassDef):
            chunk_type = "class"
        else:
            continue

        start = node.lineno  # 1-indexed
        end = node.end_lineno or node.lineno
        content = "".join(lines[start - 1 : end])

        if content.strip():
            chunks.append(
                _make_chunk(
                    file_path=file_path,
                    language="python",
                    chunk_type=chunk_type,
                    name=node.name,
                    start_line=start,
                    end_line=end,
                    content=content,
                    repo_id=repo_id,
                    priority=priority,
                    metadata=metadata,
                )
            )

    # Fall back to line blocks if no functions/classes were found
    if not chunks:
        return _split_into_blocks(
            source,
            file_path,
            "python",
            block_size=50,
            repo_id=repo_id,
            priority=priority,
            metadata=metadata,
        )

    return chunks


def chunk_generic_file(
    source: str,
    file_path: str,
    language: str,
    repo_id: str = "default",
    priority: float = 0.5,
    metadata: dict = None,
) -> list[CodeChunk]:
    """Split a non-Python source file into overlapping 60-line blocks."""
    return _split_into_blocks(
        source,
        file_path,
        language,
        block_size=60,
        overlap=10,
        repo_id=repo_id,
        priority=priority,
        metadata=metadata,
    )


def chunk_file(
    source: str,
    file_path: str,
    repo_id: str = "default",
    priority: float = 0.5,
    metadata: dict = None,
) -> list[CodeChunk]:
    """Detect language from extension and route to the appropriate chunker."""
    ext = os.path.splitext(file_path)[1].lower()

    if ext not in SUPPORTED_EXTENSIONS:
        return []

    language = EXTENSION_MAP[ext]

    if ext == ".py":
        return chunk_python_file(
            source, file_path, repo_id, priority, metadata
        )

    return chunk_generic_file(
        source, file_path, language, repo_id, priority, metadata
    )
