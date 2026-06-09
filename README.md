# Sentiment Intelligence Platform
### AI-Powered Multilingual Sentiment Analysis with Social Media Integration
**BERT · Twitter-RoBERTa · Logistic Regression · FastAPI · React · YouTube & Instagram**

---

## Overview

A full-stack NLP analytics platform that analyzes reviews, tweets, comments, and feedback across 20+ languages. Input text directly, upload a CSV, or paste a YouTube or Instagram URL to automatically pull and analyze comments. Produces sentiment polarity, emotion classification, tone, intent, sarcasm detection, a contextual interpretation, and a suggested response — all surfaced in a live React dashboard.

---

## Core Capabilities

| Feature | Model / Technology |
|---|---|
| Language Detection | `langdetect` — 23 languages + Hinglish heuristics |
| Translation to English | MarianMT (Helsinki-NLP) — 12 language-specific + multilingual fallback |
| Sentiment Analysis | DistilBERT-multilingual + Twitter-RoBERTa ensemble (35 / 65 weight split) |
| Sarcasm Detection | `cardiffnlp/twitter-roberta-base-irony` — threshold 0.70 with sentiment flip |
| Emotion Classification | `j-hartmann/emotion-english-distilroberta-base` (GoEmotions) |
| Tone Detection | Zero-shot NLI — `typeform/distilbert-base-uncased-mnli` |
| Intent Detection | Zero-shot NLI — `typeform/distilbert-base-uncased-mnli` |
| Sentiment–Emotion Alignment | Post-processing layer to remove contradictions (e.g. Joy on Negative output) |
| Contextual Interpretation | Rule-based NLP synthesis combining all signals |
| AI Response Suggestion | Template-based generator keyed by sentiment × intent × tone |
| YouTube Comments | YouTube Data API v3 |
| Instagram Comments | `instagrapi` — authenticated via browser session ID |
| PDF Export | `reportlab` branded reports (single, bulk, URL analysis) |
| Analytics Dashboard | Aggregated KPIs, charts, trends, keyword cloud |

### Supported Languages

English · Hindi (हिंदी) · Bengali (বাংলা) · Assamese (অসমীয়া) · Hinglish (Devanagari & Roman) · Urdu · Tamil · Telugu · Gujarati · French · German · Spanish · Italian · Portuguese · Russian · Chinese · Japanese · Korean · Arabic

---

## How It Works — Full Pipeline

Every piece of text (whether typed, uploaded via CSV, or scraped from a URL) passes through the same eight-step pipeline:

```
┌─────────────────────────────────────────────────────────────┐
│                        INPUT TEXT                           │
└───────────────────────────┬─────────────────────────────────┘
                            │
                   ┌────────▼────────┐
                   │ 1. LANGUAGE     │  langdetect → lang code + name
                   │    DETECTION    │  + Hinglish heuristic override
                   └────────┬────────┘
                            │  (non-English only)
                   ┌────────▼────────┐
                   │ 2. TRANSLATION  │  MarianMT → English
                   │    (optional)   │  Skipped for romanized Hinglish
                   └────────┬────────┘
                            │
              ┌─────────────▼──────────────┐
              │  3. SENTIMENT ANALYSIS     │
              │                            │
              │  DistilBERT-multilingual   │
              │  ↓  768-dim mean embedding │
              │  Logistic Regression head  │  35% weight
              │                            │
              │  Twitter-RoBERTa           │  65% weight
              │  (trained on 124M tweets)  │
              │                            │
              │  Emoji signal adjustment   │
              │  → pos / neg / neutral     │
              │  Confidence floor: <55%→neutral
              └─────────────┬──────────────┘
                            │
              ┌─────────────▼──────────────┐
              │  4. SARCASM DETECTION      │
              │  twitter-roberta-base-irony│
              │  threshold: 0.70           │
              │  If irony detected AND     │
              │  sentiment=positive →      │
              │  flip sentiment to negative│
              └─────────────┬──────────────┘
                            │
              ┌─────────────▼──────────────┐
              │  5. EMOTION DETECTION      │
              │  GoEmotions distilRoBERTa  │
              │  7 base emotions mapped to │
              │  display labels            │
              │  + sentiment alignment     │
              │  post-processing           │
              └─────────────┬──────────────┘
                            │
         ┌──────────────────┼──────────────────┐
         │                                     │
┌────────▼────────┐                  ┌─────────▼───────┐
│ 6. TONE         │                  │ 7. INTENT       │
│ Zero-shot NLI   │                  │ Zero-shot NLI   │
│ 8 tone classes  │                  │ 8 intent classes│
│ professional    │                  │ complaint       │
│ casual          │                  │ appreciation    │
│ sarcastic       │                  │ inquiry         │
│ aggressive      │                  │ request         │
│ critical        │                  │ suggestion      │
│ appreciative    │                  │ feedback        │
│ formal          │                  │ threat          │
│ informal        │                  │ praise          │
└────────┬────────┘                  └─────────┬───────┘
         │                                     │
         └──────────────┬──────────────────────┘
                        │
           ┌────────────▼────────────┐
           │  8a. INTERPRETATION     │
           │  Rule-based synthesis   │
           │  of all 5 signals       │
           └────────────┬────────────┘
                        │
           ┌────────────▼────────────┐
           │  8b. RESPONSE SUGGESTION│
           │  Template lookup keyed  │
           │  by sentiment×intent×   │
           │  tone                   │
           └────────────┬────────────┘
                        │
           ┌────────────▼────────────┐
           │       FINAL OUTPUT      │
           │  sentiment · sarcasm    │
           │  emotion · tone · intent│
           │  interpretation         │
           │  suggested response     │
           │  language + translation │
           │  processing time        │
           └─────────────────────────┘
```

