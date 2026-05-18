# Sentiment Analysis Classification System
### AI-Powered Multilingual Sentiment Intelligence Platform
**BERT + Logistic Regression | FastAPI | React | Dark Dashboard**

---

## Project Overview

A complete production-style NLP analytics platform that analyzes reviews, tweets, comments, and feedback across multiple languages. Built with DistilBERT embeddings, Logistic Regression classification, and a modern React dashboard.

### Core Capabilities
| Feature | Technology |
|---------|-----------|
| Language Detection | `langdetect` |
| Translation | MarianMT (Helsinki-NLP) |
| Sentiment Analysis | DistilBERT + Logistic Regression (ensemble) |
| Emotion Detection | `j-hartmann/emotion-english-distilroberta-base` |
| Tone Detection | Zero-shot NLI (DistilBERT-MNLI) |
| Intent Detection | Zero-shot NLI (DistilBERT-MNLI) |
| Contextual Interpretation | Rule-based NLP synthesis |
| AI Response Suggestion | Template-based intelligent generation |

### Supported Languages
- English, Hindi (हिंदी), Bengali (বাংলা), Assamese (অসমীয়া)
- Hinglish (mixed Hindi-English), Urdu, Tamil, Telugu, Gujarati
- French, German, Spanish, Italian, Portuguese, Russian, Chinese, Japanese, Korean, Arabic

---

## System Requirements

- **OS**: Windows 10/11
- **GPU**: NVIDIA RTX 3050 (4GB VRAM) or any CUDA GPU (CPU fallback available)
- **RAM**: 16GB recommended (8GB minimum)
- **Python**: 3.10 or 3.11
- **Node.js**: 18.x or 20.x
- **Storage**: ~8GB for model downloads on first run

---

## Project Structure

```
FinalYearProject/
├── backend/                          # FastAPI Python backend
│   ├── main.py                       # Application entry point
│   ├── config.py                     # Settings & environment config
│   ├── requirements.txt              # Python dependencies
│   ├── .env.example                  # Environment variable template
│   ├── modules/                      # AI/ML pipeline modules
│   │   ├── pipeline.py               # Main orchestration pipeline
│   │   ├── language_detector.py      # Language detection
│   │   ├── translation.py            # MarianMT translation
│   │   ├── sentiment.py              # BERT + LR sentiment
│   │   ├── emotion.py                # Emotion detection
│   │   ├── tone.py                   # Tone detection
│   │   ├── intent.py                 # Intent detection
│   │   ├── interpretation.py         # Contextual interpretation
│   │   ├── response_generator.py     # AI response generation
│   │   └── analytics.py              # Analytics aggregation
│   ├── routers/                      # FastAPI route handlers
│   │   ├── analysis.py               # Single analysis endpoint
│   │   ├── bulk.py                   # Bulk analysis + CSV upload
│   │   ├── analytics.py              # Dashboard analytics
│   │   └── history.py                # History CRUD
│   ├── database/                     # Database layer
│   │   ├── connection.py             # SQLAlchemy setup
│   │   └── models.py                 # ORM models
│   └── schemas/                      # Pydantic request/response schemas
│       └── analysis.py
│
└── frontend/                         # React TypeScript frontend
    ├── src/
    │   ├── pages/
    │   │   ├── Dashboard.tsx         # Analytics dashboard
    │   │   ├── SingleAnalysis.tsx    # Single text analysis
    │   │   ├── BulkAnalysis.tsx      # Bulk analysis + CSV upload
    │   │   ├── History.tsx           # Analysis history
    │   │   └── Settings.tsx          # Platform settings
    │   ├── components/
    │   │   ├── Sidebar.tsx           # Collapsible navigation
    │   │   ├── Layout.tsx            # App shell layout
    │   │   ├── analysis/             # Analysis result cards
    │   │   └── ui/                   # Reusable UI components
    │   ├── lib/
    │   │   ├── api.ts                # Axios API client
    │   │   └── utils.ts              # Utility functions
    │   ├── store/index.ts            # Zustand global state
    │   └── types/index.ts            # TypeScript definitions
    ├── package.json
    ├── tailwind.config.js
    └── vite.config.ts
```

---

## Setup & Installation

### Step 1 — Clone / Navigate to Project

```bash
cd "C:\Users\USER\Desktop\FinalYearProject"
```

### Step 2 — Backend Setup

#### 2a. Create Python Virtual Environment

```bash
cd backend
python -m venv venv
```

#### 2b. Activate Virtual Environment

