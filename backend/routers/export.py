from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from modules.pdf_generator import generate_url_analysis_pdf, generate_single_analysis_pdf, generate_bulk_analysis_pdf
from datetime import datetime
import logging

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/export-pdf")
def export_url_analysis_pdf(data: dict):
    try:
        pdf_bytes = generate_url_analysis_pdf(data)
    except Exception as e:
        logger.error(f"URL analysis PDF generation failed: {e}")
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {e}")
    platform  = data.get("post", {}).get("platform", "analysis")
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename  = f"sentiment_report_{platform}_{timestamp}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.post("/export-pdf/single")
def export_single_analysis_pdf(data: dict):
    try:
        pdf_bytes = generate_single_analysis_pdf(data)
    except Exception as e:
        logger.error(f"Single analysis PDF generation failed: {e}")
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {e}")
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename  = f"sentiment_report_single_{timestamp}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.post("/export-pdf/bulk")
def export_bulk_analysis_pdf(data: dict):
    try:
        pdf_bytes = generate_bulk_analysis_pdf(data)
    except Exception as e:
        logger.error(f"Bulk analysis PDF generation failed: {e}")
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {e}")
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename  = f"sentiment_report_bulk_{timestamp}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
