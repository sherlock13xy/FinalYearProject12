from pydantic import BaseModel
from typing import Optional


class SentimentResult(BaseModel):
    label: str  # positive/negative/neutral
    confidence: float
    probabilities: dict[str, float]  # {positive: 0.8, negative: 0.1, neutral: 0.1}


class SarcasmResult(BaseModel):
    detected: bool
    confidence: float


class EmotionResult(BaseModel):
    label: str
    confidence: float
    scores: dict[str, float]


class ToneResult(BaseModel):
    label: str
    intensity: float  # 0.0-1.0
    scores: dict[str, float]


class IntentResult(BaseModel):
    label: str
    confidence: float
    scores: dict[str, float]


class AnalysisRequest(BaseModel):
    text: str
    mode: str = "single"  # single or bulk


class BulkAnalysisRequest(BaseModel):
    texts: list[str]


class SingleAnalysisResponse(BaseModel):
    id: str
    original_text: str
    detected_language: str
    language_code: str
    translated_text: str
    is_translation: bool
    sentiment: SentimentResult
    sarcasm: SarcasmResult
    emotion: EmotionResult
    tone: ToneResult
    intent: IntentResult
    interpretation: str
    suggested_response: str
    processing_time: float
    timestamp: str
    word_count: int
    char_count: int


class BulkAnalysisItem(BaseModel):
    row_number: int
    original_text: str
    detected_language: str
    translated_text: str
    sentiment: SentimentResult
    sarcasm: Optional[SarcasmResult] = None
    emotion: EmotionResult
    tone: ToneResult
    intent: IntentResult
    interpretation: str
    suggested_response: str
    processing_time: float


class BulkAnalysisResponse(BaseModel):
    total: int
    items: list[BulkAnalysisItem]
    aggregate: dict  # summary stats
    processing_time: float


class AnalyticsResponse(BaseModel):
    total_analyzed: int
    sentiment_distribution: dict[str, int]
    emotion_distribution: dict[str, int]
    tone_distribution: dict[str, int]
    intent_distribution: dict[str, int]
    language_distribution: dict[str, int]
    average_confidence: float
    trend_data: list[dict]
    top_words: list[dict]
    recent_reviews: list[dict]
    ai_insight: str
    dominant_sentiment: str
    dominant_emotion: str
    dominant_tone: str
    dominant_intent: str