```bash
# Windows CMD
venv\Scripts\activate.bat

# Windows PowerShell
.\venv\Scripts\Activate.ps1

# If PowerShell execution policy error, run first:
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

#### 2c. Install Python Dependencies

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

> **Note:** PyTorch installation may take 10-15 minutes. Models will be downloaded on first run (~4-6 GB total).

#### 2d. Configure Environment

```bash
copy .env.example .env
```

Edit `.env` if needed:
```env
DATABASE_URL=sqlite:///./sentiment_platform.db
MODEL_CACHE_DIR=./model_cache
DEVICE=auto          # auto=detect GPU, or set: cuda / cpu
MAX_TEXT_LENGTH=512
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
LOG_LEVEL=INFO
```

#### 2e. Start Backend Server

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**First run will download models automatically** (one-time, requires internet):
- `distilbert-base-multilingual-cased` (~266 MB)
- `distilbert-base-uncased-finetuned-sst-2-english` (~268 MB)
- `j-hartmann/emotion-english-distilroberta-base` (~329 MB)
- `typeform/distilbert-base-uncased-mnli` (~268 MB)
- MarianMT translation models (per language, ~300 MB each, downloaded on-demand)

Backend will be available at: **http://localhost:8000**
API docs at: **http://localhost:8000/docs**

---

### Step 3 — Frontend Setup

Open a **new terminal**:

```bash
cd "C:\Users\USER\Desktop\FinalYearProject\frontend"
npm install
```

#### Configure Frontend Environment

```bash
copy .env.example .env
```

`.env` content:
```env
VITE_API_URL=http://localhost:8000/api/v1
```

#### Start Frontend Dev Server

```bash
npm run dev
```

Frontend will be available at: **http://localhost:5173**

---

## Running the Complete Platform

Open **two terminals**:

**Terminal 1 — Backend:**
```bash
cd backend
.\venv\Scripts\Activate.ps1
uvicorn main:app --reload
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
```

Then open **http://localhost:5173** in your browser.

---

## API Reference

### Base URL: `http://localhost:8000/api/v1`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/analyze` | Analyze a single text |
| `POST` | `/bulk-analyze` | Analyze multiple texts (max 100) |
| `POST` | `/upload-csv` | Upload CSV file for bulk analysis |
| `GET` | `/analytics` | Get dashboard analytics data |
| `GET` | `/history` | Get paginated analysis history |
| `GET` | `/history/{id}` | Get single history record |
| `DELETE` | `/history/{id}` | Delete a history record |
| `DELETE` | `/history` | Clear all history |
| `GET` | `/health` | Health check |

### Example: Single Analysis

**Request:**
```json
POST /api/v1/analyze
{
  "text": "The product quality is amazing! Fast delivery.",
  "mode": "single"
}
```

**Response:**
```json
{
  "id": "uuid-string",
  "original_text": "The product quality is amazing! Fast delivery.",
  "detected_language": "English",
  "language_code": "en",
  "translated_text": "The product quality is amazing! Fast delivery.",
  "is_translation": false,
  "sentiment": {
    "label": "positive",
    "confidence": 0.9234,
    "probabilities": { "positive": 0.9234, "negative": 0.0312, "neutral": 0.0454 }
  },
  "emotion": {
    "label": "Joy",
    "confidence": 0.8765,
    "scores": { "Joy": 0.8765, "Neutral": 0.0823, ... }
  },
  "tone": {
    "label": "appreciative",
    "intensity": 0.7823,
    "scores": { "appreciative": 0.7823, "professional": 0.1234, ... }
  },
  "intent": {
    "label": "appreciation",
    "confidence": 0.8432,
    "scores": { "appreciation": 0.8432, "praise": 0.1123, ... }
  },
  "interpretation": "The reviewer expresses a strongly positive sentiment...",
  "suggested_response": "Thank you for your wonderful feedback!...",
  "processing_time": 1.234,
  "timestamp": "2024-01-15T10:30:00",
  "word_count": 8,
  "char_count": 45
}
```

### Example: Bulk Analysis

```json
POST /api/v1/bulk-analyze
{
  "texts": [
    "Great product, highly recommended!",
    "Terrible experience, never buying again.",
    "यह उत्पाद बहुत अच्छा है।"
  ]
}
```

---

## Architecture: BERT + Logistic Regression

The sentiment analysis uses a **two-model ensemble**:

```
Input Text
    │
    ▼
[DistilBERT Multilingual]
    │  Extract 768-dim embedding (mean pooled)
    ▼
[Logistic Regression]     [SST-2 Fine-tuned Pipeline]
    │  60% weight               │  40% weight
    └──────────┬────────────────┘
               ▼
         [Ensemble Output]
               │
    ┌──────────┴──────────┐
    │    Positive / Negative / Neutral    │
    └─────────────────────┘
         + confidence score
         + probability distribution
```

