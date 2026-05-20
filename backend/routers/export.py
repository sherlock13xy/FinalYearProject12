from fastapi import APIRouter
from fastapi.responses import Response
from modules.pdf_generator import generate_url_analysis_pdf, generate_single_analysis_pdf, generate_bulk_analysis_pdf
from datetime import datetime

router = APIRouter()


@router.post("/export-pdf")
def export_url_analysis_pdf(data: dict):
    pdf_bytes = generate_url_analysis_pdf(data)
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
    pdf_bytes = generate_single_analysis_pdf(data)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename  = f"sentiment_report_single_{timestamp}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.post("/export-pdf/bulk")
def export_bulk_analysis_pdf(data: dict):
    pdf_bytes = generate_bulk_analysis_pdf(data)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename  = f"sentiment_report_bulk_{timestamp}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
