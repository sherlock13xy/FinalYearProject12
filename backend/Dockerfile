FROM python:3.11-slim

# Install system build dependencies
RUN apt-get update && apt-get install -y \
    gcc g++ libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# HuggingFace Spaces requires a non-root user with uid 1000
RUN useradd -m -u 1000 user

WORKDIR /app

# Install Python dependencies (as root so packages go into system Python)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code and set ownership
COPY . .
RUN chown -R user:user /app

USER user

ENV HOME=/home/user \
    DATABASE_URL=sqlite:///./sentiment_platform.db \
    MODEL_CACHE_DIR=/home/user/.cache/huggingface \
    DEVICE=cpu \
    LOG_LEVEL=INFO

# HuggingFace Spaces exposes port 7860
EXPOSE 7860

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
