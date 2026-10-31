import numpy as np
from typing import List
from app.services.embedding_service import EmbeddingService
from app.schemas.analysis_schema import DuplicateCandidateInput, PossibleDuplicate
from app.config import settings

class DuplicateService:
    @staticmethod
    def find_duplicates(
        new_title: str,
        new_description: str,
        candidates: List[DuplicateCandidateInput],
        threshold: float = settings.SIMILARITY_THRESHOLD
    ) -> List[PossibleDuplicate]:
        """
        Computes cosine similarity between the incoming complaint and candidate complaints.
        Returns candidates exceeding the similarity threshold sorted by score descending.
        """
        if not candidates:
            return []

        embedding_service = EmbeddingService.get_instance()

        # Combine title and description for rich semantic representation
        new_text = f"{new_title.strip()}. {new_description.strip()}"
        candidate_texts = [
            f"{c.title.strip()}. {c.description.strip()}" for c in candidates
        ]

        # Generate normalized dense embeddings (unit vectors)
        all_texts = [new_text] + candidate_texts
        embeddings = embedding_service.encode(all_texts)

        new_vec = embeddings[0]
        candidate_vecs = embeddings[1:]

        # For unit-normalized vectors, cosine similarity is simply the dot product
        similarities = np.dot(candidate_vecs, new_vec)

        duplicates: List[PossibleDuplicate] = []
        for candidate, sim in zip(candidates, similarities):
            sim_score = float(sim)
            if sim_score >= threshold:
                duplicates.append(
                    PossibleDuplicate(
                        complaintId=candidate.complaintId,
                        similarity=round(sim_score, 4)
                    )
                )

        # Sort highest similarity first
        duplicates.sort(key=lambda d: d.similarity, reverse=True)
        return duplicates

