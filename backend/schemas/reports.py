from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class ReportCreate(BaseModel):
    text: str = Field(..., min_length=1, max_length=5000)
    model_label: Optional[str] = None
    user_note: Optional[str] = Field(None, max_length=1000)


class ReportResponse(BaseModel):
    id: str
    text: str
    model_label: Optional[str]
    user_note: Optional[str]
    status: str
    reporter_username: Optional[str]
    created_at: datetime
    reviewed_at: Optional[datetime]

    class Config:
        from_attributes = True


class ReportReview(BaseModel):
    status: str = Field(..., pattern="^(reviewed|fixed)$")
    correct_label: Optional[str] = Field(None, pattern="^(positive|negative|neutral)$")
    keywords: Optional[list] = []
