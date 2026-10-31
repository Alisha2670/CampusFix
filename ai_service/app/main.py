from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from datetime import datetime, timezone
import logging

from app.config import settings
from app.services.embedding_service import EmbeddingService
from app.schemas.analysis_schema import HealthResponse
from app.routes.analysis import router as analysis_router

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("ai_service")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing CampusFix AI Service...")
    # Pre-load embedding model during startup
    try:
        EmbeddingService.get_instance().load_model(settings.MODEL_NAME)
    except Exception as e:
        logger.error(f"Failed to pre-load embedding model: {e}")
    yield
    logger.info("Shutting down CampusFix AI Service...")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analysis_router)

@app.get("/health", response_model=HealthResponse)
async def health_check():
    embedding_service = EmbeddingService.get_instance()
    return HealthResponse(
        status="healthy" if embedding_service.is_loaded() else "degraded",
        model=settings.MODEL_NAME,
        timestamp=datetime.now(timezone.utc).isoformat()
    )
