import os
import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from database.connection import get_db, SessionLocal
from database.models import User, AnalysisRecord, CorrectionEntry, UserReport
from auth.deps import require_admin
from config import settings

logger = logging.getLogger(__name__)
router = APIRouter(tags=["admin"])

_STORAGE_LIMIT_BYTES = 500 * 1024 * 1024  # 500 MB soft cap for gauge


def _db_file_size() -> int:
    """Return the SQLite file size in bytes, or 0 if not determinable."""
    url = settings.DATABASE_URL
    path = url.replace("sqlite:///", "").replace("sqlite://", "")
    # Resolve relative paths from the backend working directory
    if not os.path.isabs(path):
        path = os.path.join(os.getcwd(), path.lstrip("./"))
    try:
        return os.path.getsize(path)
    except OSError:
        return 0


@router.get("/admin/stats")
def admin_stats(
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    # ── User counts ─────────────────────────────────────────────────────────
    total_users   = db.query(func.count(User.id)).scalar() or 0
    admin_count   = db.query(func.count(User.id)).filter(User.role == "admin").scalar() or 0
    regular_count = total_users - admin_count

    users_list = (
        db.query(User)
        .order_by(User.created_at.desc())
        .all()
    )

    # ── Record counts ────────────────────────────────────────────────────────
    analysis_count   = db.query(func.count(AnalysisRecord.id)).scalar() or 0
    correction_count = db.query(func.count(CorrectionEntry.id)).scalar() or 0
    report_count     = db.query(func.count(UserReport.id)).scalar() or 0
    total_records    = analysis_count + correction_count + report_count

    # ── Storage ─────────────────────────────────────────────────────────────
    db_bytes  = _db_file_size()
    db_mb     = round(db_bytes / (1024 * 1024), 2)
    usage_pct = min(round(db_bytes / _STORAGE_LIMIT_BYTES * 100, 1), 100.0)

    return {
        "users": {
            "total":         total_users,
            "admins":        admin_count,
            "regular_users": regular_count,
            "list": [
                {
                    "id":         u.id,
                    "username":   u.username,
                    "email":      u.email,
                    "role":       u.role,
                    "is_active":  getattr(u, 'is_active', True),
                    "created_at": u.created_at.isoformat() if u.created_at else None,
                }
                for u in users_list
            ],
        },
        "storage": {
            "db_size_bytes":    db_bytes,
            "db_size_mb":       db_mb,
            "limit_mb":         round(_STORAGE_LIMIT_BYTES / (1024 * 1024)),
            "usage_pct":        usage_pct,
            "analysis_records": analysis_count,
            "correction_entries": correction_count,
            "user_reports":     report_count,
            "total_records":    total_records,
        },
    }


@router.patch("/admin/users/{user_id}/restrict")
def toggle_restrict_user(
    user_id: str,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot restrict your own account")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = not getattr(user, 'is_active', True)
    db.commit()
    return {"id": user.id, "username": user.username, "is_active": user.is_active}


@router.delete("/admin/users/{user_id}", status_code=200)
def delete_user(
    user_id: str,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    username = user.username
    db.delete(user)
    db.commit()
    return {"deleted": username}


@router.delete("/admin/clear-analysis", status_code=200)
def clear_analysis_records(
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    """Delete all analysis records to free up storage."""
    deleted = db.query(AnalysisRecord).delete()
    db.commit()
    logger.info(f"Admin cleared {deleted} analysis records")
    return {"deleted": deleted, "message": f"Cleared {deleted} analysis records"}


@router.delete("/admin/clear-all", status_code=200)
def clear_all_data(
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    """Delete all analysis records, corrections and reports (keeps users)."""
    a = db.query(AnalysisRecord).delete()
    c = db.query(CorrectionEntry).delete()
    r = db.query(UserReport).delete()
    db.commit()
    logger.info(f"Admin full clear: {a} analyses, {c} corrections, {r} reports deleted")
    return {"deleted": a + c + r, "analysis": a, "corrections": c, "reports": r}