### URL Analysis Flow (YouTube / Instagram)

```
YouTube URL ──► YouTube Data API v3
                  ↓ video metadata + up to 50 top comments
                  ↓
Instagram URL ──► instagrapi (authenticated via session ID)
                  ↓ post metadata + up to 50 comments
                  ↓
               Each comment → full 8-step pipeline
                  ↓
               Aggregate: dominant sentiment/emotion/tone/intent
               + per-comment breakdown table
```

---

## AI Models — Detailed Description

### 1. DistilBERT Multilingual Cased
**HuggingFace:** `distilbert-base-multilingual-cased`  
**Size:** ~266 MB · **Languages:** 104

The primary embedding backbone. DistilBERT is a distilled version of BERT — 40% smaller, 60% faster, retains 97% of language understanding. The multilingual-cased variant was pre-trained on Wikipedia in 104 languages, making it understand semantic context in Hindi, Bengali, French, Russian, Japanese, etc. without separate models.

In this project it is used as a **feature extractor only**: the final hidden states are mean-pooled over the token dimension to produce a single 768-dimensional sentence embedding. That embedding is then passed to the Logistic Regression classifier trained on hand-curated seed data covering formal reviews, informal comments, and emoji-heavy text.

### 2. Twitter-RoBERTa Base Sentiment
**HuggingFace:** `cardiffnlp/twitter-roberta-base-sentiment-latest`  
**Size:** ~476 MB · **Training data:** 124 million tweets

RoBERTa (Robustly Optimized BERT Approach) fine-tuned on tweets by Cardiff NLP. Unlike standard BERT models trained on formal text, this model was built specifically for informal, emoji-heavy, and slang-rich content — exactly what YouTube/Instagram comments look like. It outputs three native classes (Positive / Neutral / Negative) with calibrated probabilities.

**Why 65% weight:** This model directly understands the comment domain and produces better-calibrated scores. The DistilBERT+LR component (35%) adds multilingual coverage for non-English text that the RoBERTa model may not handle as well.

### 3. Logistic Regression Head
**Library:** `scikit-learn`

A classic linear classifier trained at startup on 60 hand-crafted seed examples covering positive/negative/neutral in both formal review style and informal comment style (including emojis, slang, Hinglish). It operates on the 768-dim DistilBERT embeddings and provides a fast, interpretable probability estimate. Trained in-memory at server startup — no file needed.

### 4. Twitter-RoBERTa Base Irony (Sarcasm)
**HuggingFace:** `cardiffnlp/twitter-roberta-base-irony`  
**Size:** ~476 MB · **Classes:** `irony` / `non_irony`

Fine-tuned on the SemEval-2018 Task 3 irony detection dataset. Detects irony and sarcasm — the linguistic phenomenon where surface-level positive language is used to convey negative meaning ("Oh great, another delay. Just what I needed."). When sarcasm is detected with confidence ≥ 0.70 and the sentiment model returned positive, the pipeline flips the sentiment to negative, preventing false-positive positives.

