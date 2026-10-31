from fastapi import APIRouter, HTTPException
import logging

from app.schemas.analysis_schema import AnalysisRequest, AnalysisResponseData
from app.services.classifier_service import ClassifierService
from app.services.duplicate_service import DuplicateService
from app.config import settings

logger = logging.getLogger("ai_service.routes.analysis")

router = APIRouter(prefix="/analyze", tags=["analysis"])

@router.post("", response_model=AnalysisResponseData)
async def analyze_complaint(request: AnalysisRequest):
    """
    Analyzes an incoming complaint:
    1. Predicts optimal facility category via NLP intent matching.
    2. Determines urgency priority level with safety hazard heuristics.
    3. Computes 384-dimensional cosine similarity to flag semantic duplicates.
    """
    try:
        complaint = request.complaint
        candidates = request.candidates

        logger.info(f"Analyzing complaint {complaint.complaintId}: '{complaint.title}'")

        # 1. Category & Priority Classification
        suggested_category, suggested_priority, confidence = ClassifierService.analyze_complaint(
            title=complaint.title,
            description=complaint.description,
            user_category=complaint.category
        )

        # 2. Duplicate Detection via Cosine Similarity
        effective_threshold = request.threshold if request.threshold is not None else settings.SIMILARITY_THRESHOLD
        possible_duplicates = DuplicateService.find_duplicates(
            new_title=complaint.title,
            new_description=complaint.description,
            candidates=candidates,
            threshold=effective_threshold
        )

        logger.info(
            f"Analysis complete for {complaint.complaintId}: "
            f"category={suggested_category}, priority={suggested_priority}, "
            f"duplicates_found={len(possible_duplicates)}"
        )

        return AnalysisResponseData(
            suggestedCategory=suggested_category,
            suggestedPriority=suggested_priority,
            possibleDuplicates=possible_duplicates,
            confidence=confidence
        )
    except Exception as e:
        logger.error(f"Error analyzing complaint: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
