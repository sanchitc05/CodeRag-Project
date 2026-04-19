"""Loads and caches all AI models for CodeRAG.

Embedding model: sentence-transformers/all-MiniLM-L6-v2
  - Used for BOTH ingestion (embed_code) and retrieval (embed_query)
  - Consistent 384-dimensional cosine-space vectors

Generation model: gemini-1.5-flash via Google AI API (google-genai SDK)
  - Model: gemini-1.5-flash (highly capable architectural reasoning)
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
        self._genai_client = None  # google.genai.Client
        self._gen_model_name: str = settings.GEMINI_REASONING_MODEL
        self._initialized = False

        # Fallback chain as requested
        self._fallback_chain = ["gemini-2.0-flash", "gemini-1.5-flash-8b", "gemma-3-4b-it"]
        
        # Ensure current primary is at the start if not already there
        if self._gen_model_name not in self._fallback_chain:
            self._fallback_chain = [self._gen_model_name] + self._fallback_chain

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
        """Initialise the Google AI (Gemini) client."""
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
            if not self._initialized:
                print(f"ACTIVE MODEL = {self._gen_model_name}")
                logger.info(f"Google AI client initialised. ACTIVE MODEL = {self._gen_model_name}")
                self._initialized = True
        except ImportError as e:
            raise RuntimeError(
                "google-genai package not found. "
                "Run: pip install google-genai>=1.0.0"
            ) from e
        except Exception as e:
            logger.error(f"Failed to initialise Google AI client: {e}")
            raise RuntimeError(f"Google AI client init failed: {e}") from e

    def _switch_to_next_model(self) -> bool:
        """Switch current model to the next one in the fallback chain."""
        try:
            current_idx = self._fallback_chain.index(self._gen_model_name)
            if current_idx < len(self._fallback_chain) - 1:
                next_model = self._fallback_chain[current_idx + 1]
                print(f"Model {self._gen_model_name} unavailable, switching to {next_model}")
                logger.warning(f"Switching model from {self._gen_model_name} to {next_model}")
                self._gen_model_name = next_model
                return True
        except ValueError:
            if self._fallback_chain:
                self._gen_model_name = self._fallback_chain[0]
                return True
        
        return self._fallback_via_list_models()

    def _fallback_via_list_models(self) -> bool:
        """Query API for available models as a final resort."""
        if not self._genai_client:
            return False
        
        try:
            logger.info("Exhausted fallback chain. Fetching available models from API...")
            available_models = list(self._genai_client.models.list())
            for m in available_models:
                name = m.name if hasattr(m, "name") else str(m)
                if ("gemini" in name.lower() or "gemma" in name.lower()) and "embeddings" not in name.lower():
                    clean_name = name.split("/")[-1]
                    if clean_name != self._gen_model_name:
                        print(f"Found alternative model via API: {clean_name}")
                        self._gen_model_name = clean_name
                        return True
        except Exception as e:
            logger.error(f"Final fallback discovery failed: {e}")
        
        return False

    # ── Public inference methods ─────────────────────────────────────

    def embed_code(self, code: str) -> list[float]:
        """Embed a code/text string using all-MiniLM-L6-v2."""
        return self._embed_model.encode(
            code,
            normalize_embeddings=True,
            show_progress_bar=False,
        ).tolist()

    def embed_query(self, query: str) -> list[float]:
        """Embed a user query string using the same model as embed_code."""
        return self._embed_model.encode(
            query,
            normalize_embeddings=True,
            show_progress_bar=False,
        ).tolist()

    def generate(
        self,
        prompt: str,
        max_new_tokens: int = 512,
        temperature: float = 0.7,
        stream: bool = False,
    ) -> str:
        """Call the reasoning model with fallback capability."""
        if not self._genai_client:
            return "Error: API client not initialized. Check GEMINI_API_KEY."

        max_retries = len(self._fallback_chain) + 2 
        
        for attempt in range(max_retries):
            try:
                print(f"Generating with {self._gen_model_name}...")
                response = self._genai_client.models.generate_content(
                    model=self._gen_model_name,
                    contents=prompt,
                    config={
                        "max_output_tokens": max_new_tokens,
                        "temperature": temperature,
                    }
                )
                
                return response.text if response.text else ""

            except Exception as e:
                err_str = str(e).upper()
                if "404" in err_str or "NOT_FOUND" in err_str or "NOT FOUND" in err_str:
                    logger.warning(f"Model {self._gen_model_name} returned 404/NOT_FOUND.")
                    if self._switch_to_next_model():
                        continue
                
                logger.error(f"Generation failed on attempt {attempt+1} with {self._gen_model_name}: {e}")
                if attempt == max_retries - 1:
                    return f"Error: Generation failed after multiple fallbacks. Last error: {e}"
                
                if self._switch_to_next_model():
                    continue
                else:
                    return f"Error: Generation failed with {self._gen_model_name}: {e}"
        
        return "Error: Generation failed (max retries exceeded)."


# ── Module-level singleton ──────────────────────────────────────────
# Models are loaded once when this module is first imported.
model_manager = ModelManager()