### 5. GoEmotions distilRoBERTa
**HuggingFace:** `j-hartmann/emotion-english-distilroberta-base`  
**Size:** ~329 MB · **Classes:** joy · sadness · anger · fear · surprise · disgust · neutral

Fine-tuned on Google's GoEmotions dataset (58,000 Reddit comments labelled across 27 emotions, collapsed to 7 here). Identifies the primary emotional tone of text. After classification, a post-processing step ensures the emotion is semantically compatible with the sentiment: a Negative sentiment cannot display Joy, a Positive sentiment cannot display Anger. This prevents contradictory output caused by the models running independently.

### 6. DistilBERT MNLI — Tone & Intent (Zero-shot NLI)
**HuggingFace:** `typeform/distilbert-base-uncased-mnli`  
**Size:** ~268 MB · **Technique:** Zero-shot Natural Language Inference

Fine-tuned on the Multi-Genre Natural Language Inference (MNLI) corpus. Used for **both** tone and intent classification via zero-shot inference: each candidate label is converted to a hypothesis sentence (e.g. "This text is written in a professional tone") and the model predicts whether that hypothesis is entailed by the input. The highest-scoring hypothesis wins.

This approach requires no task-specific training data and supports any set of labels. The same model handles both 8-class tone detection and 8-class intent detection simultaneously.

**Tone classes:** professional · casual · sarcastic · aggressive · critical · appreciative · formal · informal  
**Intent classes:** complaint · appreciation · inquiry · request · suggestion · feedback · threat · praise

### 7. MarianMT Translation Models
**HuggingFace:** Helsinki-NLP `opus-mt-*` family  
**Size:** ~300 MB each · **Loaded on demand, cached in memory**

Neural machine translation models trained on the OPUS corpus. A language-specific model is loaded on first use and kept cached for subsequent requests. Supported dedicated pairs: Hindi, Bengali, French, German, Spanish, Italian, Portuguese, Russian, Chinese, Japanese, Korean, Arabic. All other non-English languages fall back to `opus-mt-mul-en` (multilingual → English).

Romanized Hinglish (Roman-script mixed Hindi-English) is **not** passed to MarianMT because the model expects Devanagari script and would produce garbage output. The multilingual BERT handles it directly in its original form.

---

## Project Structure

```
FinalYearProject/
├── backend/
│   ├── main.py                      # FastAPI app, CORS, lifespan startup
│   ├── config.py                    # Pydantic settings (reads from .env)
│   ├── .env                         # Credentials & config (never committed)
│   │
│   ├── modules/                     # AI/ML pipeline
│   │   ├── pipeline.py              # Orchestration — 8-step analyze_text()
│   │   ├── language_detector.py     # langdetect + Hinglish heuristics
│   │   ├── translation.py           # MarianMT loader + translate_to_english()
│   │   ├── sentiment.py             # BERT+LR ensemble + emoji signal
│   │   ├── sarcasm.py               # twitter-roberta-base-irony detector
│   │   ├── emotion.py               # GoEmotions distilRoBERTa
│   │   ├── tone.py                  # Zero-shot NLI tone classifier
│   │   ├── intent.py                # Zero-shot NLI intent classifier
│   │   ├── interpretation.py        # Rule-based contextual synthesis
│   │   ├── response_generator.py    # Template response suggestions
│   │   ├── analytics.py             # Dashboard aggregation + AI insight
│   │   ├── url_fetcher.py           # YouTube API + Instagram instagrapi
│   │   └── pdf_generator.py         # PDF export (reportlab)
│   │
│   ├── routers/
│   │   ├── analysis.py              # POST /analyze
│   │   ├── bulk.py                  # POST /bulk-analyze, POST /upload-csv
│   │   ├── analytics.py             # GET /analytics
│   │   ├── history.py               # GET/DELETE /history
│   │   ├── url_analysis.py          # POST /analyze-url
│   │   └── export.py                # POST /export/pdf/*
│   │
│   ├── database/
│   │   ├── connection.py            # SQLAlchemy engine + session factory
│   │   └── models.py                # AnalysisRecord ORM model
│   │
│   └── schemas/
│       ├── analysis.py              # Pydantic request/response models
│       └── url_analysis.py          # URLAnalysisRequest/Response models
│
└── frontend/
    └── src/
        ├── pages/
        │   ├── Dashboard.tsx        # KPI cards, charts, trend, keyword cloud
        │   ├── SingleAnalysis.tsx   # Single text input + full result cards
        │   ├── BulkAnalysis.tsx     # Bulk text / CSV upload + results table
        │   ├── URLAnalysis.tsx      # YouTube / Instagram URL input + results
        │   ├── History.tsx          # Paginated searchable history
        │   └── Settings.tsx         # Platform settings
        ├── components/
        │   ├── Layout.tsx           # App shell
        │   ├── Sidebar.tsx          # Collapsible navigation
        │   ├── analysis/            # Individual result cards
        │   └── ui/                  # Button, Card, Input, Badge, Toast, etc.
        ├── lib/
        │   ├── api.ts               # Axios client (base URL from VITE_API_URL)
        │   ├── themes.ts            # Theme definitions
        │   └── utils.ts             # Utility helpers
        ├── store/index.ts           # Zustand global state
        └── types/index.ts           # TypeScript interface definitions
```

