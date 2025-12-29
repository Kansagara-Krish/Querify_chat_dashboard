import os
import logging
from typing import List

try:
    from langchain_openai import OpenAIEmbeddings
except Exception:
    OpenAIEmbeddings = None

logger = logging.getLogger(__name__)


class BasicEmbeddings:
    """A very small deterministic fallback embeddings implementation.

    This avoids calling remote APIs so the app can index PDFs offline
    for testing or when no API key is configured.
    """

    def __init__(self, dim: int = 32):
        self.dim = dim

    def _text_to_vector(self, text: str) -> List[float]:
        import hashlib

        h = hashlib.sha256(text.encode("utf-8")).digest()
        vec = []
        for i in range(self.dim):
            b = h[i % len(h)]
            # map byte 0-255 to float -1.0..1.0
            vec.append((b / 127.5) - 1.0)
        return vec

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        return [self._text_to_vector(t) for t in texts]

    def embed_query(self, text: str) -> List[float]:
        return self._text_to_vector(text)
    
    def __call__(self, text: str) -> List[float]:
        """Allow this object to be called like a function for compatibility with FAISS."""
        return self.embed_query(text)


def get_embeddings():
    """Return an embeddings object. Prefer OpenAI/OpenRouter; fallback to BasicEmbeddings."""
    key = os.getenv("OPENROUTER_API_KEY") or os.getenv("OPENAI_API_KEY")
    if key and OpenAIEmbeddings is not None:
        try:
            logger.info("Attempting to use OpenAI/OpenRouter embeddings.")
            return OpenAIEmbeddings(
                openai_api_key=key,
                openai_api_base="https://openrouter.ai/api/v1",
                model="text-embedding-3-large",
            )
        except Exception as e:
            logger.warning("OpenAIEmbeddings initialization failed: %s", e)
    else:
        logger.info("No OpenAI/OpenRouter API key found in environment variables.")

    logger.info("Using BasicEmbeddings fallback.")
    return BasicEmbeddings(dim=32)
