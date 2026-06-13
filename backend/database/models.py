from sqlalchemy import (
    Column,
    String,
    Text,
    Float,
    Integer,
    Boolean,
    DateTime,
    ForeignKey,
)
from sqlalchemy.types import JSON
from datetime import datetime
from uuid import uuid4
from database.connection import Base


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    username = Column(String(50), unique=True, nullable=False)
    email = Column(String(120), unique=True, nullable=True)
    password_hash = Column(String(128), nullable=False)
    role = Column(String(10), nullable=False, default="user")  # "admin" or "user"
    created_at = Column(DateTime, default=datetime.utcnow)


class UserReport(Base):
    __tablename__ = "user_reports"

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    text = Column(Text, nullable=False)
    model_label = Column(String(20), nullable=True)
    user_note = Column(Text, nullable=True)
    status = Column(String(20), nullable=False, default="pending")  # pending/reviewed/fixed
    reported_by = Column(String, ForeignKey("users.id"), nullable=True)
    reporter_username = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    reviewed_at = Column(DateTime, nullable=True)


class CorrectionEntry(Base):
    __tablename__ = "correction_entries"

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    text = Column(Text, nullable=False)
    correct_label = Column(String(20), nullable=False)
    model_label = Column(String(20), nullable=True)
    keywords = Column(JSON, default=list)
    created_at = Column(DateTime, default=datetime.utcnow)


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