---

## Setup & Installation

### Requirements

| Requirement | Version |
|---|---|
| Python | 3.11 recommended (3.10+ works) |
| Node.js | 18.x or 20.x |
| RAM | 8 GB minimum, 16 GB recommended |
| GPU (optional) | NVIDIA CUDA GPU — CPU fallback available |
| Storage | ~8 GB for model downloads on first run |

---

### Step 1 — Backend

#### 1a. Install Python dependencies

No virtual environment in this project — install directly:

```powershell
cd "C:\Users\dasbi\Desktop\FinalYearProject\FinalYearProject\backend"
pip install fastapi uvicorn[standard] python-multipart pydantic pydantic-settings
pip install sqlalchemy transformers torch scikit-learn
pip install langdetect pandas numpy sentencepiece sacremoses
pip install python-dotenv httpx google-api-python-client
pip install instagrapi browser-cookie3 fpdf2
```

> **Note:** PyTorch installation is large (~2 GB). Models download automatically on first run (~4–6 GB total, cached in `./model_cache/`).

#### 1b. Configure `backend/.env`

Create or edit `backend/.env`:

```env
DATABASE_URL=sqlite:///./sentiment_platform.db
MODEL_CACHE_DIR=./model_cache
DEVICE=auto
MAX_TEXT_LENGTH=512
CORS_ORIGINS=["http://localhost:5173","http://localhost:3000","http://127.0.0.1:5173"]
LOG_LEVEL=INFO

# ── YouTube URL Analysis ────────────────────────────────────────────────────
# Get a free key: console.cloud.google.com → APIs & Services → YouTube Data API v3
YOUTUBE_API_KEY=your_youtube_api_key_here

# ── Instagram URL Analysis ──────────────────────────────────────────────────
# Username and password (fallback — Instagram may block programmatic login)
INSTAGRAM_USERNAME=your_instagram_username
INSTAGRAM_PASSWORD=your_instagram_password

# Session ID from your browser (most reliable — bypasses bot detection)
# How to get it:
#   1. Open Chrome → log into instagram.com
#   2. Press F12 → Application → Cookies → https://www.instagram.com
#   3. Find the 'sessionid' cookie and copy its Value
INSTAGRAM_SESSION_ID=your_session_id_here
```

> Set `DEVICE=cuda` to use a CUDA GPU. Set `DEVICE=cpu` to force CPU mode.

#### 1c. Start the backend

```powershell
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

First run downloads all models automatically. Subsequent starts load from cache and are ready in ~10 seconds.

- API: **http://localhost:8000**
- Interactive docs: **http://localhost:8000/docs**

---

### Step 2 — Frontend

Open a **new terminal**:

```powershell
cd "C:\Users\dasbi\Desktop\FinalYearProject\FinalYearProject\frontend"
npm install
```

Create `frontend/.env`:

```env
VITE_API_URL=http://localhost:8000/api/v1
```

Start the dev server:

```powershell
npm run dev
```

Frontend: **http://localhost:5173**

---

### Step 3 — Instagram Session Setup (one-time)

Instagram blocks fully automated logins. The most reliable way to authenticate is to use your existing browser session:

1. Open **Chrome** and log into [instagram.com](https://www.instagram.com)
2. Press **F12** → **Application** tab → **Cookies** (left panel) → click `https://www.instagram.com`
3. Find the row named **`sessionid`** and copy the **Value** column
4. Paste it as `INSTAGRAM_SESSION_ID=<value>` in `backend/.env`
5. Restart the backend

Once set, the session is loaded on every request with no re-login required. The session ID is long-lived (typically weeks) and tied to your browser login.

