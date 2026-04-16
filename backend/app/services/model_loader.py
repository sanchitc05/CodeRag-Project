"""Loads and caches all AI models for CodeRAG."""

import logging
from typing import Optional

import torch
from sentence_transformers import SentenceTransformer
from transformers import AutoModel, AutoModelForSeq2SeqLM, AutoTokenizer

from app.config import settings

logger = logging.getLogger(__name__)

MODEL_CACHE_DIR: str = settings.MODEL_CACHE_DIR


class ModelManager:
    """Manages loading, caching, and inference for all CodeRAG models."""

    def __init__(self) -> None:
        """Load all 3 models from cache if available, download otherwise."""
        self._code_tokenizer = None
        self._code_model = None
        self._gen_tokenizer = None
        self._gen_model = None

        self._load_code_model()
        self._load_generation_model()

    # ── Private loaders ──────────────────────────────────────────────


    def _load_code_model(self) -> None:
        """Load microsoft/codebert-base for code embedding."""
        try:
            logger.info("Loading CodeBERT model…")
            self._code_tokenizer = AutoTokenizer.from_pretrained(
                "microsoft/codebert-base",
                cache_dir=MODEL_CACHE_DIR,
            )
            self._code_model = AutoModel.from_pretrained(
                "microsoft/codebert-base",
                cache_dir=MODEL_CACHE_DIR,
            )
            self._code_model.eval()
            logger.info("CodeBERT model loaded successfully.")
        except Exception as e:
            logger.error(f"Failed to load CodeBERT model: {e}")
            raise RuntimeError(f"CodeBERT load failed: {e}") from e

    def _load_generation_model(self) -> None:
        """Load google/flan-t5-base for text generation."""
        try:
            logger.info("Loading FLAN-T5 generation model…")
            self._gen_tokenizer = AutoTokenizer.from_pretrained(
                "google/flan-t5-base",
                cache_dir=MODEL_CACHE_DIR,
            )
            self._gen_model = AutoModelForSeq2SeqLM.from_pretrained(
                "google/flan-t5-base",
                cache_dir=MODEL_CACHE_DIR,
            )
            self._gen_model.eval()
            logger.info("FLAN-T5 generation model loaded successfully.")
        except Exception as e:
            logger.error(f"Failed to load FLAN-T5 model: {e}")
            raise RuntimeError(f"FLAN-T5 load failed: {e}") from e

    # ── Public inference methods ─────────────────────────────────────


    def embed_code(self, code: str) -> list[float]:
        """Embed a code string using CodeBERT with mean pooling."""
        inputs = self._code_tokenizer(
            code,
            return_tensors="pt",
            max_length=512,
            truncation=True,
            padding=True,
        )
        with torch.no_grad():
            output = self._code_model(**inputs)
        # Mean-pool over the sequence dimension
        embeddings = output.last_hidden_state.mean(dim=1).squeeze().tolist()
        return embeddings

    def generate(self, prompt: str, max_new_tokens: int = 256) -> str:
        """Run FLAN-T5 generation and return decoded output string."""
        inputs = self._gen_tokenizer(prompt, return_tensors="pt")
        with torch.no_grad():
            output_ids = self._gen_model.generate(
                **inputs,
                max_new_tokens=max_new_tokens,
            )
        return self._gen_tokenizer.decode(output_ids[0], skip_special_tokens=True)


# ── Module-level singleton ──────────────────────────────────────────
# Models are loaded once when this module is first imported.
model_manager = ModelManager()
