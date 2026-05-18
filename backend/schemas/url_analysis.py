from pydantic import BaseModel, field_validator
from schemas.analysis import BulkAnalysisItem


class URLAnalysisRequest(BaseModel):
    url: str
    max_comments: int = 50

    @field_validator("url")
    @classmethod
    def url_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("URL cannot be empty.")
        return v.strip()

    @field_validator("max_comments")
    @classmethod
    def clamp(cls, v: int) -> int:
        return max(5, min(v, 100))


class PostMetadata(BaseModel):
    platform: str
    title: str
    author: str
    url: str
    fetched_comments: int
    total_available: int


class URLAnalysisResponse(BaseModel):
    post: PostMetadata
    total: int
    items: list[BulkAnalysisItem]
    aggregate: dict
    processing_time: float
