import io
import time
import uuid
import logging
from collections import Counter

import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session

from database.connection import get_db
from database.models import AnalysisRecord
from schemas.analysis import BulkAnalysisRequest, BulkAnalysisResponse
from modules.pipeline import analyze_text

logger = logging.getLogger(__name__)
router = APIRouter(tags=["bulk"])


# ---------------------------------------------------------------------------
# Bulk analysis from JSON body
# ---------------------------------------------------------------------------

@router.post("/bulk-analyze", response_model=BulkAnalysisResponse)
def bulk_analyze(request: BulkAnalysisRequest, db: Session = Depends(get_db)):
    if not request.texts:
        raise HTTPException(status_code=400, detail="No texts provided")

    if len(request.texts) > 100:
        raise HTTPException(
            status_code=400, detail="Maximum 100 texts per bulk request"
        )

    batch_id = str(uuid.uuid4())
    items: list[dict] = []
    batch_start = time.time()

    for idx, text in enumerate(request.texts):
        if not text.strip():
            continue

        try:
            result = analyze_text(text.strip(), mode="bulk")
            item = {
                "row_number": idx + 1,
                "original_text": result["original_text"],
                "detected_language": result["detected_language"],
                "translated_text": result["translated_text"],
                "sentiment": result["sentiment"],
                "emotion": result["emotion"],
                "tone": result["tone"],
                "intent": result["intent"],
                "interpretation": result["interpretation"],
                "suggested_response": result["suggested_response"],
                "processing_time": result["processing_time"],
            }
            items.append(item)

            # Persist record
            try:
                record = AnalysisRecord(
                    id=result["id"],
                    original_text=result["original_text"],
                    detected_language=result["detected_language"],
                    language_code=result["language_code"],
                    translated_text=result["translated_text"],
                    is_translation=result["is_translation"],
                    sentiment_label=result["sentiment"]["label"],
                    sentiment_confidence=result["sentiment"]["confidence"],
                    sentiment_probabilities=result["sentiment"]["probabilities"],
                    emotion_label=result["emotion"]["label"],
                    emotion_confidence=result["emotion"]["confidence"],
                    emotion_scores=result["emotion"]["scores"],
                    tone_label=result["tone"]["label"],
                    tone_intensity=result["tone"]["intensity"],
                    tone_scores=result["tone"]["scores"],
                    intent_label=result["intent"]["label"],
                    intent_confidence=result["intent"]["confidence"],
                    intent_scores=result["intent"]["scores"],
                    interpretation=result["interpretation"],
                    suggested_response=result["suggested_response"],
                    word_count=result["word_count"],
                    char_count=result["char_count"],
                    processing_time=result["processing_time"],
                    mode="bulk",
                    batch_id=batch_id,
                )
                db.add(record)
            except Exception as db_err:
                logger.error(f"Failed to stage record {idx}: {db_err}")

        except Exception as e:
            logger.error(f"Failed to analyze text at index {idx}: {e}")
            items.append(
                {
                    "row_number": idx + 1,
                    "original_text": text,
                    "detected_language": "Unknown",
                    "translated_text": text,
                    "sentiment": {
                        "label": "neutral",
                        "confidence": 0.0,
                        "probabilities": {},
                    },
                    "emotion": {"label": "Neutral", "confidence": 0.0, "scores": {}},
                    "tone": {"label": "unknown", "intensity": 0.0, "scores": {}},
                    "intent": {"label": "unknown", "confidence": 0.0, "scores": {}},
                    "interpretation": f"Analysis failed: {str(e)}",
                    "suggested_response": "Unable to generate response.",
                    "processing_time": 0.0,
                }
            )

    try:
        db.commit()
    except Exception as e:
        logger.error(f"Failed to commit bulk records: {e}")
        db.rollback()

    # Aggregate statistics
    sentiments = [item["sentiment"]["label"] for item in items]
    emotions = [item["emotion"]["label"] for item in items]
    tones = [item["tone"]["label"] for item in items]
    intents = [item["intent"]["label"] for item in items]

    aggregate = {
        "sentiment_distribution": dict(Counter(sentiments)),
        "emotion_distribution": dict(Counter(emotions)),
        "tone_distribution": dict(Counter(tones)),
        "intent_distribution": dict(Counter(intents)),
        "dominant_sentiment": (
            Counter(sentiments).most_common(1)[0][0] if sentiments else "neutral"
        ),
        "dominant_emotion": (
            Counter(emotions).most_common(1)[0][0] if emotions else "Neutral"
        ),
        "dominant_tone": (
            Counter(tones).most_common(1)[0][0] if tones else "professional"
        ),
        "dominant_intent": (
            Counter(intents).most_common(1)[0][0] if intents else "feedback"
        ),
        "average_confidence": (
            round(
                sum(item["sentiment"]["confidence"] for item in items) / len(items),
                4,
            )
            if items
            else 0.0
        ),
    }

    return {
        "total": len(items),
        "items": items,
        "aggregate": aggregate,
        "processing_time": round(time.time() - batch_start, 3),
    }


# ---------------------------------------------------------------------------
# CSV upload helper endpoint
# ---------------------------------------------------------------------------

@router.post("/upload-csv")
async def upload_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    if not (file.filename or "").endswith(".csv"):
        raise HTTPException(
            status_code=400, detail="Only CSV files are supported"
        )

    contents = await file.read()

    # Try UTF-8, fall back to latin-1
    try:
        df = pd.read_csv(io.StringIO(contents.decode("utf-8")))
    except Exception:
        try:
            df = pd.read_csv(io.StringIO(contents.decode("latin-1")))
        except Exception as e:
            raise HTTPException(
                status_code=400, detail=f"Failed to parse CSV: {str(e)}"
            )

    # Identify the text column heuristically
    text_col: str | None = None
    for col in ("text", "review", "comment", "feedback", "content", "message"):
        if col in df.columns:
            text_col = col
            break

    if text_col is None:
        text_col = df.columns[0]

    texts: list[str] = df[text_col].dropna().astype(str).tolist()

    # Cap at 500 rows
    if len(texts) > 500:
        texts = texts[:500]

    return {"texts": texts, "total": len(texts), "column_used": text_col}
