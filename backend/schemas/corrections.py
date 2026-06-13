from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class CorrectionCreate(BaseModel):
    text: str = Field(..., min_length=1, max_length=5000)
    correct_label: str = Field(..., pattern="^(positive|negative|neutral)$")
    model_label: Optional[str] = None
    keywords: Optional[List[str]] = []


class CorrectionResponse(BaseModel):
    id: str
    text: str
    correct_label: str
    model_label: Optional[str]
    keywords: Optional[List[str]]
    created_at: datetime

    class Config:
        from_attributes = True


class CorrectionStats(BaseModel):
    total: int
    retrain_threshold: int
    needs_retrain: bool
    label_breakdown: dict
    top_keywords: List[dict]
    last_retrain: Optional[datetime] = None


class RetrainResponse(BaseModel):
    status: str
    corrections_used: int
