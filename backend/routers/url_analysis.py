import time
import uuid
import logging
from collections import Counter

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database.connection import get_db
from database.models import AnalysisRecord
from schemas.url_analysis import URLAnalysisRequest, URLAnalysisResponse
from modules.pipeline import analyze_text
from modules.url_fetcher import fetch_comments

logger = logging.getLogger(__name__)
router = APIRouter(tags=["url_analysis"])


@router.post("/analyze-url", response_model=URLAnalysisResponse)
def analyze_url(request: URLAnalysisRequest, db: Session = Depends(get_db)):
    start = time.time()

    # Step 1: fetch comments from YouTube / Reddit
    try:
        fetched = fetch_comments(request.url, request.max_comments)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        logger.error(f"Comment fetch error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch comments: {e}")

    comments = fetched["comments"]
    if not comments:
        raise HTTPException(status_code=404, detail="No comments found for this post.")

    # Step 2: run each comment through the existing pipeline
    batch_id = str(uuid.uuid4())
    items: list[dict] = []

    for idx, text in enumerate(comments):
        try:
            result = analyze_text(text, mode="bulk")
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

            try:
                db.add(AnalysisRecord(
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
                    mode="url",
                    batch_id=batch_id,
                ))
            except Exception as db_err:
                logger.error(f"DB stage failed for comment {idx}: {db_err}")

        except Exception as e:
            logger.error(f"Pipeline failed for comment {idx}: {e}")
            items.append({
                "row_number": idx + 1,
                "original_text": text,
                "detected_language": "Unknown",
                "translated_text": text,
                "sentiment": {"label": "neutral", "confidence": 0.0, "probabilities": {}},
                "emotion": {"label": "Neutral", "confidence": 0.0, "scores": {}},
                "tone": {"label": "unknown", "intensity": 0.0, "scores": {}},
                "intent": {"label": "unknown", "confidence": 0.0, "scores": {}},
                "interpretation": f"Analysis failed: {e}",
                "suggested_response": "",
                "processing_time": 0.0,
            })

    try:
        db.commit()
    except Exception as e:
        logger.error(f"Bulk commit failed: {e}")
        db.rollback()

    # Step 3: aggregate
    sentiments = [i["sentiment"]["label"] for i in items]
    emotions   = [i["emotion"]["label"]   for i in items]
    tones      = [i["tone"]["label"]      for i in items]
    intents    = [i["intent"]["label"]    for i in items]

    def dominant(lst: list[str], fallback: str) -> str:
        return Counter(lst).most_common(1)[0][0] if lst else fallback

    aggregate = {
        "sentiment_distribution": dict(Counter(sentiments)),
        "emotion_distribution":   dict(Counter(emotions)),
        "tone_distribution":      dict(Counter(tones)),
        "intent_distribution":    dict(Counter(intents)),
        "dominant_sentiment": dominant(sentiments, "neutral"),
        "dominant_emotion":   dominant(emotions,   "Neutral"),
        "dominant_tone":      dominant(tones,      "professional"),
        "dominant_intent":    dominant(intents,    "feedback"),
        "average_confidence": round(
            sum(i["sentiment"]["confidence"] for i in items) / len(items), 4
        ) if items else 0.0,
    }

    return {
        "post": {
            "platform":         fetched["platform"],
            "title":            fetched["title"],
            "author":           fetched["author"],
            "url":              request.url,
            "fetched_comments": len(items),
            "total_available":  fetched["total_available"],
        },
        "total":           len(items),
        "items":           items,
        "aggregate":       aggregate,
        "processing_time": round(time.time() - start, 3),
    }
