import logging
from datetime import datetime
from typing import List, Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database.connection import get_db
from database.models import UserReport, CorrectionEntry, AnalysisRecord
from schemas.reports import ReportCreate, ReportResponse, ReportReview
from auth.deps import get_current_user, require_admin, get_optional_user
from database.models import User
from modules.sentiment import get_sentiment_analyzer

logger = logging.getLogger(__name__)
router = APIRouter(tags=["reports"])


@router.post("/reports", response_model=ReportResponse, status_code=201)
def submit_report(
    body: ReportCreate,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    report = UserReport(
        id=str(uuid4()),
        text=body.text,
        model_label=body.model_label,
        user_note=body.user_note,
        status="pending",
        reported_by=current_user.id if current_user else None,
        reporter_username=current_user.username if current_user else "anonymous",
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return report


@router.get("/reports", response_model=List[ReportResponse])
def list_reports(
    status: Optional[str] = None,
    limit: int = 50,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    q = db.query(UserReport)
    if status:
        q = q.filter(UserReport.status == status)
    return q.order_by(UserReport.created_at.desc()).limit(limit).all()


@router.get("/reports/stats")
def report_stats(
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    total = db.query(UserReport).count()
    pending = db.query(UserReport).filter(UserReport.status == "pending").count()
    reviewed = db.query(UserReport).filter(UserReport.status == "reviewed").count()
    fixed = db.query(UserReport).filter(UserReport.status == "fixed").count()
    return {"total": total, "pending": pending, "reviewed": reviewed, "fixed": fixed}


@router.patch("/reports/{report_id}", response_model=ReportResponse)
def review_report(
    report_id: str,
    body: ReportReview,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    report = db.query(UserReport).filter(UserReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    report.status = body.status
    report.reviewed_at = datetime.utcnow()

    # If admin marks as fixed and provides a correct label, auto-create a correction
    if body.status == "fixed" and body.correct_label:
        entry = CorrectionEntry(
            id=str(uuid4()),
            text=report.text,
            correct_label=body.correct_label,
            model_label=report.model_label,
            keywords=body.keywords or [],
        )
        db.add(entry)

        # Update all historical AnalysisRecord rows that match this text so
        # the History page immediately reflects the correct label.
        matching_records = (
            db.query(AnalysisRecord)
            .filter(AnalysisRecord.original_text == report.text)
            .all()
        )
        for record in matching_records:
            record.sentiment_label = body.correct_label
            record.sentiment_confidence = 0.94
            old_probs = record.sentiment_probabilities or {}
            old_probs = {k: 0.03 for k in ("positive", "negative", "neutral")}
            old_probs[body.correct_label] = 0.94
            record.sentiment_probabilities = old_probs
        if matching_records:
            logger.info(
                f"Updated {len(matching_records)} AnalysisRecord(s) with corrected label '{body.correct_label}'"
            )

        # Update in-memory correction cache for immediate effect on new analyses.
        try:
            get_sentiment_analyzer().apply_single_correction(
                report.text, body.correct_label, body.keywords or []
            )
        except Exception as exc:
            logger.warning(f"Cache update failed (non-fatal): {exc}")

    db.commit()
    db.refresh(report)
    return report


@router.delete("/reports/{report_id}", status_code=204)
def delete_report(
    report_id: str,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    report = db.query(UserReport).filter(UserReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    db.delete(report)
    db.commit()