---

## All Dependencies

### Backend — Python Packages

| Package | Purpose |
|---|---|
| `fastapi` | Async web framework, automatic OpenAPI docs |
| `uvicorn[standard]` | ASGI server for FastAPI |
| `python-multipart` | Multipart form data (CSV file uploads) |
| `pydantic` | Data validation and serialization |
| `pydantic-settings` | `.env` file loading into Settings class |
| `sqlalchemy` | ORM for SQLite database |
| `transformers` | HuggingFace model loading and inference |
| `torch` | PyTorch deep learning backend (GPU/CPU) |
| `scikit-learn` | Logistic Regression classifier |
| `langdetect` | Language identification (23 languages) |
| `pandas` | CSV parsing for bulk upload |
| `numpy` | Numerical array operations |
| `sentencepiece` | Tokenizer required by MarianMT |
| `sacremoses` | Text normalization for MarianMT |
| `python-dotenv` | `.env` file parsing |
| `httpx` | Async HTTP client |
| `google-api-python-client` | YouTube Data API v3 comment fetching |
| `instagrapi` | Instagram private API — comment fetching |
| `browser-cookie3` | Chrome/Edge cookie extraction (session ID helper) |
| `fpdf2` | PDF report generation |

### Frontend — npm Packages

| Package | Version | Purpose |
|---|---|---|
| `react` | ^18.2.0 | UI library |
| `react-dom` | ^18.2.0 | DOM rendering |
| `react-router-dom` | ^6.20.1 | Client-side routing |
| `recharts` | ^2.9.3 | Charts (pie, bar, line) |
| `axios` | ^1.6.2 | HTTP client for API calls |
| `zustand` | ^4.4.7 | Lightweight global state management |
| `framer-motion` | ^10.16.16 | Animations and transitions |
| `react-dropzone` | ^14.2.3 | Drag-and-drop CSV upload |
| `react-hot-toast` | ^2.4.1 | Toast notifications |
| `clsx` | ^2.0.0 | Conditional class name utility |
| `tailwind-merge` | ^2.1.0 | Tailwind class conflict resolution |
| `lucide-react` | ^0.294.0 | Icon library |
| `tailwindcss` | ^3.3.6 | Utility-first CSS framework |
| `vite` | ^5.0.8 | Build tool and dev server |
| `typescript` | ^5.2.2 | Static typing |

---

## API Reference

### Base URL: `http://localhost:8000/api/v1`

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/analyze` | Single text analysis |
| `POST` | `/bulk-analyze` | Analyze up to 100 texts (JSON array) |
| `POST` | `/upload-csv` | Parse CSV → extract text column |
| `POST` | `/analyze-url` | Fetch + analyze YouTube or Instagram comments |
| `GET` | `/analytics` | Dashboard KPIs, trends, keyword cloud |
| `GET` | `/history` | Paginated history with search + filter |
| `GET` | `/history/{id}` | Single record |
| `DELETE` | `/history/{id}` | Delete one record |
| `DELETE` | `/history` | Clear all history |
| `POST` | `/export/pdf/single` | PDF report for a single analysis |
| `POST` | `/export/pdf/bulk` | PDF report for bulk analysis |
| `POST` | `/export/pdf/url` | PDF report for URL analysis |
| `GET` | `/health` | Health check |

### Single Analysis — Request / Response

```json
POST /api/v1/analyze
{
  "text": "The product quality is amazing! Fast delivery.",
  "mode": "single"
}
```

```json
{
  "id": "uuid",
  "original_text": "The product quality is amazing! Fast delivery.",
  "detected_language": "English",
  "language_code": "en",
  "translated_text": "The product quality is amazing! Fast delivery.",
  "is_translation": false,
  "sentiment": { "label": "positive", "confidence": 0.9234, "probabilities": { "positive": 0.9234, "negative": 0.0312, "neutral": 0.0454 } },
  "sarcasm": { "detected": false, "confidence": 0.08 },
  "emotion": { "label": "Joy", "confidence": 0.8765, "scores": { "Joy": 0.8765, "Neutral": 0.0823 } },
  "tone": { "label": "appreciative", "intensity": 0.7823, "scores": { "appreciative": 0.7823, "professional": 0.1234 } },
  "intent": { "label": "appreciation", "confidence": 0.8432, "scores": { "appreciation": 0.8432 } },
  "interpretation": "The reviewer expresses a strongly positive sentiment...",
  "suggested_response": "Thank you for your wonderful feedback!",
  "processing_time": 1.234,
  "timestamp": "2024-01-15T10:30:00",
  "word_count": 8,
  "char_count": 45
}
```

### URL Analysis — Request / Response

```json
POST /api/v1/analyze-url
{
  "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "max_comments": 50
}
```

```json
{
  "post": {
    "platform": "youtube",
    "title": "Video Title",
    "author": "Channel Name",
    "url": "https://...",
    "fetched_comments": 50,
    "total_available": 12400
  },
  "total": 50,
  "items": [ /* per-comment analysis */ ],
  "aggregate": {
    "dominant_sentiment": "positive",
    "dominant_emotion": "Joy",
    "sentiment_distribution": { "positive": 32, "negative": 8, "neutral": 10 },
    "average_confidence": 0.8123
  },
  "processing_time": 87.4
}
```

---

## Performance

| Model | Disk Size | RAM Usage | Inference / text (CPU) |
|---|---|---|---|
| DistilBERT Multilingual | 266 MB | ~800 MB | ~0.3 s |
| Twitter-RoBERTa Sentiment | 476 MB | ~700 MB | ~0.2 s |
| Twitter-RoBERTa Irony | 476 MB | ~700 MB | ~0.2 s |
| GoEmotions distilRoBERTa | 329 MB | ~600 MB | ~0.2 s |
| DistilBERT MNLI (tone+intent) | 268 MB | ~500 MB | ~0.4 s |
| MarianMT (per language) | ~300 MB | ~400 MB | ~0.3 s |

**Total RAM during inference:** ~4–5 GB  
**Single text (CPU):** ~1.5–3 seconds  
**Single text (CUDA GPU):** ~0.3–0.8 seconds  
**Bulk 100 texts (CPU):** ~3–5 minutes  
**URL analysis 50 comments:** depends on pipeline above × 50

---

## Troubleshooting

### Backend won't start

```powershell
# Check Python version (needs 3.10+)
python --version

