from sqlalchemy import (
    Column,
    String,
    Text,
    Float,
    Integer,
    Boolean,
    DateTime,
)
from sqlalchemy.types import JSON
from datetime import datetime
from uuid import uuid4
from database.connection import Base


class AnalysisRecord(Base):
    __tablename__ = "analysis_records"

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    original_text = Column(Text, nullable=False)
    detected_language = Column(String(50))
    language_code = Column(String(10))
    translated_text = Column(Text)
    is_translation = Column(Boolean, default=False)

    sentiment_label = Column(String(20))
    sentiment_confidence = Column(Float)
    sentiment_probabilities = Column(JSON)

    emotion_label = Column(String(30))
    emotion_confidence = Column(Float)
    emotion_scores = Column(JSON)

    tone_label = Column(String(30))
    tone_intensity = Column(Float)
    tone_scores = Column(JSON)

    intent_label = Column(String(30))
    intent_confidence = Column(Float)
    intent_scores = Column(JSON)

    interpretation = Column(Text)
    suggested_response = Column(Text)

    word_count = Column(Integer)
    char_count = Column(Integer)
    processing_time = Column(Float)

    mode = Column(String(10), default="single")  # single or bulk
    batch_id = Column(String, nullable=True)  # for bulk analyses

    created_at = Column(DateTime, default=datetime.utcnow)
