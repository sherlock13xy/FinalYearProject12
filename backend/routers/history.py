from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import desc
from sqlalchemy.orm import Session

from database.connection import get_db
from database.models import AnalysisRecord

router = APIRouter(tags=["history"])


# ---------------------------------------------------------------------------
# List / filter
# ---------------------------------------------------------------------------

@router.get("/history")
def get_history(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    sentiment: Optional[str] = None,
    emotion: Optional[str] = None,
    language: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
):
    query = db.query(AnalysisRecord)

    if sentiment:
        query = query.filter(AnalysisRecord.sentiment_label == sentiment)
    if emotion:
        query = query.filter(AnalysisRecord.emotion_label == emotion)
    if language:
        query = query.filter(AnalysisRecord.detected_language == language)
    if search:
        query = query.filter(AnalysisRecord.original_text.contains(search))

    total = query.count()
    records = (
        query.order_by(desc(AnalysisRecord.created_at))
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    items = []
    for r in records:
        items.append(
            {
                "id": r.id,
                "original_text": r.original_text,
                "detected_language": r.detected_language,
                "language_code": r.language_code,
                "translated_text": r.translated_text,
                "is_translation": r.is_translation,
                "sentiment": {
                    "label": r.sentiment_label,
                    "confidence": r.sentiment_confidence,
                    "probabilities": r.sentiment_probabilities or {},
                },
                "emotion": {
                    "label": r.emotion_label,
                    "confidence": r.emotion_confidence,
                    "scores": r.emotion_scores or {},
                },
                "tone": {
                    "label": r.tone_label,
                    "intensity": r.tone_intensity,
                    "scores": r.tone_scores or {},
                },
                "intent": {
                    "label": r.intent_label,
                    "confidence": r.intent_confidence,
                    "scores": r.intent_scores or {},
                },
                "interpretation": r.interpretation,
                "suggested_response": r.suggested_response,
                "word_count": r.word_count,
                "char_count": r.char_count,
                "processing_time": r.processing_time,
                "mode": r.mode,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
        )

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": (total + page_size - 1) // page_size,
        "items": items,
    }


# ---------------------------------------------------------------------------
# Single record
# ---------------------------------------------------------------------------

@router.get("/history/{record_id}")
def get_history_record(record_id: str, db: Session = Depends(get_db)):
    record = (
        db.query(AnalysisRecord)
        .filter(AnalysisRecord.id == record_id)
        .first()
    )
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")

    return {
        "id": record.id,
        "original_text": record.original_text,
        "detected_language": record.detected_language,
        "translated_text": record.translated_text,
        "sentiment": {
            "label": record.sentiment_label,
            "confidence": record.sentiment_confidence,
            "probabilities": record.sentiment_probabilities or {},
        },
        "emotion": {
            "label": record.emotion_label,
            "confidence": record.emotion_confidence,
            "scores": record.emotion_scores or {},
        },
        "tone": {
            "label": record.tone_label,
            "intensity": record.tone_intensity,
            "scores": record.tone_scores or {},
        },
        "intent": {
            "label": record.intent_label,
            "confidence": record.intent_confidence,
            "scores": record.intent_scores or {},
        },
        "interpretation": record.interpretation,
        "suggested_response": record.suggested_response,
        "processing_time": record.processing_time,
        "mode": record.mode,
        "created_at": record.created_at.isoformat() if record.created_at else None,
    }


# ---------------------------------------------------------------------------
# Delete single
# ---------------------------------------------------------------------------

@router.delete("/history/{record_id}")
def delete_history_record(record_id: str, db: Session = Depends(get_db)):
    record = (
        db.query(AnalysisRecord)
        .filter(AnalysisRecord.id == record_id)
        .first()
    )
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    db.delete(record)
    db.commit()
    return {"message": "Record deleted successfully"}


# ---------------------------------------------------------------------------
# Clear all history
# ---------------------------------------------------------------------------

@router.delete("/history")
def clear_history(db: Session = Depends(get_db)):
    db.query(AnalysisRecord).delete()
    db.commit()
    return {"message": "History cleared successfully"}
