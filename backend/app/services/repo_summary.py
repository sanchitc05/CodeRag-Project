"""Generates high-level summaries of repositories during ingestion."""

import logging
import os
from typing import List
from app.utils.chunker import CodeChunk

logger = logging.getLogger(__name__)

def generate_repo_summary(repo_path: str, chunks: List[CodeChunk]) -> str:
    """
    Generates a high-level summary of the repository.
    Includes folder structure and a list of key files.
    """
    try:
        # 1. Get folder structure (top-level only for brevity)
        structure = []
        for item in os.listdir(repo_path):
            if os.path.isdir(os.path.join(repo_path, item)) and not item.startswith('.'):
                structure.append(f"- {item}/")
            elif os.path.isfile(os.path.join(repo_path, item)):
                structure.append(f"- {item}")
        
        folder_str = "\n".join(structure)

        # 2. Identify key files from priority
        key_files = sorted(chunks, key=lambda x: x.get("priority", 0), reverse=True)
        unique_key_files = []
        seen_files = set()
        for c in key_files:
            if c["file_path"] not in seen_files:
                unique_key_files.append(c["file_path"])
                seen_files.add(c["file_path"])
            if len(unique_key_files) >= 10:
                break
        
        key_files_str = ", ".join(unique_key_files)

        # 3. Detect tech stack (simple heuristic)
        extensions = {os.path.splitext(c["file_path"])[1].lower() for c in chunks}
        tech_map = {
            ".py": "Python",
            ".js": "JavaScript",
            ".ts": "TypeScript",
            ".java": "Java",
            ".go": "Go",
            ".cpp": "C++",
            ".c": "C",
            ".rb": "Ruby",
        }
        detected_tech = [tech_map[ext] for ext in extensions if ext in tech_map]
        tech_stack_str = ", ".join(detected_tech)

        summary = f"""# Repository Overview

## Tech Stack
{tech_stack_str}

## Folder Structure
{folder_str}

## Key Files
{key_files_str}

## Summary
This repository contains {len(unique_key_files)} primary entry points and is built using {tech_stack_str}.
"""
        return summary
    except Exception as e:
        logger.error(f"Failed to generate repo summary: {e}")
        return "Failed to generate repository summary."
