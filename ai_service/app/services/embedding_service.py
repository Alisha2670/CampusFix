from sentence_transformers import SentenceTransformer
import numpy as np
from typing import List, Optional
import logging

logger = logging.getLogger("ai_service.embeddings")

class EmbeddingService:
    _instance: Optional["EmbeddingService"] = None
    _model: Optional[SentenceTransformer] = None

    @classmethod
    def get_instance(cls) -> "EmbeddingService":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def load_model(self, model_name: str = "all-MiniLM-L6-v2") -> None:
        if self._model is None:
            logger.info(f"Loading SentenceTransformer model '{model_name}' into memory...")
            self._model = SentenceTransformer(model_name)
            logger.info("SentenceTransformer model loaded successfully.")

    def is_loaded(self) -> bool:
        return self._model is not None

    def encode(self, texts: List[str]) -> np.ndarray:
        if self._model is None:
            self.load_model()
        return self._model.encode(
            texts,
            convert_to_numpy=True,
            normalize_embeddings=True,
            show_progress_bar=False
        )
