from pydantic_settings import BaseSettings
from typing import List
import torch


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./sentiment_platform.db"
    MODEL_CACHE_DIR: str = "./model_cache"
    DEVICE: str = "auto"
    MAX_TEXT_LENGTH: int = 512
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
    ]
    LOG_LEVEL: str = "INFO"
    JWT_SECRET: str = "sentimentiq-super-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_DAYS: int = 7

    # URL analysis — requires YouTube Data API v3 key
    YOUTUBE_API_KEY: str = ""

    # Instagram credentials for comment fetching (public posts only)
    INSTAGRAM_USERNAME: str = ""
    INSTAGRAM_PASSWORD: str = ""
    INSTAGRAM_SESSION_ID: str = ""

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()

if settings.DEVICE == "auto":
    settings.DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
