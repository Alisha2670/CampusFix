import os
from typing import List

class Settings:
    PROJECT_NAME: str = "CampusFix AI Service"
    VERSION: str = "1.0.0"
    PORT: int = int(os.getenv("AI_SERVICE_PORT", "8000"))
    MODEL_NAME: str = os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")
    SIMILARITY_THRESHOLD: float = float(os.getenv("SIMILARITY_THRESHOLD", "0.70"))
    
    ALLOWED_CATEGORIES: List[str] = [
        "Electrical",
        "Plumbing",
        "IT Support",
        "Housekeeping",
        "Infrastructure",
    ]
    
    ALLOWED_PRIORITIES: List[str] = [
        "Low",
        "Medium",
        "High",
        "Urgent",
    ]

settings = Settings()
