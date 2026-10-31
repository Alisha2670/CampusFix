from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class ComplaintInput(BaseModel):
    complaintId: str
    title: str
    description: str
    category: Optional[str] = None
    location: Optional[Dict[str, Any]] = None

class DuplicateCandidateInput(BaseModel):
    complaintId: str
    title: str
    description: str
    category: str
    status: str

class AnalysisRequest(BaseModel):
    complaint: ComplaintInput
    candidates: List[DuplicateCandidateInput] = Field(default_factory=list)
    threshold: Optional[float] = None

class PossibleDuplicate(BaseModel):
    complaintId: str
    similarity: float

class AnalysisResponseData(BaseModel):
    suggestedCategory: str
    suggestedPriority: str
    possibleDuplicates: List[PossibleDuplicate]
    confidence: float

class HealthResponse(BaseModel):
    status: str
    model: str
    timestamp: str
