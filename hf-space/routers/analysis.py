import logging

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session

from database.connection import get_db
from database.models import AnalysisRecord
from schemas.analysis import AnalysisRequest, SingleAnalysisResponse
from modules.pipeline import analyze_text

logger = logging.getLogger(__name__)
router = APIRouter(tags=["analysis"])


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

def save_analysis_to_db(
    db: Session,
    result: dict,
    mode: str = "single",
    batch_id: str = None,
) -> None:
    """Persist a pipeline result dict to the database."""
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
            mode=mode,
            batch_id=batch_id,
        )
        db.add(record)
        db.commit()
    except Exception as e:
        logger.error(f"Failed to save analysis to DB: {e}")
        db.rollback()


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.post("/analyze", response_model=SingleAnalysisResponse)
def analyze_single(
    request: AnalysisRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")

    if len(request.text) > 5000:
        raise HTTPException(
            status_code=400, detail="Text too long (max 5 000 characters)"
        )

    try:
        result = analyze_text(request.text, mode="single")
        background_tasks.add_task(save_analysis_to_db, db, result, "single")
        return result
    except Exception as e:
        logger.error(f"Analysis failed: {e}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")