**Why this approach:**
- DistilBERT captures semantic context across 104 languages
- Logistic Regression is fast, interpretable, memory-efficient
- Ensemble improves accuracy over single-model approaches
- Works on RTX 3050 without OOM errors

---

## Dashboard Features

### Dashboard Page
- 6 KPI cards: Total analyzed, dominant sentiment/emotion/tone/intent, avg confidence
- AI Insight summary (auto-generated analysis of your data)
- Sentiment distribution pie chart
- Emotion distribution bar chart
- 30-day sentiment trend line chart
- Top keywords word cloud
- Recent activity feed
- Backend connection status indicator

### Single Analysis Page
- Multilingual text input (5000 char limit)
- Example text buttons (English, Hindi, Hinglish)
- Language detection card with translation display
- Sentiment card with donut chart + probability bars
- Emotion card with scored breakdown
- Tone card with intensity meter
- Intent card with scored breakdown
- Contextual interpretation
- AI-generated response suggestion with copy button

### Bulk Analysis Page
- Text mode: Enter reviews line-by-line
- CSV upload mode: Drag-and-drop with auto column detection
- Aggregate stats: dominant sentiment, emotion, avg confidence
- Sentiment distribution bars
- Searchable, filterable, paginated results table
- Row expansion for full details
- Export results as CSV

### History Page
- Full searchable history of all analyses
- Filter by sentiment, language, search text
- Paginated table with row expansion
- Delete individual records or clear all

---

## Performance Notes

| Model | Size | RAM Usage | Inference Time (CPU) |
|-------|------|-----------|---------------------|
| DistilBERT Multilingual | 266 MB | ~800 MB | ~0.3s per text |
| SST-2 Sentiment | 268 MB | ~500 MB | ~0.1s per text |
| GoEmotions Emotion | 329 MB | ~600 MB | ~0.2s per text |
| DistilBERT-MNLI (tone+intent) | 268 MB | ~500 MB | ~0.4s per text |

**Total RAM during inference:** ~3-4 GB  
**Single text analysis time:** ~1-3 seconds (CPU), ~0.5-1s (GPU)  
**Bulk analysis (100 texts):** ~3-5 minutes (CPU), ~1-2 minutes (GPU)

### GPU Optimization
Set `DEVICE=cuda` in `.env` to use your RTX 3050. Models will use ~3 GB VRAM.

---

## Troubleshooting

### Backend won't start
```bash
# Make sure venv is activated
.\venv\Scripts\Activate.ps1

# Check Python version
python --version  # Must be 3.10 or 3.11

# Reinstall dependencies
pip install -r requirements.txt --force-reinstall
```

### CUDA/GPU errors
```bash
# Force CPU mode in .env
DEVICE=cpu
```

### Frontend can't connect to backend
1. Check backend is running: `http://localhost:8000/health`
2. Check CORS origins in backend `.env` include `http://localhost:5173`
3. Verify `VITE_API_URL=http://localhost:8000/api/v1` in frontend `.env`

### Model download fails
Models are cached in `./model_cache/` after first download. If download fails:
```bash
# Set HuggingFace cache directory manually
set HF_HOME=./model_cache
uvicorn main:app --reload
```

### PowerShell execution policy error
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

---

## Tech Stack

### Backend
- **FastAPI** — Modern async Python web framework
- **HuggingFace Transformers** — Pre-trained NLP models
- **PyTorch** — Deep learning framework (GPU acceleration)
- **scikit-learn** — Logistic Regression classifier
- **SQLAlchemy** — ORM for SQLite database
- **langdetect** — Language identification
- **pandas** — CSV processing

### Frontend
- **React 18** — UI library with hooks
- **TypeScript** — Type safety
- **Vite** — Fast build tool
- **Tailwind CSS** — Utility-first CSS
- **Recharts** — Chart library
- **Framer Motion** — Animations
- **Zustand** — State management
- **Axios** — HTTP client
- **react-hot-toast** — Notifications
- **lucide-react** — Icons

---

## Academic Context

**Project:** Final Year Project  
**Title:** Sentiment Analysis Classification System using BERT and Logistic Regression  
**Focus:** Multilingual customer feedback analysis with enterprise-grade analytics dashboard

**Key Innovation:** Hybrid BERT+LR ensemble for three-class sentiment with multilingual support across Indian regional languages (Hindi, Bengali, Assamese, Hinglish) using lightweight models suitable for local deployment.
