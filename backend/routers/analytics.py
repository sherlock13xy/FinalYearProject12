from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database.connection import get_db
from modules.analytics import get_analytics
from schemas.analysis import AnalyticsResponse

router = APIRouter(tags=["analytics"])


@router.get("/analytics", response_model=AnalyticsResponse)
def get_dashboard_analytics(db: Session = Depends(get_db)):
    """Return aggregated analytics for the dashboard."""
    return get_analytics(db)
