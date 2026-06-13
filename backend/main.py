import os
import warnings

# Must be set before any HuggingFace imports to prevent network checks when
# all models are already cached locally.
os.environ.setdefault("HF_HUB_OFFLINE", "0")
os.environ.setdefault("TRANSFORMERS_OFFLINE", "0")
warnings.filterwarnings("ignore", category=FutureWarning, module="huggingface_hub")
warnings.filterwarnings("ignore", category=UserWarning, message=".*resume_download.*")
warnings.filterwarnings("ignore", category=UserWarning, message=".*_register_pytree_node.*")

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from database.connection import init_db
from routers import analysis, bulk, analytics, history, url_analysis, export, corrections, auth, reports
from config import settings
import logging

logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
# Suppress verbose deprecation noise from transformers model configs
logging.getLogger("transformers.configuration_utils").setLevel(logging.ERROR)
logging.getLogger("transformers.modeling_utils").setLevel(logging.ERROR)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting Sentiment Intelligence Platform...")
    init_db()
    logger.info("Database initialized")
    try:
        from modules.pipeline import initialize_models
        initialize_models()
    except Exception as e:
        logger.warning(f"Model initialization deferred: {e}")
    yield
    logger.info("Shutting down...")


app = FastAPI(
    title="Sentiment Intelligence Platform API",
    description="AI-powered multilingual sentiment analysis platform",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)

app.include_router(analysis.router, prefix="/api/v1")
app.include_router(bulk.router, prefix="/api/v1")
app.include_router(analytics.router, prefix="/api/v1")
app.include_router(history.router, prefix="/api/v1")
app.include_router(url_analysis.router, prefix="/api/v1")
app.include_router(export.router, prefix="/api/v1")
app.include_router(corrections.router, prefix="/api/v1")
app.include_router(auth.router, prefix="/api/v1")
app.include_router(reports.router, prefix="/api/v1")


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "version": "1.0.0",
        "service": "Sentiment Intelligence Platform",
    }


@app.get("/")
def root():
    return {
        "name": "Sentiment Intelligence Platform",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health",
    }


@app.exception_handler(ValueError)
async def value_error_handler(request: Request, exc: ValueError):
    return JSONResponse(status_code=400, content={"detail": str(exc)})


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}")
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})