# Re-install a missing package
pip install <package-name>
```

### CUDA / GPU errors

```env
# Force CPU mode in backend/.env
DEVICE=cpu
```

### Models fail to download

```powershell
# Set the HuggingFace cache directory explicitly
$env:HF_HOME = "./model_cache"
uvicorn main:app --reload
```

### Frontend can't connect to backend

1. Confirm backend is running: `http://localhost:8000/health`
2. Check `VITE_API_URL=http://localhost:8000/api/v1` in `frontend/.env`
3. Check `CORS_ORIGINS` in `backend/.env` includes `http://localhost:5173`

### YouTube URL returns error

- Make sure `YOUTUBE_API_KEY` is set in `backend/.env`
- Verify the key has the **YouTube Data API v3** enabled in Google Cloud Console
- Some videos have comments disabled — the API returns an error in that case

### Instagram URL returns error

- Verify `INSTAGRAM_SESSION_ID` is set in `backend/.env`
- Session IDs expire when you log out of Chrome — get a fresh one if it stops working
- Private posts and accounts with restricted comments cannot be fetched
- If you see `ChallengeRequired`: your programmatic login was flagged; use the session ID method instead

### PowerShell execution policy error

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

---

## Tech Stack Summary

**Backend:** Python 3.11 · FastAPI · HuggingFace Transformers · PyTorch · scikit-learn · SQLAlchemy · SQLite · instagrapi · YouTube Data API v3 · reportlab

**Frontend:** React 18 · TypeScript · Vite · Tailwind CSS · Recharts · Zustand · Framer Motion · Axios

**AI Models:** DistilBERT-multilingual · Twitter-RoBERTa (sentiment + irony) · GoEmotions distilRoBERTa · DistilBERT-MNLI · MarianMT (Helsinki-NLP)

---

## Academic Context

**Project:** Final Year Project  
**Title:** Sentiment Analysis Classification System using BERT and Logistic Regression  
**Focus:** Multilingual customer feedback analysis with enterprise-grade analytics dashboard and social media comment scraping

**Key Innovation:** Hybrid BERT+LR ensemble weighted against a tweet-native RoBERTa model, with sarcasm-driven sentiment correction and zero-shot NLI for tone/intent — all without task-specific fine-tuning data for tone, intent, or sarcasm. Multilingual support covers Indian regional languages (Hindi, Bengali, Assamese, Hinglish) using lightweight models deployable on a consumer GPU.
