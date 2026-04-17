"""Loads and caches all AI models for CodeRAG.

Embedding model: sentence-transformers/all-MiniLM-L6-v2
  - Used for BOTH ingestion (embed_code) and retrieval (embed_query)
  - Consistent 384-dimensional cosine-space vectors

Generation model: Gemma 3 via Google AI API (google-genai SDK)
  - Model: gemma-3-4b-it  (instruction-tuned, excellent at code reasoning)
  - Falls back with a clear error if GEMINI_API_KEY is missing or invalid
  - No local GPU required — inference happens in the cloud (free tier)
"""

import logging
from typing import Optional

from sentence_transformers import SentenceTransformer

from app.config import settings

logger = logging.getLogger(__name__)

# Embedding model — single source of truth, must match ingestion
EMBED_MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"


class ModelManager:
    """Manages loading, caching, and inference for all CodeRAG models."""

    def __init__(self) -> None:
        self._embed_model: Optional[SentenceTransformer] = None
        self._genai_client = None   # google.genai.Client
        self._gen_model_name: str = settings.GEMMA_MODEL

        self._load_embedding_model()
        self._load_generation_model()

    # ── Private loaders ──────────────────────────────────────────────

    def _load_embedding_model(self) -> None:
        """Load sentence-transformers/all-MiniLM-L6-v2 for embedding."""
        try:
            logger.info(f"Loading embedding model: {EMBED_MODEL_NAME}…")
            self._embed_model = SentenceTransformer(
                EMBED_MODEL_NAME,
                cache_folder=settings.MODEL_CACHE_DIR,
            )
            logger.info("Embedding model loaded successfully.")
        except Exception as e:
            logger.error(f"Failed to load embedding model: {e}")
            raise RuntimeError(f"Embedding model load failed: {e}") from e

    def _load_generation_model(self) -> None:
        """Initialise the Google AI (Gemma 3) client."""
        api_key = settings.GEMINI_API_KEY
        if not api_key:
            raise RuntimeError(
                "GEMINI_API_KEY is not set. "
                "Get a free key at https://aistudio.google.com/apikey "
                "and add it to your .env.local file."
            )
        try:
            from google import genai  # type: ignore[import-untyped]

            self._genai_client = genai.Client(api_key=api_key)
            logger.info(
                f"Google AI client initialised. Generation model: {self._gen_model_name}"
            )
        except ImportError as e:
            raise RuntimeError(
                "google-genai package not found. "
                "Run: pip install google-genai>=1.0.0"
            ) from e
        except Exception as e:
            logger.error(f"Failed to initialise Google AI client: {e}")
            raise RuntimeError(f"Google AI client init failed: {e}") from e

    # ── Public inference methods ─────────────────────────────────────

    def embed_code(self, code: str) -> list[float]:
        """Embed a code/text string using all-MiniLM-L6-v2.

        Used during INGESTION to embed code chunks stored in ChromaDB.
        Produces 384-dimensional float vectors in cosine space.
        """
        return self._embed_model.encode(
            code,
            normalize_embeddings=True,
            show_progress_bar=False,
        ).tolist()

    def embed_query(self, query: str) -> list[float]:
        """Embed a user query string using the same model as embed_code.

        Used during RETRIEVAL so stored vectors and query vectors are
        in the same space — critical for meaningful cosine similarity.
        """
        return self._embed_model.encode(
            query,
            normalize_embeddings=True,
            show_progress_bar=False,
        ).tolist()

    def generate(self, prompt: str, max_new_tokens: int = 512) -> str:
        """Call Gemma 3 via Google AI API and return the response text.

        Args:
            prompt: Full prompt string (system + user context combined).
            max_new_tokens: Upper bound on output tokens (soft limit).

        Returns:
            The model's text response, stripped of leading/trailing whitespace.
        """
        if self._genai_client is None:
            raise RuntimeError("Generation model not initialised.")

        try:
            response = self._genai_client.models.generate_content(
                model=self._gen_model_name,
                contents=prompt,
            )
            return response.text.strip()
        except Exception as e:
            logger.error(f"[GENERATE] Gemma API call failed: {e}")
            raise


# ── Module-level singleton ──────────────────────────────────────────
# Models are loaded once when this module is first imported.
model_manager = ModelManager()
