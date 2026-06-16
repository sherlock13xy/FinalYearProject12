# SentimentIQ — Complete Codebase Documentation

> Multilingual AI-powered sentiment analysis platform with emotion, tone, intent detection, social media comment analysis, user authentication, admin management, and an ML correction system.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Directory Structure](#3-directory-structure)
4. [Full Analysis Pipeline](#4-full-analysis-pipeline)
5. [Backend — File by File](#5-backend--file-by-file)
   - [Entry Point](#51-mainpy--entry-point)
   - [Configuration](#52-configpy--configuration)
   - [Database](#53-database)
   - [Modules (ML)](#54-modules--ml-processing)
   - [Routers (API)](#55-routers--api-endpoints)
   - [Schemas](#56-schemas--validation)
   - [Auth](#57-auth--authentication)
6. [Frontend — File by File](#6-frontend--file-by-file)
   - [Entry & Routing](#61-entry--routing)
   - [Pages](#62-pages)
   - [Analysis Cards](#63-analysis-component-cards)
   - [UI Primitives](#64-ui-primitives)
   - [Layout](#65-layout-components)
   - [State & API](#66-state--api-layer)
   - [Utilities & Themes](#67-utilities--themes)
   - [Types](#68-types)
7. [ML Models Reference](#7-ml-models-reference)
8. [API Endpoints Reference](#8-api-endpoints-reference)
9. [Data Flow Walkthroughs](#9-data-flow-walkthroughs)
10. [Database Schema](#10-database-schema)
11. [Environment Variables](#11-environment-variables)
12. [Sample Requests & Responses](#12-sample-requests--responses)

---

## 1. Project Overview

SentimentIQ is a full-stack web application that performs deep NLP analysis on text input. It goes beyond simple positive/negative classification by detecting:

- **Sentiment** — positive / negative / neutral with confidence
- **Sarcasm/Irony** — detects ironic text and flips sentiment accordingly
- **Emotion** — Joy, Anger, Disgust, Disappointment, Frustration, Excitement, Appreciation, Neutral
- **Tone** — professional, casual, sarcastic, aggressive, critical, appreciative, formal, informal
- **Intent** — complaint, appreciation, inquiry, request, suggestion, feedback, threat, praise
- **Language** — 22 supported languages with automatic translation to English
- **Interpretation** — human-readable paragraph summarising the analysis
- **Suggested Response** — context-aware reply template

It supports three analysis modes:
- **Single** — one text at a time
- **Bulk** — up to 100 texts via JSON or CSV upload (500 rows)
- **URL** — YouTube/Instagram post comment analysis

Additional platform features:
- **JWT authentication** — login/register, role-based access (`admin` / `user`)
- **User reports** — users can flag wrong predictions; admins review and fix them
- **ML correction system** — admin-approved fixes update the in-memory correction cache and retrain the model on the fly
- **Admin Overview** — user management (restrict/delete), storage gauge, data clear buttons
- **Persistent correction cache** — survives server restarts via DB reload on startup

---

## 2. Tech Stack

### Backend
| Layer | Technology |
|---|---|
| Framework | FastAPI 0.115.0 |
| ASGI Server | Uvicorn |
| ORM | SQLAlchemy 2.0.35 |
| Database | SQLite (file: `sentiment_platform.db`) |
| ML Framework | PyTorch 2.4.1 (CPU build) + HuggingFace Transformers 4.44.2 |
| Auth | python-jose (JWT), passlib (bcrypt) |
| PDF Generation | fpdf2 |
| Instagram API | instagrapi |
| YouTube API | google-api-python-client |
| Language Detection | langdetect |
| Translation | Helsinki-NLP OPUS-MT (MarianMT) |
| Data Processing | pandas, numpy |

### Frontend
| Layer | Technology |
|---|---|
| Framework | React 18.3.1 |
| Build Tool | Vite 5.4.21 |
| Language | TypeScript 5.9.3 |
| Routing | React Router DOM 6.30.3 |
| State | Zustand 4.5.7 |
| Styling | Tailwind CSS 3.4.19 |
| Animations | Framer Motion 10.18.0 |
| Charts | Recharts 2.15.4 |
| Icons | Lucide React 0.294.0 |
| HTTP | Axios 1.16.1 |
| Notifications | React Hot Toast 2.6.0 |
| File Upload | React Dropzone 14.4.1 |

---

## 3. Directory Structure

```
FinalYearProject/
├── backend/
│   ├── main.py                        # FastAPI app, startup, CORS, routers
│   ├── config.py                      # Settings via pydantic-settings
│   ├── requirements.txt               # Python dependencies
│   ├── sentiment_platform.db          # SQLite database file
│   ├── auth/
│   │   ├── __init__.py
│   │   └── deps.py                    # JWT helpers, password hashing, require_admin dep
│   ├── database/
│   │   ├── __init__.py
│   │   ├── connection.py              # Engine, session factory, init_db(), migration
│   │   └── models.py                  # User, AnalysisRecord, CorrectionEntry, UserReport ORM models
│   ├── modules/
│   │   ├── pipeline.py                # Main orchestrator — calls all modules
│   │   ├── sentiment.py               # BERT + RoBERTa + LR ensemble + correction cache
│   │   ├── emotion.py                 # GoEmotions distilRoBERTa
│   │   ├── tone.py                    # Zero-shot NLI tone classifier
│   │   ├── intent.py                  # Zero-shot NLI intent classifier
│   │   ├── sarcasm.py                 # Twitter-RoBERTa irony detector
│   │   ├── language_detector.py       # langdetect + Hinglish heuristics
│   │   ├── translation.py             # MarianMT multilingual translation
│   │   ├── interpretation.py          # Rule-based interpretation generator
│   │   ├── response_generator.py      # Template-based response generator
│   │   ├── analytics.py               # Dashboard aggregation logic
│   │   ├── pdf_generator.py           # fpdf2 PDF report builder
│   │   └── url_fetcher.py             # YouTube + Instagram comment scraper
│   ├── routers/
│   │   ├── analysis.py                # POST /analyze
│   │   ├── bulk.py                    # POST /bulk-analyze, POST /upload-csv
│   │   ├── history.py                 # GET/DELETE /history
│   │   ├── analytics.py               # GET /analytics
│   │   ├── url_analysis.py            # POST /analyze-url
│   │   ├── export.py                  # POST /export-pdf (3 variants)
│   │   ├── auth.py                    # POST /auth/register, /auth/login, GET /auth/me
│   │   ├── corrections.py             # Correction CRUD + retrain
│   │   ├── reports.py                 # User reports + admin review
│   │   └── admin.py                   # Admin stats, user restrict/delete, data clear
│   └── schemas/
│       ├── __init__.py
│       ├── analysis.py                # Pydantic models for text analysis
│       ├── url_analysis.py            # Pydantic models for URL analysis
│       ├── auth.py                    # RegisterRequest, LoginRequest, TokenResponse, UserOut
│       └── reports.py                 # ReportCreate, ReportResponse, ReportReview
│
└── frontend/
    ├── package.json
    ├── vite.config.ts
    ├── tailwind.config.js
    ├── tsconfig.json
    ├── index.html
    └── src/
        ├── main.tsx                   # ReactDOM.createRoot, Toaster setup
        ├── App.tsx                    # BrowserRouter, routes, RequireAdmin guard, theme init
        ├── vite-env.d.ts
        ├── pages/
        │   ├── Login.tsx              # Login form
        │   ├── Register.tsx           # Registration form
        │   ├── Dashboard.tsx          # Analytics + charts (sentiment, emotion, tone, intent, language, trend)
        │   ├── SingleAnalysis.tsx     # Single text form + result cards
        │   ├── BulkAnalysis.tsx       # Bulk text/CSV + results table
        │   ├── URLAnalysis.tsx        # YouTube/Instagram analysis
        │   ├── History.tsx            # Paginated history browser
        │   ├── Settings.tsx           # Config, themes, model info
        │   ├── AdminOverview.tsx      # Admin: user mgmt + storage gauge + data clear
        │   ├── UserReports.tsx        # Admin: review/fix wrong prediction reports
        │   └── TrainingData.tsx       # Admin: correction entries + retrain
        ├── components/
        │   ├── Layout.tsx             # Sidebar + Outlet wrapper
        │   ├── Sidebar.tsx            # Collapsible nav + backend health widget
        │   ├── BackendStatus.tsx      # Backend connection indicator (used in Sidebar)
        │   ├── analysis/
        │   │   ├── SentimentCard.tsx
        │   │   ├── EmotionCard.tsx
        │   │   ├── ToneCard.tsx
        │   │   ├── IntentCard.tsx
        │   │   ├── LanguageCard.tsx
        │   │   ├── InterpretationCard.tsx
        │   │   └── ResponseCard.tsx
        │   └── ui/
        │       ├── Card.tsx
        │       ├── Button.tsx
        │       ├── Input.tsx
        │       ├── Textarea.tsx
        │       ├── Select.tsx
        │       ├── Badge.tsx
        │       ├── Progress.tsx
        │       ├── Skeleton.tsx
        │       └── Toast.tsx
        ├── lib/
        │   ├── api.ts                 # Axios client + all API functions
        │   ├── utils.ts               # Color helpers, formatters
        │   └── themes.ts              # 6 themes + applyTheme()
        ├── store/
        │   └── index.ts               # Zustand global store (user, token, analysis state)
        └── types/
            └── index.ts               # TypeScript interfaces
```

---

## 4. Full Analysis Pipeline

This is the core of the platform. Every text — whether from single input, bulk, or URL — flows through `modules/pipeline.py → analyze_text()`.

```
Input Text
    │
    ▼
┌─────────────────────────────────────┐
│  0. Correction Cache Check           │  In-memory dict on BERTLogisticSentimentAnalyzer
│  → if text was admin-corrected:      │  Returns immediately with confidence=1.0
│    return cached label immediately   │  Bypasses all ML inference
└────────────────┬────────────────────┘
                 │ (only if not cached)
                 ▼
┌─────────────────────────────────────┐
│   1. Language Detection              │  langdetect library
│   → language name, code, confidence  │  Returns: "Hindi", "hi", 0.99
└────────────────┬────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────┐
│   2. Hinglish Detection              │  Custom heuristics
│   → is Devanagari mixed?             │  Checks script ratios
│   → is Romanized Hinglish?           │  Checks Hindi word list
└────────────────┬────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────┐
│   3. Translation                     │  Helsinki-NLP MarianMT
│   → if non-English: translate        │  Cached per language pair
│     to English                       │  Hinglish uses hi→en model
│   → pure romanized Hinglish:         │
│     skip translation                 │
└────────────────┬────────────────────┘
                 │ (English text from here on)
                 ▼
┌─────────────────────────────────────┐
│   4. Sentiment Analysis              │  BERT + RoBERTa + LR Ensemble
│   → positive/negative/neutral        │  35% LR + 65% RoBERTa weights
│   → confidence, probabilities        │  Emoji signal processing applied
│   → negative margin guard            │  Min 55% confidence threshold
└────────────────┬────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────┐
│   5. Sarcasm Detection               │  cardiffnlp/twitter-roberta-irony
│   → if detected (≥0.70) AND          │  Sarcasm override is SKIPPED when
│     result is NOT from correction:   │  text was admin-corrected (from_correction flag)
│     flip positive → negative         │
└────────────────┬────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────┐
│   6. Emotion Detection               │  j-hartmann/emotion-distilroberta
│   → Joy/Anger/Disgust/etc.           │  28 raw labels → 8 display labels
│   → confidence, all scores           │  Handles duplicate label merging
└────────────────┬────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────┐
│   7. Emotion-Sentiment Alignment     │  Post-processing rule
│   → ensures emotion polarity         │  e.g. positive sentiment + Anger
│     matches sentiment polarity       │  → emotion corrected to Joy
└────────────────┬────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────┐
│   8. Tone Detection                  │  typeform/distilbert-mnli
│   → professional/casual/etc.         │  Zero-shot NLI classification
│   → intensity (0.0–1.0)              │  8 candidate labels
│   → all tone scores                  │
└────────────────┬────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────┐
│   9. Intent Detection                │  typeform/distilbert-mnli
│   → complaint/appreciation/etc.      │  Zero-shot NLI classification
│   → confidence, all scores           │  8 candidate labels
└────────────────┬────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────┐
│  10. Interpretation Generation       │  Rule-based text generation
│   → human-readable paragraph         │  Combines all results above
│   → key phrase extraction            │  ~20 combination mappings
└────────────────┬────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────┐
│  11. Response Generation             │  Template lookup
│   → suggested reply text             │  (sentiment, intent, tone) key
│                                      │  Falls back through partial keys
└────────────────┬────────────────────┘
                 │
                 ▼
         Final Result Dict
  {id, original_text, detected_language,
   language_code, translated_text,
   is_translation, sentiment, sarcasm,
   emotion, tone, intent, interpretation,
   suggested_response, processing_time,
   word_count, char_count, timestamp}
```

---

## 5. Backend — File by File

### 5.1 `main.py` — Entry Point

The root FastAPI application.

- Creates the `FastAPI` app with a **lifespan** context manager
- On startup:
  1. Calls `init_db()` to create/migrate tables
  2. Calls `initialize_models()` to pre-load all ML models into memory
  3. Reloads all `CorrectionEntry` rows from DB into the in-memory correction cache (so corrections survive server restarts)
- Adds **CORSMiddleware** allowing configured origins
- Mounts all routers under `/api/v1` prefix:
  - `analysis`, `bulk`, `history`, `analytics`, `url_analysis`, `export`
  - `auth`, `corrections`, `reports`, `admin`
- Exposes `GET /health` returning `{status, database, models_loaded, timestamp}`
- Exposes `GET /` returning version info
- Global exception handlers for `ValueError` (400) and all others (500)

---

### 5.2 `config.py` — Configuration

Uses `pydantic-settings` (`BaseSettings`) to read from `.env` file.

| Variable | Default | Purpose |
|---|---|---|
| `DATABASE_URL` | `sqlite:///./sentiment_platform.db` | DB connection string |
| `MODEL_CACHE_DIR` | `./model_cache` | HuggingFace model cache path |
| `DEVICE` | `auto` | `cpu`, `cuda`, or `auto` |
| `MAX_TEXT_LENGTH` | `512` | Max chars per text |
| `CORS_ORIGINS` | `["http://localhost:5173"]` | Allowed frontend origins |
| `LOG_LEVEL` | `INFO` | Python logging level |
| `SECRET_KEY` | `change-me-in-production` | JWT signing secret |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `1440` | JWT TTL (24 hours) |
| `YOUTUBE_API_KEY` | `""` | YouTube Data API v3 key |
| `INSTAGRAM_USERNAME` | `""` | Instagram credentials |
| `INSTAGRAM_PASSWORD` | `""` | Instagram credentials |
| `INSTAGRAM_SESSION_ID` | `""` | Instagram session cookie |

---

### 5.3 Database

#### `database/connection.py`

- Creates SQLAlchemy `engine` using `DATABASE_URL` from config
- `SessionLocal` — `sessionmaker` factory (autocommit=False, autoflush=False)
- `Base` — `declarative_base()` for all ORM models
- `init_db()` — calls `Base.metadata.create_all(engine)`, then `_migrate_users_table()`, then `_seed_admin()`
- `_migrate_users_table()` — adds `is_active` column to existing `users` table using `ALTER TABLE` wrapped in try/except (idempotent — safe to call on an already-migrated DB)
- `_seed_admin()` — creates a default `admin` user (username: `admin`, password: `admin123`) if none exists
- `get_db()` — FastAPI dependency that yields a session and closes it after the request

#### `database/models.py` — ORM Models

**`User`**

| Column | Type | Description |
|---|---|---|
| `id` | String PK | UUID |
| `username` | String(50) unique | Login username |
| `email` | String(120) unique nullable | Optional email |
| `password_hash` | String(128) | bcrypt hash |
| `role` | String(10) | `"admin"` or `"user"` |
| `is_active` | Boolean default True | If False, user cannot log in (restricted by admin) |
| `created_at` | DateTime | Auto UTC |

**`UserReport`**

| Column | Type | Description |
|---|---|---|
| `id` | String PK | UUID |
| `text` | Text | The text the user reported |
| `model_label` | String nullable | What the model predicted |
| `user_note` | Text nullable | User's note explaining the issue |
| `status` | String | `pending` / `reviewed` / `fixed` |
| `reported_by` | String FK → users.id | Reporter user ID (nullable for anon) |
| `reporter_username` | String nullable | Reporter username snapshot |
| `created_at` | DateTime | Auto UTC |
| `reviewed_at` | DateTime nullable | When admin reviewed |

**`CorrectionEntry`**

| Column | Type | Description |
|---|---|---|
| `id` | String PK | UUID |
| `text` | Text | The corrected text |
| `correct_label` | String | The right label: positive/negative/neutral |
| `model_label` | String nullable | What the model had predicted |
| `keywords` | JSON | List of signal keywords |
| `created_at` | DateTime | Auto UTC |

**`AnalysisRecord`**

| Column | Type | Description |
|---|---|---|
| `id` | String PK | UUID |
| `original_text` | Text | Raw input |
| `detected_language` | String | e.g. "Hindi" |
| `language_code` | String | ISO code e.g. "hi" |
| `translated_text` | Text | English translation (or original) |
| `is_translation` | Boolean | Whether translation occurred |
| `sentiment_label` | String | positive/negative/neutral |
| `sentiment_confidence` | Float | 0.0–1.0 |
| `sentiment_probabilities` | JSON | `{positive, negative, neutral}` |
| `emotion_label` | String | Joy/Anger/etc. |
| `emotion_confidence` | Float | |
| `emotion_scores` | JSON | All emotion scores |
| `tone_label` | String | professional/casual/etc. |
| `tone_intensity` | Float | |
| `tone_scores` | JSON | All tone scores |
| `intent_label` | String | complaint/appreciation/etc. |
| `intent_confidence` | Float | |
| `intent_scores` | JSON | All intent scores |
| `interpretation` | Text | Generated paragraph |
| `suggested_response` | Text | Template reply |
| `word_count` | Integer | |
| `char_count` | Integer | |
| `processing_time` | Float | Seconds |
| `mode` | String | single / bulk / url |
| `batch_id` | String nullable | Groups bulk/URL records |
| `created_at` | DateTime | Auto UTC |

---

### 5.4 Modules — ML Processing

#### `modules/pipeline.py`

**`initialize_models()`**
Called once at startup. Instantiates singletons for all detectors so models are loaded into memory before the first request arrives.

**`analyze_text(text, mode) → dict`**
Full orchestration function:
1. Timestamps start time
2. Strips and validates text
3. Calls `detect_language()`
4. Checks `is_hinglish()` and `is_romanized_hinglish()`
5. Calls `translate()` if non-English
6. Runs `analyze_sentiment()` — also sets `from_correction = True` if the result came from the correction cache
7. Runs `detect_sarcasm()` — flips positive→negative **only if `not from_correction`** (prevents sarcasm from overriding admin-corrected labels)
8. Runs `detect_emotion()` then aligns emotion with sentiment polarity
9. Runs `detect_tone()`
10. Runs `detect_intent()`
11. Calls `generate_interpretation()`
12. Calls `generate_response()`
13. Returns assembled result dict

---

#### `modules/sentiment.py` — `BERTLogisticSentimentAnalyzer`

Singleton class using thread-safe double-check locking.

**Models loaded:**
- `distilbert-base-multilingual-cased` — generates 768-dim text embeddings
- `cardiffnlp/twitter-roberta-base-sentiment-latest` — 3-class sentiment pipeline
- A `LogisticRegression` classifier trained on seed examples

**`_correction_cache`** — in-memory dict mapping `text → correct_label`. Populated at startup from DB and updated when admin fixes a report.

**`analyze(text) → {label, confidence, probabilities}`**
1. **Correction cache check first**: if `text` (or `text.strip()`) exists in `_correction_cache`, return that label immediately with `confidence=1.0` — skips all ML inference
2. Tokenize → DistilBERT embedding → mean-pool
3. LR predicts probabilities (`lr_probs`)
4. RoBERTa pipeline predicts probabilities (`roberta_probs`)
5. Ensemble: `0.35 * lr_probs + 0.65 * roberta_probs`
6. Emoji signal adjustment
7. Normalize
8. If max confidence < 0.55 → return neutral
9. Negative margin guard → return neutral if ambiguous
10. Return winner label

**`apply_single_correction(text, label, keywords)`** — adds to `_correction_cache` immediately without waiting for retrain.

**`retrain_with_corrections(entries)`** — rebuilds `_correction_cache` from a list of `CorrectionEntry` objects (called at startup to restore persisted corrections).

---

#### `modules/emotion.py` — `EmotionDetector`

Singleton, loads `j-hartmann/emotion-english-distilroberta-base`.

**`detect_emotion(text) → {label, confidence, scores}`**
- Runs HuggingFace pipeline top-k classification
- Maps 28 GoEmotions labels to 8 display labels
- Falls back to `{Neutral, 0.5}` on error

---

#### `modules/tone.py` — `ToneDetector`

Singleton, loads `typeform/distilbert-base-uncased-mnli`.

**`detect_tone(text) → {label, intensity, scores}`**
- Zero-shot NLI with 8 candidate labels: `professional, casual, sarcastic, aggressive, critical, appreciative, formal, informal`

---

#### `modules/intent.py` — `IntentDetector`

Singleton, loads `typeform/distilbert-base-uncased-mnli`.

**`detect_intent(text) → {label, confidence, scores}`**
- Zero-shot NLI with 8 labels: `complaint, appreciation, inquiry, request, suggestion, feedback, threat, praise`

---

#### `modules/sarcasm.py` — `SarcasmDetector`

Singleton, loads `cardiffnlp/twitter-roberta-base-irony`.

**`detect_sarcasm(text) → {detected, confidence}`**
- Binary: irony vs non-irony
- `detected=True` only if irony score ≥ 0.70

---

#### `modules/language_detector.py`

**`detect_language(text)`**, **`is_hinglish(text)`**, **`is_romanized_hinglish(text)`** — same as before.

---

#### `modules/translation.py`

**`translate(text, source_lang_code) → (translated_text, was_translated)`**

MarianMT-based translation. Caches loaded model pairs.

---

#### `modules/interpretation.py`

**`generate_interpretation(...) → str`** — rule-based paragraph generator combining all analysis dimensions.

---

#### `modules/response_generator.py`

**`generate_response(sentiment, intent, tone) → str`** — cascading template lookup.

---

#### `modules/analytics.py`

**`get_analytics(db, limit=1000) → dict`** — computes distributions, trends, top words, AI insight from DB records.

---

#### `modules/pdf_generator.py`

Three functions: `generate_url_analysis_pdf`, `generate_single_analysis_pdf`, `generate_bulk_analysis_pdf` — all return bytes.

---

#### `modules/url_fetcher.py`

**`fetch_youtube_comments(url, max_comments)`**, **`fetch_instagram_comments(url, max_comments)`** — return comment lists with post metadata.

---

### 5.5 Routers — API Endpoints

#### `routers/auth.py`

**`POST /api/v1/auth/register`**
- Creates a new user with bcrypt-hashed password, role=`user`
- Returns `{access_token, user}`

**`POST /api/v1/auth/login`**
- Verifies username + password
- Checks `is_active` — raises HTTP 403 if user is restricted: `"Your account has been restricted. Contact an administrator."`
- Returns JWT token + user object

**`GET /api/v1/auth/me`**
- Returns current user from JWT (via `get_current_user` dependency)

---

#### `routers/corrections.py`

CRUD for correction entries + model retraining. **Admin-only.**

| Endpoint | Description |
|---|---|
| `POST /corrections` | Add a correction entry |
| `GET /corrections` | List corrections (limit param) |
| `GET /corrections/stats` | Stats: total, breakdown, top keywords |
| `POST /corrections/retrain` | Retrain model from all DB corrections |
| `DELETE /corrections/{id}` | Delete one correction |
| `GET /corrections/online-status` | Whether online dataset is loaded |
| `POST /corrections/fetch-online` | Fetch online training data |

---

#### `routers/reports.py`

**`POST /api/v1/reports`** — User submits a wrong prediction report.
Stores `UserReport` with status=`pending`.

**`GET /api/v1/reports`** — Admin lists reports (optional `status` filter).

**`GET /api/v1/reports/stats`** — Admin: `{total, pending, reviewed, fixed}` counts.

**`PATCH /api/v1/reports/{id}`** — Admin reviews a report.
- If `status=fixed` and `correct_label` provided:
  1. Creates `CorrectionEntry` in DB
  2. Updates all matching `AnalysisRecord` rows in DB with the corrected label (so History page is immediately correct)
  3. Calls `get_sentiment_analyzer().apply_single_correction(text, label, keywords)` to update in-memory cache
- Returns updated `UserReport`

**`DELETE /api/v1/reports/{id}`** — Admin deletes a report.

---

#### `routers/admin.py`

All endpoints require `require_admin` dependency.

**`GET /api/v1/admin/stats`**
Returns:
```json
{
  "users": {
    "total": 5,
    "admins": 1,
    "regular_users": 4,
    "list": [
      {"id", "username", "email", "role", "is_active", "created_at"}
    ]
  },
  "storage": {
    "db_size_bytes", "db_size_mb", "limit_mb": 500,
    "usage_pct", "analysis_records", "correction_entries",
    "user_reports", "total_records"
  }
}
```

**`PATCH /api/v1/admin/users/{user_id}/restrict`**
- Toggles `user.is_active` (True ↔ False)
- Prevents self-restriction (returns 400)
- Returns `{id, username, is_active}`

**`DELETE /api/v1/admin/users/{user_id}`**
- Deletes the user from DB
- Prevents self-deletion (returns 400)
- Returns `{deleted: username}`

**`DELETE /api/v1/admin/clear-analysis`**
- Deletes all `AnalysisRecord` rows
- Returns `{deleted, message}`

**`DELETE /api/v1/admin/clear-all`**
- Deletes all `AnalysisRecord`, `CorrectionEntry`, `UserReport` rows
- Returns `{deleted, analysis, corrections, reports}`

---

#### `routers/analysis.py`

**`POST /api/v1/analyze`** — Single text analysis. Saves record via BackgroundTask.

---

#### `routers/bulk.py`

**`POST /api/v1/bulk-analyze`** — Bulk analysis, up to 100 texts.
**`POST /api/v1/upload-csv`** — CSV text extraction, up to 500 rows.

---

#### `routers/history.py`

**`GET /api/v1/history`** — Paginated + filtered history.
**`GET /api/v1/history/{id}`** — Single record.
**`DELETE /api/v1/history/{id}`** — Delete one.
**`DELETE /api/v1/history`** — Clear all.

---

#### `routers/analytics.py`

**`GET /api/v1/analytics`** — Dashboard data.

---

#### `routers/url_analysis.py`

**`POST /api/v1/analyze-url`** — YouTube/Instagram analysis.

---

#### `routers/export.py`

**`POST /api/v1/export-pdf`** / **`/single`** / **`/bulk`** — PDF downloads.

---

### 5.6 Schemas — Validation

#### `schemas/analysis.py`

```
SentimentResult, SarcasmResult, EmotionResult, ToneResult, IntentResult
AnalysisRequest, BulkAnalysisRequest
SingleAnalysisResponse, BulkAnalysisItem, BulkAnalysisResponse
AnalyticsResponse
```

#### `schemas/url_analysis.py`

```
URLAnalysisRequest, PostMetadata, URLAnalysisResponse
```

#### `schemas/auth.py`

```
RegisterRequest   {username, password, email?}
LoginRequest      {username, password}
UserOut           {id, username, email, role, created_at}
TokenResponse     {access_token, token_type, user: UserOut}
```

#### `schemas/reports.py`

```
ReportCreate      {text, model_label?, user_note?}
ReportResponse    {id, text, model_label, user_note, status, reporter_username, created_at, reviewed_at}
ReportReview      {status, correct_label?, keywords?}
```

---

### 5.7 Auth — Authentication

#### `auth/deps.py`

- `hash_password(password)` — bcrypt via passlib
- `verify_password(plain, hashed)` — passlib verify
- `create_access_token(user_id, username, role)` — python-jose JWT, signed with `SECRET_KEY`, expires in `ACCESS_TOKEN_EXPIRE_MINUTES`
- `get_current_user(token)` — FastAPI dependency: decodes JWT, queries DB for user
- `get_optional_user(token)` — same but returns `None` instead of raising 401 (used for anonymous-friendly endpoints)
- `require_admin(current_user)` — FastAPI dependency: raises 403 if `user.role != "admin"`

---

## 6. Frontend — File by File

### 6.1 Entry & Routing

#### `src/main.tsx`

- `ReactDOM.createRoot(...).render(...)` in `React.StrictMode`
- Mounts `<Toaster>` globally (React Hot Toast, dark theme)

#### `src/App.tsx`

- Sets up `<BrowserRouter>` with `<Routes>`
- On mount: reads `themeId` from Zustand, calls `applyTheme()`
- **`RequireAdmin` guard component**: reads `user` from store, redirects to `/dashboard` if `user.role !== 'admin'`
- Route map:

| Path | Component | Guard |
|---|---|---|
| `/` | redirect → `/login` | — |
| `/login` | `Login` | — |
| `/register` | `Register` | — |
| `/dashboard` | `Dashboard` | Auth required |
| `/analyze` | `SingleAnalysis` | Auth required |
| `/bulk` | `BulkAnalysis` | Auth required |
| `/url` | `URLAnalysis` | Auth required |
| `/history` | `History` | Auth required |
| `/settings` | `Settings` | Auth required |
| `/training-data` | `TrainingData` | `RequireAdmin` |
| `/user-reports` | `UserReports` | `RequireAdmin` |
| `/admin` | `AdminOverview` | `RequireAdmin` |

All non-auth routes wrapped in `<Layout>`.

---

### 6.2 Pages

#### `pages/Login.tsx`

- Username + password form
- Calls `loginUser(username, password)`
- On success: stores JWT in `localStorage`, sets `user` in Zustand store, redirects to `/dashboard`
- Shows toast on error (including "account restricted" 403 message)

#### `pages/Register.tsx`

- Username, password, optional email form
- Calls `registerUser(username, password, email)`
- On success: same token/user storage as login

---

#### `pages/Dashboard.tsx`

Fetches analytics on mount. Renders:

- **Header**: Title (gradient text) — no refresh button in header
- **KPI Row** (6 cards): Total Analyzed, Dominant Sentiment, Dominant Emotion, Dominant Tone, Dominant Intent, Avg Confidence — each shows the dominant label value + a percentage metric ("X% of total") underneath
- **Charts row 1** (3 columns):
  - `PieChart`: Sentiment distribution
  - `BarChart`: Top 6 emotions (vertical bars)
  - `PieChart`: Language distribution
- **Charts row 2** (2 columns):
  - Horizontal `BarChart` (`layout="vertical"`): Tone breakdown (all 8 tones)
  - Horizontal `BarChart` (`layout="vertical"`): Intent breakdown (all 8 intents)
- **Line Chart**: Sentiment trend over last 30 days (3 lines: positive/negative/neutral + total volume line)
- **Word Cloud**: Top 50 words
- **Recent Activity**: Last 10 analyses
- **AI Insight**: Generated summary paragraph

Loading: all sections show `<Skeleton>` placeholders. TOOLTIP_STYLE constant for consistent Recharts tooltips.

---

#### `pages/SingleAnalysis.tsx`

- **Input**: `<Textarea>` with 5000 char limit + 6 example chips
- **Result section**:
  - `<LanguageCard>`, `<SentimentCard>`, `<EmotionCard>`, `<ToneCard>`, `<IntentCard>`, `<InterpretationCard>`, `<ResponseCard>`
  - Export PDF button
  - *(Processing Time / Word Count / Characters stats row removed)*

---

#### `pages/BulkAnalysis.tsx`

Two tabs: Text Input and CSV Upload. Results panel: KPIs, distributions, paginated table (15/page) with search + sentiment filter, Export PDF button.

---

#### `pages/URLAnalysis.tsx`

URL input, platform detection badge, max comments slider. Results: post metadata, KPIs, distributions, Most Positive/Negative highlights, comments table, Export PDF button. *(processing_time display removed from results header)*

---

#### `pages/History.tsx`

Paginated history browser (20/page). Filter bar: text search + sentiment dropdown. Expandable rows with full analysis details. Clear All button. *(Processing time badge removed from each row)*

---

#### `pages/Settings.tsx`

API config, model info, theme selector (6 themes), animation toggle, About section.

---

#### `pages/AdminOverview.tsx`

**Admin-only.** Full user management and storage control panel.

**KPI Row** (4 cards): Total Users, Admins, Regular Users, Analysis Records.

**Storage Card**:
- Animated gauge bar (green <60%, amber 60–85%, red ≥85%) against a 500 MB soft cap
- Breakdown: DB file size, analysis records, correction entries, user reports
- **Clear Analysis Data** button (clears `AnalysisRecord` table)
- **Clear All Data** button (clears analyses + corrections + reports)
- Both have a two-step confirmation dialog before executing

**Registered Users Card**:
- **Search input** — filters user list by username in real-time (with clear ✕ button)
- Shows count "N shown" in header
- Per-user row:
  - Avatar icon (ShieldCheck for admin, UserIcon for user)
  - Username + "(you)" label for the current logged-in admin
  - Email + creation date
  - **"Restricted" badge** (red) if `is_active=false`
  - Role badge (indigo for admin, grey for user)
  - **Restrict/Unrestrict button** (Ban icon when active, Unlock icon when restricted) — toggles `is_active` via `PATCH /admin/users/:id/restrict`; updates list optimistically without full reload
  - **Delete button** (UserX icon) — clicking shows inline "Delete? ✓ ✗" confirmation; confirming calls `DELETE /admin/users/:id` and removes user from list
  - Restricted rows are visually dimmed (opacity-60) with a red-tinted border
  - Action buttons are hidden for the current admin user (self-protection)

---

#### `pages/UserReports.tsx`

**Admin-only.** Lists user-submitted wrong prediction reports. Admin can mark as reviewed or fixed (with correct label input). Fixing a report auto-creates a correction entry, updates all matching history records, and updates the in-memory correction cache.

---

#### `pages/TrainingData.tsx`

**Admin-only.** Lists all correction entries. Admin can retrain the model, delete individual corrections, view stats.

---

### 6.3 Analysis Component Cards

| Component | Displays |
|---|---|
| `SentimentCard` | Label badge, confidence, probability bars — *Correct button removed (admin-only feature via UserReports)* |
| `EmotionCard` | Emotion label + icon, confidence, score bars for 8 emotions |
| `ToneCard` | Tone label, intensity bar, score bars for 8 tones |
| `IntentCard` | Intent label, confidence, score bars for 8 intents |
| `LanguageCard` | Language + badge, code, original/translated text preview |
| `InterpretationCard` | Full interpretation paragraph |
| `ResponseCard` | Suggested response text |

---

### 6.4 UI Primitives

All in `src/components/ui/`.

| Component | Props / Behaviour |
|---|---|
| `Card` | `className?` — consistent rounded border box |
| `Button` | `variant` (primary/outline/ghost/danger), `size`, `loading`, `icon`, `disabled` |
| `Input` | `label?`, `icon?`, `error?`, character count |
| `Textarea` | `label?`, `maxLength`, counter, resizable |
| `Select` | `label?`, `options[]`, controlled |
| `Badge` | `variant` (primary/default/positive/negative/neutral/danger) |
| `Progress` | `value` (0–1), `label?`, `color?` |
| `Skeleton` | Animated gray placeholder box |
| `Toast` | React Hot Toast configured with dark theme |

---

### 6.5 Layout Components

#### `components/Layout.tsx`

Renders `<Sidebar>` + `<Outlet>`. No sticky status bar or correction panel.

#### `components/Sidebar.tsx`

- Logo + navigation items with Lucide icons
- **Admin Overview** nav item (ShieldCheck icon, `/admin` route) — visible only when `user.role === 'admin'`
- Collapse toggle (icons only vs icons + labels)
- **Backend health widget** at the bottom (replaces the old static "AI Powered" badge):
  - Polls `GET /health` every 30 seconds + on mount
  - Shows green "Backend Connected" / red "Backend Offline" with Wifi/WifiOff icon
  - Refresh button (RefreshCw) to manually re-check
  - Icons are vertically aligned with `translate-y-px`

#### `components/BackendStatus.tsx`

Standalone health indicator component used inside the Sidebar. Accepts `status` and `loading` props, renders the Wifi/WifiOff icon + label + refresh button.

---

### 6.6 State & API Layer

#### `store/index.ts` — Zustand Store

```ts
{
  // Auth
  user: User | null
  token: string | null           // persisted to localStorage (key: sentimentiq_token)

  // Analysis results
  lastAnalysis: SingleAnalysisResponse | null
  lastBulkAnalysis: BulkAnalysisResponse | null
  lastURLAnalysis: URLAnalysisResponse | null
  analytics: AnalyticsData | null

  // UI state
  isAnalyzing: boolean
  isBulkAnalyzing: boolean
  isURLAnalyzing: boolean
  sidebarCollapsed: boolean
  themeId: string               // persisted to localStorage
}
```

Actions: `setUser`, `setToken`, `logout`, `set*` for analysis state, `toggleSidebar`, `setThemeId`.

#### `lib/api.ts` — Axios Client

Base URL: `VITE_API_URL` or `http://localhost:8000/api/v1`
Timeout: 120 seconds
Auth: request interceptor adds `Authorization: Bearer <token>` from `localStorage`

Response interceptor extracts `error.response.data.detail` for user-friendly messages. Handles blob responses (PDF) correctly.

| Function | Method | Endpoint |
|---|---|---|
| `analyzeText(text)` | POST | `/analyze` |
| `bulkAnalyze(texts[])` | POST | `/bulk-analyze` |
| `uploadCSV(file)` | POST | `/upload-csv` |
| `getAnalytics()` | GET | `/analytics` |
| `getHistory(params)` | GET | `/history` |
| `deleteHistoryRecord(id)` | DELETE | `/history/{id}` |
| `clearHistory()` | DELETE | `/history` |
| `analyzeURL(url, n)` | POST | `/analyze-url` |
| `exportURLAnalysisPDF(data)` | POST | `/export-pdf` |
| `exportSingleAnalysisPDF(data)` | POST | `/export-pdf/single` |
| `exportBulkAnalysisPDF(data)` | POST | `/export-pdf/bulk` |
| `checkHealth()` | GET | `/health` (base URL, not `/api/v1`) |
| `loginUser(username, password)` | POST | `/auth/login` |
| `registerUser(username, password, email?)` | POST | `/auth/register` |
| `getCurrentUser()` | GET | `/auth/me` |
| `submitReport(payload)` | POST | `/reports` |
| `getReports(status?, limit)` | GET | `/reports` |
| `getReportStats()` | GET | `/reports/stats` |
| `reviewReport(id, payload)` | PATCH | `/reports/{id}` |
| `deleteReport(id)` | DELETE | `/reports/{id}` |
| `addCorrection(data)` | POST | `/corrections` |
| `getCorrections(limit)` | GET | `/corrections` |
| `getCorrectionStats()` | GET | `/corrections/stats` |
| `retrainModel()` | POST | `/corrections/retrain` |
| `deleteCorrection(id)` | DELETE | `/corrections/{id}` |
| `getAdminStats()` | GET | `/admin/stats` |
| `clearAnalysisRecords()` | DELETE | `/admin/clear-analysis` |
| `clearAllData()` | DELETE | `/admin/clear-all` |
| `restrictUser(userId)` | PATCH | `/admin/users/{id}/restrict` |
| `deleteUser(userId)` | DELETE | `/admin/users/{id}` |

---

### 6.7 Utilities & Themes

#### `lib/utils.ts`

| Function | Returns |
|---|---|
| `getSentimentColor(label)` | RGB string for charts |
| `getSentimentBg(label)` | Tailwind bg class |
| `getSentimentTextColor(label)` | Tailwind text class |
| `getEmotionColor(label)` | Hex color for emotion |
| `capitalize(text)` | First-letter uppercase |
| `truncateText(text, limit)` | `...` truncation |
| `formatDate(iso)` | Relative: "2 hours ago" |
| `formatConfidence(val)` | `"87.4%"` |
| `cn(...classes)` | `clsx` + `tailwind-merge` |

#### `lib/themes.ts`

6 theme definitions: `dark`, `indigo`, `violet`, `rose`, `green`, `amber`.
`applyTheme(theme)` sets CSS variables on `document.documentElement`.

---

### 6.8 Types

#### `types/index.ts`

```ts
// Auth
User                { id, username, email, role: 'admin'|'user', created_at }

// Analysis
SentimentResult, SarcasmResult, EmotionResult, ToneResult, IntentResult
SingleAnalysisResponse
BulkAnalysisItem, BulkAnalysisResponse
PostMetadata, URLAnalysisResponse
AnalyticsData       { trend_data[], top_words[], recent_reviews[], ... }
HistoryRecord

// Reports
UserReport          { id, text, model_label, user_note, status, reporter_username, created_at, reviewed_at }
ReportStats         { total, pending, reviewed, fixed }

// Corrections
CorrectionEntry     { id, text, correct_label, model_label, keywords[], created_at }
CorrectionStats     { total, retrain_threshold, needs_retrain, label_breakdown, top_keywords[], last_retrain }

// Admin
AdminUserEntry      { id, username, email, role, is_active, created_at }
AdminStats          { users: { total, admins, regular_users, list: AdminUserEntry[] }, storage: { ... } }
```

---

## 7. ML Models Reference

| Task | Model ID | Type | Labels / Output |
|---|---|---|---|
| Sentiment (embedding) | `distilbert-base-multilingual-cased` | Feature extractor | 768-dim embedding |
| Sentiment (classification) | `cardiffnlp/twitter-roberta-base-sentiment-latest` | 3-class | positive / negative / neutral |
| Sentiment (ensemble) | Logistic Regression (in-memory) | 3-class | Trained on seed + corrections |
| Emotion | `j-hartmann/emotion-english-distilroberta-base` | 28-class | Joy / Anger / Disgust / Disappointment / Frustration / Excitement / Appreciation / Neutral |
| Tone | `typeform/distilbert-base-uncased-mnli` | Zero-shot NLI | professional / casual / sarcastic / aggressive / critical / appreciative / formal / informal |
| Intent | `typeform/distilbert-base-uncased-mnli` | Zero-shot NLI | complaint / appreciation / inquiry / request / suggestion / feedback / threat / praise |
| Sarcasm | `cardiffnlp/twitter-roberta-base-irony` | Binary | irony / non-irony (threshold 0.70) |
| Language | `langdetect` | Statistical n-gram | ISO 639-1 code |
| Translation | `Helsinki-NLP/opus-mt-{src}-en` | Seq2Seq (MarianMT) | English text |

---

## 8. API Endpoints Reference

Base URL: `http://localhost:8000/api/v1`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/health` | — | Backend health check |
| GET | `/` | — | Version info |
| POST | `/auth/register` | — | Register new user |
| POST | `/auth/login` | — | Login, get JWT |
| GET | `/auth/me` | User | Current user info |
| POST | `/analyze` | User | Single text analysis |
| POST | `/bulk-analyze` | User | Bulk analysis (≤100 texts) |
| POST | `/upload-csv` | User | CSV text extraction |
| GET | `/analytics` | User | Dashboard analytics data |
| GET | `/history` | User | Paginated history with filters |
| GET | `/history/{id}` | User | Single history record |
| DELETE | `/history/{id}` | User | Delete one record |
| DELETE | `/history` | User | Clear all records |
| POST | `/analyze-url` | User | YouTube/Instagram comment analysis |
| POST | `/export-pdf` | User | Export URL analysis PDF |
| POST | `/export-pdf/single` | User | Export single analysis PDF |
| POST | `/export-pdf/bulk` | User | Export bulk analysis PDF |
| POST | `/reports` | User | Submit wrong prediction report |
| GET | `/reports` | Admin | List reports |
| GET | `/reports/stats` | Admin | Report counts by status |
| PATCH | `/reports/{id}` | Admin | Review / fix a report |
| DELETE | `/reports/{id}` | Admin | Delete a report |
| POST | `/corrections` | Admin | Add correction entry |
| GET | `/corrections` | Admin | List corrections |
| GET | `/corrections/stats` | Admin | Correction stats |
| POST | `/corrections/retrain` | Admin | Retrain model |
| DELETE | `/corrections/{id}` | Admin | Delete correction |
| GET | `/admin/stats` | Admin | User counts + storage stats |
| PATCH | `/admin/users/{id}/restrict` | Admin | Toggle user is_active |
| DELETE | `/admin/users/{id}` | Admin | Delete user |
| DELETE | `/admin/clear-analysis` | Admin | Clear all analysis records |
| DELETE | `/admin/clear-all` | Admin | Clear analyses + corrections + reports |

---

## 9. Data Flow Walkthroughs

### Single Text Analysis

```
User types text → clicks "Analyze"
        │
        ▼
SingleAnalysis.tsx
  analyzeText(text)               ← lib/api.ts → POST /analyze
        │
        ▼
routers/analysis.py
  validate (len, not empty)
  analyze_text(text, "single")    ← modules/pipeline.py
        │
        ▼  [correction cache check → ML pipeline]
        │
        ▼
  BackgroundTask: save AnalysisRecord to DB
  return SingleAnalysisResponse
        │
        ▼
SingleAnalysis.tsx renders result cards
```

---

### Admin Fixes a Wrong Prediction

```
User submits report via UI
        │
        ▼
POST /reports → UserReport{status: "pending"} saved in DB
        │
        ▼
Admin opens UserReports page → sees pending report
Admin selects correct label → clicks "Fix"
        │
        ▼
PATCH /reports/{id}  {status: "fixed", correct_label: "negative"}
        │
        ▼
routers/reports.py:
  1. Creates CorrectionEntry in DB
  2. Queries all AnalysisRecord WHERE original_text == report.text
     → updates sentiment_label, confidence, probabilities for each
  3. Calls analyzer.apply_single_correction(text, label, keywords)
     → adds to _correction_cache immediately
        │
        ▼
Next time user analyzes same text:
  pipeline.py calls analyze_text()
    → sentiment.py checks _correction_cache first
    → returns corrected label with confidence=1.0
    → sarcasm override skipped (from_correction=True)
        │
        ▼
Correct result returned — no ML inference needed
History page also shows correct label (DB was updated)
```

---

### Admin Restricts a User

```
Admin opens Admin Overview → sees user list
Admin clicks Ban icon on a user row
        │
        ▼
PATCH /admin/users/{id}/restrict
  → toggles user.is_active in DB
  → returns {id, username, is_active: false}
        │
        ▼
Frontend updates user row optimistically:
  - is_active=false → row dims, red "Restricted" badge appears
  - Ban icon changes to Unlock icon
        │
        ▼
Next time that user attempts to login:
POST /auth/login
  → checks is_active → raises HTTP 403
  → "Your account has been restricted. Contact an administrator."
```

---

### Correction Cache Persistence Across Restarts

```
Server restarts
        │
        ▼
main.py lifespan startup:
  1. init_db() → create/migrate tables
  2. initialize_models() → load ML models
  3. Query all CorrectionEntry rows from DB
     → call retrain_with_corrections(entries)
     → rebuilds _correction_cache dict from DB
        │
        ▼
All previously admin-approved corrections are live again
without needing to retrain or re-submit anything
```

---

### Dashboard Load

```
Dashboard.tsx mounts
        │
        └── getAnalytics()        ← GET /analytics
              │
              ▼
        modules/analytics.py
          query last 1000 records
          Counter distributions (sentiment, emotion, tone, intent, language)
          trend data (30 days)
          top 50 words
          recent 10 reviews
          AI insight sentence
          return AnalyticsData
              │
              ▼
        Dashboard.tsx renders:
          KPI cards with % metrics
          Sentiment PieChart
          Emotion BarChart
          Language PieChart
          Tone horizontal BarChart
          Intent horizontal BarChart
          Trend LineChart (with total volume)
          Word cloud, recent activity, AI insight
```

---

## 10. Database Schema

```sql
CREATE TABLE users (
    id              TEXT PRIMARY KEY,
    username        TEXT NOT NULL UNIQUE,
    email           TEXT UNIQUE,
    password_hash   TEXT NOT NULL,
    role            TEXT NOT NULL DEFAULT 'user',    -- 'admin' or 'user'
    is_active       INTEGER NOT NULL DEFAULT 1,      -- 0 = restricted, 1 = active
    created_at      DATETIME DEFAULT (datetime('now'))
);

CREATE TABLE user_reports (
    id                  TEXT PRIMARY KEY,
    text                TEXT NOT NULL,
    model_label         TEXT,
    user_note           TEXT,
    status              TEXT NOT NULL DEFAULT 'pending',  -- pending/reviewed/fixed
    reported_by         TEXT REFERENCES users(id),
    reporter_username   TEXT,
    created_at          DATETIME DEFAULT (datetime('now')),
    reviewed_at         DATETIME
);

CREATE TABLE correction_entries (
    id              TEXT PRIMARY KEY,
    text            TEXT NOT NULL,
    correct_label   TEXT NOT NULL,
    model_label     TEXT,
    keywords        TEXT,   -- JSON array
    created_at      DATETIME DEFAULT (datetime('now'))
);

CREATE TABLE analysis_records (
    id                      TEXT PRIMARY KEY,
    original_text           TEXT NOT NULL,
    detected_language       TEXT,
    language_code           TEXT,
    translated_text         TEXT,
    is_translation          BOOLEAN,
    sentiment_label         TEXT,
    sentiment_confidence    REAL,
    sentiment_probabilities TEXT,   -- JSON
    emotion_label           TEXT,
    emotion_confidence      REAL,
    emotion_scores          TEXT,   -- JSON
    tone_label              TEXT,
    tone_intensity          REAL,
    tone_scores             TEXT,   -- JSON
    intent_label            TEXT,
    intent_confidence       REAL,
    intent_scores           TEXT,   -- JSON
    interpretation          TEXT,
    suggested_response      TEXT,
    word_count              INTEGER,
    char_count              INTEGER,
    processing_time         REAL,
    mode                    TEXT,   -- single | bulk | url
    batch_id                TEXT,
    created_at              DATETIME DEFAULT (datetime('now'))
);
```

> **Migration note**: `is_active` was added to the `users` table after initial deployment. `_migrate_users_table()` in `connection.py` handles this with `ALTER TABLE users ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1` wrapped in try/except, making it safe to run on both new and existing databases.

---

## 11. Environment Variables

### Backend (`backend/.env`)

```env
DATABASE_URL=sqlite:///./sentiment_platform.db
MODEL_CACHE_DIR=./model_cache
DEVICE=auto
MAX_TEXT_LENGTH=512
CORS_ORIGINS=["http://localhost:5173","http://localhost:3000"]
LOG_LEVEL=INFO
SECRET_KEY=change-me-in-production
ACCESS_TOKEN_EXPIRE_MINUTES=1440
YOUTUBE_API_KEY=<your-key>
INSTAGRAM_USERNAME=<username>
INSTAGRAM_PASSWORD=<password>
INSTAGRAM_SESSION_ID=<session-cookie>
```

### Frontend (`frontend/.env`)

```env
VITE_API_URL=http://localhost:8000/api/v1
```

---

## 12. Sample Requests & Responses

### Login

**Request**
```http
POST /api/v1/auth/login
Content-Type: application/json

{"username": "admin", "password": "admin123"}
```

**Response**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user": {
    "id": "a1b2c3...",
    "username": "admin",
    "email": "admin@sentimentiq.com",
    "role": "admin",
    "created_at": "2025-06-11T10:00:00"
  }
}
```

---

### Admin Stats

**Request**
```http
GET /api/v1/admin/stats
Authorization: Bearer <admin-token>
```

**Response**
```json
{
  "users": {
    "total": 3,
    "admins": 1,
    "regular_users": 2,
    "list": [
      {"id": "...", "username": "admin", "email": "admin@sentimentiq.com", "role": "admin", "is_active": true, "created_at": "2025-06-11T10:00:00"},
      {"id": "...", "username": "alice", "email": null, "role": "user", "is_active": true, "created_at": "2025-06-12T09:30:00"},
      {"id": "...", "username": "bob", "email": null, "role": "user", "is_active": false, "created_at": "2025-06-13T14:00:00"}
    ]
  },
  "storage": {
    "db_size_bytes": 204800,
    "db_size_mb": 0.2,
    "limit_mb": 500,
    "usage_pct": 0.04,
    "analysis_records": 47,
    "correction_entries": 3,
    "user_reports": 2,
    "total_records": 52
  }
}
```

---

### Fix a Report

**Request**
```http
PATCH /api/v1/reports/abc-123
Authorization: Bearer <admin-token>
Content-Type: application/json

{"status": "fixed", "correct_label": "negative", "keywords": ["terrible", "awful"]}
```

**Response**
```json
{
  "id": "abc-123",
  "text": "Wow this is just amazing...",
  "model_label": "positive",
  "user_note": "This is sarcastic, should be negative",
  "status": "fixed",
  "reporter_username": "alice",
  "created_at": "2025-06-14T11:00:00",
  "reviewed_at": "2025-06-16T09:30:00"
}
```

---

### Single Analysis

**Request**
```http
POST /api/v1/analyze
Authorization: Bearer <token>
Content-Type: application/json

{"text": "This product is absolutely amazing! Delivered fast and works perfectly."}
```

**Response**
```json
{
  "id": "a1b2c3d4-...",
  "original_text": "This product is absolutely amazing! ...",
  "detected_language": "English",
  "language_code": "en",
  "translated_text": "This product is absolutely amazing! ...",
  "is_translation": false,
  "sentiment": {"label": "positive", "confidence": 0.95, "probabilities": {"positive": 0.95, "negative": 0.03, "neutral": 0.02}},
  "sarcasm": {"detected": false, "confidence": 0.12},
  "emotion": {"label": "Joy", "confidence": 0.89, "scores": {"Joy": 0.89, "Excitement": 0.07, "Neutral": 0.02, "Appreciation": 0.02}},
  "tone": {"label": "appreciative", "intensity": 0.82, "scores": {...}},
  "intent": {"label": "appreciation", "confidence": 0.78, "scores": {...}},
  "interpretation": "The reviewer expresses a strongly positive sentiment...",
  "suggested_response": "Thank you so much for your wonderful feedback!...",
  "processing_time": 1.234,
  "timestamp": "2025-06-16T10:30:45.123Z",
  "word_count": 12,
  "char_count": 71
}
```

---

*Updated: 2026-06-16*
