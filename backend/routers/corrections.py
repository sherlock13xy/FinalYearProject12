import logging
from collections import Counter
from uuid import uuid4
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database.connection import get_db
from database.models import CorrectionEntry, User
from schemas.corrections import (
    CorrectionCreate,
    CorrectionResponse,
    CorrectionStats,
    RetrainResponse,
)
from modules.sentiment import get_sentiment_analyzer
from auth.deps import require_admin

logger = logging.getLogger(__name__)
router = APIRouter(tags=["corrections"])

RETRAIN_THRESHOLD = 20


@router.post("/corrections", response_model=CorrectionResponse)
def add_correction(
    body: CorrectionCreate,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    entry = CorrectionEntry(
        id=str(uuid4()),
        text=body.text,
        correct_label=body.correct_label,
        model_label=body.model_label,
        keywords=body.keywords or [],
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)

    try:
        get_sentiment_analyzer().apply_single_correction(
            body.text, body.correct_label, body.keywords or []
        )
    except Exception as exc:
        logger.warning(f"Cache update failed (non-fatal): {exc}")

    return entry


@router.get("/corrections", response_model=List[CorrectionResponse])
def list_corrections(
    limit: int = 50,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    return (
        db.query(CorrectionEntry)
        .order_by(CorrectionEntry.created_at.desc())
        .limit(limit)
        .all()
    )


@router.get("/corrections/stats", response_model=CorrectionStats)
def correction_stats(
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    all_entries = db.query(CorrectionEntry).all()
    total = len(all_entries)
    label_breakdown = dict(Counter(e.correct_label for e in all_entries))
    all_keywords = [kw for e in all_entries for kw in (e.keywords or [])]
    top_keywords = [
        {"word": w, "count": c}
        for w, c in Counter(all_keywords).most_common(10)
    ]
    return CorrectionStats(
        total=total,
        retrain_threshold=RETRAIN_THRESHOLD,
        needs_retrain=total >= RETRAIN_THRESHOLD,
        label_breakdown=label_breakdown,
        top_keywords=top_keywords,
    )


@router.delete("/corrections/{correction_id}", status_code=204)
def delete_correction(
    correction_id: str,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    entry = db.query(CorrectionEntry).filter(CorrectionEntry.id == correction_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Correction not found")

    text_to_remove = entry.text
    db.delete(entry)
    db.commit()

    try:
        analyzer = get_sentiment_analyzer()
        analyzer._correction_cache.pop(text_to_remove, None)
    except Exception as exc:
        logger.warning(f"Cache removal failed (non-fatal): {exc}")


@router.get("/corrections/online-status")
def online_status(_admin: User = Depends(require_admin)):
    analyzer = get_sentiment_analyzer()
    count = getattr(analyzer, "_online_sample_count", 0)
    return {"loaded": count > 0, "sample_count": count}


@router.post("/corrections/fetch-online")
def fetch_online(
    samples_per_class: int = 150,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    if samples_per_class < 10 or samples_per_class > 500:
        raise HTTPException(status_code=400, detail="samples_per_class must be between 10 and 500")
    try:
        analyzer = get_sentiment_analyzer()
        report = analyzer.load_online_data(samples_per_class=samples_per_class)
        return {"status": "ok", **report}
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except Exception as exc:
        logger.error(f"Online fetch failed: {exc}")
        raise HTTPException(status_code=500, detail=f"Fetch failed: {exc}")


@router.post("/corrections/retrain", response_model=RetrainResponse)
def retrain_model(
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    entries = db.query(CorrectionEntry).all()
    if not entries:
        raise HTTPException(status_code=400, detail="No corrections available for retraining")

    corrections = [
        {"text": e.text, "correct_label": e.correct_label, "keywords": e.keywords or []}
        for e in entries
    ]
    try:
        analyzer = get_sentiment_analyzer()
        analyzer.retrain_with_corrections(corrections)
    except Exception as exc:
        logger.error(f"Retrain failed: {exc}")
        raise HTTPException(status_code=500, detail=f"Retrain failed: {exc}")

    return RetrainResponse(status="retrained", corrections_used=len(corrections))
