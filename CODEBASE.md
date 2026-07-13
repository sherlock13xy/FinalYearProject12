# Codebase Gist — Sentiment Intelligence Platform

## What this project is

A full-stack, multilingual NLP analytics platform (Final Year Project). It takes raw text — typed directly, uploaded as a CSV, or scraped from a YouTube/Myntra URL — and runs it through an 8-stage AI pipeline that produces sentiment, sarcasm, emotion, tone, intent, a human-readable interpretation, and a suggested reply. Results are persisted to SQLite, aggregated into a live analytics dashboard, exportable as branded PDF reports, and improvable over time through an admin-driven correction/retraining loop.

**Stack:** FastAPI + SQLAlchemy + SQLite backend, HuggingFace Transformers/PyTorch models, React 18 + TypeScript + Vite + Tailwind frontend, Zustand for state, JWT-based auth with role-based (`user` / `admin`) access control.

---

## 1. System Architecture

```
┌──────────────────────────────┐         HTTPS/JSON          ┌───────────────────────────────┐
│   React 18 + TS Frontend     │ ───────────────────────────▶ │   FastAPI Backend (Python)    │
│   (Vite dev server :5173)    │ ◀─────────────────────────── │   (Uvicorn :8000)             │
│                               │        Bearer JWT             │                                │
│  Zustand store (auth, theme) │                               │  Routers → Modules → Models    │
│  Axios client (lib/api.ts)   │                               │  SQLAlchemy ORM → SQLite       │
└──────────────────────────────┘                               └───────────────┬───────────────┘
                                                                                 │
                                                        ┌────────────────────────┼────────────────────────┐
                                                        ▼                        ▼                        ▼
                                              HuggingFace Transformers   YouTube Data API v3      Myntra (curl_cffi,
                                              models (cached locally,    (comment fetch)          browser-impersonation
                                              PyTorch CPU/CUDA)                                    scraping of reviews API)
```

**Request flow for a typical analysis:** Frontend → `POST /api/v1/analyze` (JWT in header) → `routers/analysis.py` → `modules/pipeline.analyze_text()` runs the 8-step AI pipeline → result persisted as an `AnalysisRecord` row → JSON returned to frontend → rendered as per-signal cards on `SingleAnalysis.tsx`.

---

## 2. The Core AI Pipeline (`modules/pipeline.py::analyze_text`)

Every piece of text — typed, CSV row, or scraped comment — passes through the same pipeline:

```
                                  INPUT TEXT
                                       │
                         ┌─────────────▼─────────────┐
                         │ 1. LANGUAGE DETECTION      │  langdetect + Hinglish heuristics
                         │    (language_detector.py)  │  (Devanagari & Romanized Hindi)
                         └─────────────┬──────────────┘
                                       │ non-English only
                         ┌─────────────▼──────────────┐
                         │ 2. TRANSLATION              │  Google Translate (deep-translator) first,
                         │    (translation.py)          │  MarianMT (opus-mt-*) as offline fallback.
                         │                               │  Skipped entirely for romanized Hinglish
                         └─────────────┬──────────────┘
                                       │
                         ┌─────────────▼──────────────┐
                         │ 3. CORRECTION CACHE LOOKUP  │  Exact/case-insensitive match against
                         │    (pipeline._lookup_        │  admin-approved corrections. If hit,
                         │     correction)               │  skips model inference entirely and
                         │                               │  forces 94% confidence on that label.
                         └─────────────┬──────────────┘
                                       │ (cache miss)
                         ┌─────────────▼──────────────┐
                         │ 4. SENTIMENT ANALYSIS        │  DistilBERT-multilingual → 768-dim
                         │    (sentiment.py)             │  embedding → Logistic Regression (35%)
                         │                               │  + Twitter-RoBERTa-sentiment (65%)
                         │                               │  + emoji signal adjustment
                         └─────────────┬──────────────┘
                                       │
                         ┌─────────────▼──────────────┐
                         │ 5. SARCASM DETECTION         │  twitter-roberta-base-irony, threshold
                         │    (sarcasm.py)               │  0.70 → flips positive→negative
                         │                               │  (skipped if label came from a           │
                         │                               │   correction — human override wins)      │
                         └─────────────┬──────────────┘
                                       │
                         ┌─────────────▼──────────────┐
                         │ 6. EMOTION DETECTION         │  GoEmotions distilRoBERTa + sentiment-
                         │    (emotion.py)               │  emotion alignment post-processing
                         └─────────────┬──────────────┘
                                       │
                    ┌──────────────────┴──────────────────┐
          ┌─────────▼─────────┐                 ┌─────────▼─────────┐
          │ 7a. TONE           │                 │ 7b. INTENT         │
          │ (tone.py)           │                 │ (intent.py)         │
          │ Zero-shot NLI       │                 │ Zero-shot NLI       │
          │ DistilBERT-MNLI     │                 │ DistilBERT-MNLI     │
          │ 8 classes           │                 │ 8 classes           │
          └─────────┬─────────┘                 └─────────┬─────────┘
                    └──────────────────┬──────────────────┘
                         ┌─────────────▼──────────────┐
                         │ 8a. INTERPRETATION           │  Rule-based synthesis of all signals
                         │     (interpretation.py)       │
                         └─────────────┬──────────────┘
                         ┌─────────────▼──────────────┐
                         │ 8b. SUGGESTED RESPONSE       │  Template lookup keyed by
                         │     (response_generator.py)   │  sentiment × intent × tone
                         └─────────────┬──────────────┘
                                       ▼
                                  FINAL RESULT
             {sentiment, sarcasm, emotion, tone, intent, interpretation,
              suggested_response, language, translation, processing_time}
```

### AI models used

| Stage | Model | Notes |
|---|---|---|
| Sentiment | `distilbert-base-multilingual-cased` (embeddings) + Logistic Regression | LR trained in-memory at startup on seed examples; 35% ensemble weight |
| Sentiment | `cardiffnlp/twitter-roberta-base-sentiment-latest` | Tweet-native, 65% ensemble weight |
| Sarcasm | `cardiffnlp/twitter-roberta-base-irony` | Threshold 0.70, flips positive→negative |
| Emotion | `j-hartmann/emotion-english-distilroberta-base` (GoEmotions) | Aligned against sentiment post-hoc |
| Tone + Intent | `typeform/distilbert-base-uncased-mnli` | Zero-shot NLI, shared model, two label sets |
| Translation | Google Translate (`deep-translator`, no API key) → Helsinki-NLP `opus-mt-*` (MarianMT) fallback | Google Translate tried first for any language; MarianMT per-language models used only if it fails |

**Supported languages:** English, Hindi, Bengali, Assamese, Hinglish (Devanagari + Roman), Urdu, Tamil, Telugu, Gujarati, French, German, Spanish, Italian, Portuguese, Russian, Chinese, Japanese, Korean, Arabic.

---

## 3. URL Analysis Flow (YouTube / Myntra)

```
URL pasted ──► modules/url_fetcher.detect_platform()
                     │
        ┌────────────┴────────────┐
        ▼                         ▼
YouTube URL                Myntra product URL
  │                                │
  ▼                                ▼
YouTube Data API v3         curl_cffi session impersonating Chrome 120
(video metadata +           → loads product page (title) → paginates
 up to 100 top comments      Myntra's internal /web/v1/reviews/product/{id}
 via commentThreads.list)    API → up to 100 reviews
        │                                │
        └────────────┬───────────────────┘
                      ▼
        each comment/review → full 8-step pipeline above
                      ▼
        aggregate: dominant sentiment/emotion/tone/intent + per-comment table
```

Myntra has no public reviews API, so `fetch_myntra_reviews()` in `modules/url_fetcher.py` impersonates a real Chrome browser via `curl_cffi` (TLS/JA3 fingerprint spoofing) to avoid being blocked, extracts the product ID from the URL path, scrapes the `<title>` tag for the product name, then paginates Myntra's internal reviews JSON endpoint directly.

---

## 4. Auth & Role-Based Access

```
Register/Login ──► auth/deps.py issues JWT (HS256, 7-day expiry, role embedded)
                           │
                 Bearer token on every request
                           │
        ┌──────────────────┴───────────────────┐
        ▼                                        ▼
  get_current_user()                     require_admin()
  (any authenticated user)                (role must be "admin", else 403)
        │                                        │
  analyze / bulk / history /             admin/*, corrections/*,
  url-analysis / export / reports        training-data, user-reports pages
  (submit only)                          (review + resolve)
```

- Passwords hashed with bcrypt (`passlib`).
- `is_active` flag lets admins restrict a user's account without deleting it.
- Frontend guards routes client-side (`RequireAuth`, `RequireAdmin` in `App.tsx`) in addition to backend 401/403 enforcement.

---

## 5. Continuous-Improvement / Feedback Loop

This is the platform's self-correction mechanism — the most distinctive architectural piece beyond the base pipeline:

```
User sees a wrong result on SingleAnalysis/BulkAnalysis/URLAnalysis
        │  (ReportModal.tsx)
        ▼
POST /api/v1/reports  ──►  UserReport row (status="pending")
        │
        ▼  Admin reviews on UserReports.tsx (User Reports admin page)
PATCH /api/v1/reports/{id}  { status: "fixed", correct_label, keywords }
        │
        ├──► creates a CorrectionEntry row (text, correct_label, keywords)
        ├──► retroactively updates matching AnalysisRecord rows so History
        │      reflects the fix immediately
        └──► pushes the correction into the in-memory correction cache
               (SentimentAnalyzer._correction_cache) for instant effect
                      │
                      ▼
        Next analyze_text() call on that exact text short-circuits the
        model ensemble and returns the corrected label (see pipeline step 3)
```

Additional admin tooling around this loop (`routers/corrections.py`, `TrainingData.tsx`):
- `GET /corrections/stats` — label breakdown + top correction keywords, `needs_retrain` flips true at 20 pending corrections (`RETRAIN_THRESHOLD`).
- `POST /corrections/fetch-online` — pulls additional labeled samples to enrich the seed training set.
- `POST /corrections/retrain` — rebuilds the Logistic Regression head using all accumulated corrections.
- Corrections persist in SQLite and are **reloaded into the in-memory cache on every server restart** (see `main.py` lifespan handler), so fixes are never lost.

---

## 6. Admin Panel (`AdminOverview.tsx`, `routers/admin.py`)

- **User management:** list all users, toggle `is_active` (restrict/unrestrict), delete users (cannot self-restrict/self-delete).
- **Storage gauge:** SQLite file size vs. a 500 MB soft cap, plus row counts for analyses/corrections/reports.
- **Data lifecycle:** `DELETE /admin/clear-analysis` (wipe analysis history) and `DELETE /admin/clear-all` (wipe analyses + corrections + reports, users kept).

---

## 7. Directory Structure

```
FinalYearProject/
├── backend/
│   ├── main.py                      # FastAPI app, CORS, router mounts, lifespan startup
│   ├── config.py                    # Pydantic settings (.env-driven)
│   │
│   ├── auth/
│   │   └── deps.py                  # JWT issue/verify, bcrypt hashing, get_current_user/require_admin
│   │
│   ├── modules/                     # AI/ML pipeline + integrations
│   │   ├── pipeline.py              # Orchestration — analyze_text(), correction lookup, emotion alignment
│   │   ├── language_detector.py     # langdetect + Hinglish heuristics
│   │   ├── translation.py           # translate_to_english(): Google Translate primary, MarianMT fallback
│   │   ├── sentiment.py             # BERT+LR ensemble, correction cache, retraining, online data fetch
│   │   ├── sarcasm.py               # twitter-roberta-base-irony detector
│   │   ├── emotion.py               # GoEmotions distilRoBERTa
│   │   ├── tone.py                  # Zero-shot NLI tone classifier
│   │   ├── intent.py                # Zero-shot NLI intent classifier
│   │   ├── interpretation.py        # Rule-based contextual synthesis
│   │   ├── response_generator.py    # Template response suggestions
│   │   ├── analytics.py             # Dashboard aggregation + insights
│   │   ├── url_fetcher.py           # YouTube Data API + Myntra reviews scraper (curl_cffi)
│   │   └── pdf_generator.py         # PDF export (fpdf2)
│   │
│   ├── routers/
│   │   ├── analysis.py              # POST /analyze
│   │   ├── bulk.py                  # POST /bulk-analyze, POST /upload-csv
│   │   ├── analytics.py             # GET /analytics
│   │   ├── history.py               # GET/DELETE /history
│   │   ├── url_analysis.py          # POST /analyze-url
│   │   ├── export.py                # POST /export/pdf/*
│   │   ├── auth.py                  # POST /auth/register, /auth/login, GET /auth/me
│   │   ├── corrections.py           # Correction CRUD + retrain + online-data fetch (admin only)
│   │   ├── reports.py               # User-submitted mis-classification reports + admin review
│   │   └── admin.py                 # User management, storage stats, data wipe (admin only)
│   │
│   ├── database/
│   │   ├── connection.py            # SQLAlchemy engine + session factory + init_db()
│   │   └── models.py                # User, UserReport, CorrectionEntry, AnalysisRecord
│   │
│   ├── schemas/                     # Pydantic request/response models (mirrors routers/)
│   └── requirements.txt
│
└── frontend/
    └── src/
        ├── App.tsx                  # Routes, RequireAuth/RequireAdmin guards
        ├── pages/
        │   ├── Login.tsx            # Register/login
        │   ├── Dashboard.tsx        # KPI cards, charts, trend, keyword cloud
        │   ├── SingleAnalysis.tsx   # Single text input + full result cards
        │   ├── BulkAnalysis.tsx     # Bulk text / CSV upload + results table
        │   ├── URLAnalysis.tsx      # YouTube / Myntra URL input + results
        │   ├── History.tsx          # Paginated searchable history
        │   ├── Settings.tsx         # Platform/theme settings
        │   ├── AdminOverview.tsx    # Admin dashboard (users, storage)      [admin only]
        │   ├── TrainingData.tsx     # Correction stats + retrain trigger    [admin only]
        │   └── UserReports.tsx      # Review/resolve user-submitted reports [admin only]
        ├── components/
        │   ├── Layout.tsx, Sidebar.tsx, BackendStatus.tsx
        │   ├── ReportModal.tsx      # "Report incorrect result" dialog (any user)
        │   ├── CorrectionPanel.tsx  # Admin correction entry UI
        │   ├── analysis/            # Per-signal result cards (Sentiment, Emotion, Tone, Intent, ...)
        │   └── ui/                  # Button, Card, Input, Badge, Toast, Select, Progress, Skeleton
        ├── lib/
        │   ├── api.ts               # Axios client, attaches JWT, base URL from VITE_API_URL
        │   ├── themes.ts            # Theme definitions
        │   └── utils.ts
        ├── store/index.ts           # Zustand: auth (token/user/logout), theme
        └── types/index.ts           # Shared TypeScript interfaces
```

---

## 8. Data Model (SQLite via SQLAlchemy)

| Table | Purpose | Key columns |
|---|---|---|
| `users` | Accounts | `username`, `email`, `password_hash`, `role` (`user`/`admin`), `is_active` |
| `analysis_records` | Every analysis result (single + bulk) | full signal breakdown (sentiment/emotion/tone/intent + scores), `mode`, `batch_id` |
| `user_reports` | User-flagged mis-classifications | `text`, `model_label`, `user_note`, `status` (pending/reviewed/fixed), `reported_by` |
| `correction_entries` | Admin-approved label corrections | `text`, `correct_label`, `model_label`, `keywords` — feeds the in-memory correction cache |

---

## 9. API Reference (base: `/api/v1`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | — | Create account, returns JWT |
| POST | `/auth/login` | — | Returns JWT (403 if `is_active=false`) |
| GET | `/auth/me` | user | Current user profile |
| POST | `/analyze` | user | Single text analysis |
| POST | `/bulk-analyze` | user | Up to 100 texts |
| POST | `/upload-csv` | user | Parse CSV → extract text column |
| POST | `/analyze-url` | user | YouTube/Myntra comment/review scrape + analyze |
| GET | `/analytics` | user | Dashboard KPIs, trends, keyword cloud |
| GET/DELETE | `/history`, `/history/{id}` | user | Paginated history, delete record(s) |
| POST | `/export/pdf/{single,bulk,url}` | user | Branded PDF report |
| POST | `/reports` | optional | Submit a mis-classification report |
| GET/PATCH/DELETE | `/reports*` | admin | Review, resolve, delete reports |
| GET/POST/DELETE | `/corrections*` | admin | Manage correction entries |
| POST | `/corrections/retrain` | admin | Rebuild LR head from corrections |
| POST | `/corrections/fetch-online` | admin | Pull additional labeled seed data |
| GET | `/admin/stats` | admin | User counts, storage gauge, record counts |
| PATCH | `/admin/users/{id}/restrict` | admin | Toggle account active/restricted |
| DELETE | `/admin/users/{id}` | admin | Delete a user |
| DELETE | `/admin/clear-analysis`, `/admin/clear-all` | admin | Wipe stored data |
| GET | `/health` | — | Health check |

---

## 10. Environment / Config (`backend/config.py`, `.env`)

```
DATABASE_URL=sqlite:///./sentiment_platform.db
MODEL_CACHE_DIR=./model_cache
DEVICE=auto              # auto | cuda | cpu
JWT_SECRET=<change in production>
JWT_ALGORITHM=HS256
JWT_EXPIRE_DAYS=7
CORS_ORIGINS=[...]
YOUTUBE_API_KEY=...
INSTAGRAM_SESSION_ID=... # preferred over username/password (bypasses bot detection)
```

Frontend: `VITE_API_URL=http://localhost:8000/api/v1` (`frontend/.env`).

---

## 11. Tech Stack — What Each Piece Does and Why

### Backend runtime

| Technology | Role in this project | Why it was chosen |
|---|---|---|
| **Python 3.11** | Language the entire backend and ML pipeline is written in | Required by the HuggingFace/PyTorch ecosystem; best library support for NLP |
| **FastAPI 0.115** | Web framework — defines every `/api/v1/*` route, request/response validation, auto-generated docs at `/docs` | Async-native, integrates natively with Pydantic for typed request/response models, minimal boilerplate compared to Flask/Django |
| **Uvicorn** | ASGI server that actually runs the FastAPI app (`uvicorn main:app`) | The standard production-grade server for async Python web apps |
| **Pydantic 2 / pydantic-settings** | Validates every request body against a schema (`schemas/`) and loads `backend/.env` into a typed `Settings` object (`config.py`) | Catches malformed input before it reaches business logic; typed config avoids `os.environ` string-soup |
| **SQLAlchemy 2.0** | ORM — defines the four tables (`database/models.py`) and generates SQL for every query | Lets the app swap SQLite for Postgres/MySQL later without rewriting queries |
| **SQLite** | The actual database file (`sentiment_platform.db`) | Zero-config, single-file — appropriate for a project of this scale; no separate DB server to install |
| **python-jose** | Encodes/decodes the JWT access tokens issued on login (`auth/deps.py`) | Standard, well-audited JWT implementation for Python |
| **passlib + bcrypt** | Hashes and verifies user passwords before they touch the database | Never store or compare plaintext passwords; bcrypt is the industry-standard slow hash resistant to brute force |

### AI / ML layer

| Technology | Role in this project | Why it was chosen |
|---|---|---|
| **HuggingFace Transformers 4.44** | Loads and runs every pretrained BERT/RoBERTa model used in the pipeline (sentiment, sarcasm, emotion, tone/intent) | The de-facto standard library for using pretrained NLP models without writing custom model code |
| **PyTorch (CPU build)** | The actual tensor/inference engine underneath every Transformers model call | Required by Transformers; CPU build keeps the install lightweight since a GPU isn't assumed |
| **scikit-learn** | Trains the Logistic Regression head on top of DistilBERT embeddings (`modules/sentiment.py`) and re-trains it when admins submit corrections | Fast, simple, interpretable classifier — no need for a second neural network just to combine embeddings into a label |
| **langdetect** | Step 1 of the pipeline — identifies the input language before anything else runs | Lightweight, no model download, good enough accuracy to route text to the right translation model |
| **sentencepiece / sacremoses** | Tokenizers required internally by the MarianMT translation models | Mandatory dependencies of Helsinki-NLP's `opus-mt-*` models — without them translation fails to load |

### Social media & document integrations

| Technology | Role in this project | Why it was chosen |
|---|---|---|
| **google-api-python-client** | Calls the YouTube Data API v3 to fetch a video's metadata and top comments (`modules/url_fetcher.py`) | Official Google client library — handles auth and pagination for you |
| **curl_cffi** | Fetches Myntra product pages and paginates its internal reviews JSON endpoint (`modules/url_fetcher.py::fetch_myntra_reviews`) | Myntra has no public reviews API and blocks obvious scraper traffic; curl_cffi impersonates a real Chrome TLS fingerprint so requests aren't rejected the way a plain `requests` call would be |
| **fpdf2** | Generates the branded PDF export (single/bulk/URL analysis reports) | Pure-Python PDF generation with no external binary dependency (unlike wkhtmltopdf-based tools) |

### Frontend runtime

| Technology | Role in this project | Why it was chosen |
|---|---|---|
| **React 18 + TypeScript 5.2** | The entire UI — pages, components, routing | Component model fits a dashboard with many repeated card/table layouts; TypeScript catches API-shape mismatches between frontend and backend at compile time |
| **Vite 5** | Dev server (`npm run dev`, port 5173) and production bundler | Near-instant hot reload during development, much faster cold-start than Webpack-based tooling |
| **Tailwind CSS 3** | All component styling, including the theme system (`lib/themes.ts`) | Utility classes keep styling co-located with markup — no separate CSS files to keep in sync per component |
| **Zustand** | Global client state: JWT token, current user, active theme (`store/index.ts`) | Much less boilerplate than Redux for a store this small; no context-provider wrapping needed |
| **Axios** | The HTTP client (`lib/api.ts`) that talks to the FastAPI backend, attaching the JWT to every request | Built-in interceptors make it easy to inject the auth header and handle 401s in one place |
| **Recharts** | Renders the Dashboard's KPI charts, sentiment distribution, trend lines | Declarative, React-native charting API — no manual canvas/SVG wiring |
| **Framer Motion** | Page/card transition animations throughout the UI | Simple declarative animation API that works naturally with React component lifecycles |
| **react-dropzone** | Drag-and-drop CSV upload on the Bulk Analysis page | Handles file-drop UX edge cases (drag state, validation, multi-file) that are tedious to hand-roll |
| **react-hot-toast** | Success/error toast notifications across the app | Lightweight, no provider boilerplate beyond one root component |
| **lucide-react** | Icon set used throughout the sidebar, cards, and buttons | Consistent, tree-shakeable icon library that matches the app's clean visual style |

### The AI models themselves (see §2 for how they connect)

| Model | What it actually does here |
|---|---|
| **DistilBERT-multilingual + Logistic Regression** | Turns text in 104 possible languages into a 768-dim embedding, then a simple linear classifier maps that embedding to positive/negative/neutral (35% of the final sentiment vote) |
| **Twitter-RoBERTa (sentiment)** | A second, independent sentiment vote (65% weight) — trained on 124M tweets, so it understands informal/emoji-heavy comment text better than a Wikipedia-trained model would |
| **Twitter-RoBERTa (irony)** | Detects sarcasm; when confident and the sentiment call said "positive," flips it to "negative" (classic sarcasm pattern) |
| **GoEmotions distilRoBERTa** | Picks the dominant emotion (joy, anger, sadness, etc.) from 7 classes, then gets corrected if it contradicts the sentiment result |
| **DistilBERT-MNLI** | Answers "does this text entail label X?" for 8 tone labels and 8 intent labels — this is what lets tone/intent detection work with zero task-specific training data |
| **Google Translate / MarianMT (Helsinki-NLP)** | Translates non-English input into English before the rest of the pipeline runs, so every downstream model only ever has to understand English. Google Translate (no API key, via `deep-translator`) is tried first; MarianMT is the offline fallback |

---

## 12. Notable Design Decisions

- **Ensemble weighting (35/65):** Twitter-RoBERTa gets more weight because comments/reviews resemble its tweet training domain more than DistilBERT's Wikipedia pretraining; DistilBERT+LR adds multilingual coverage RoBERTa lacks.
- **Sarcasm-driven sentiment flip:** Runs only after the base sentiment call, and is explicitly skipped when the label came from a human correction — corrections always take precedence over model heuristics.
- **Emotion/sentiment alignment:** Emotion model runs independently of sentiment, so a post-processing step forces the top emotion to stay compatible with the sentiment polarity (no "Joy" on a "Negative" result).
- **Correction cache is the fast path:** Once a text is corrected, `analyze_text()` short-circuits the entire model ensemble for that exact text — cheap and immediate, not a retraining requirement.
- **Corrections persist across restarts:** reloaded from the `correction_entries` table into memory in the FastAPI `lifespan` handler on every boot.
- **Myntra scraping via TLS-impersonated HTTP session**, not a public API (none exists) — `curl_cffi`'s Chrome-120 impersonation avoids the bot-detection that a plain HTTP client would trigger against Myntra's reviews endpoint.
- **Translation has two layers**: Google Translate (via `deep-translator`, no API key) is tried first for broad language coverage, with MarianMT as an offline fallback for a fixed set of languages if Google Translate fails or is unreachable.
- **Default admin account** (`admin` / `admin123`) is auto-seeded on first database initialization (`database/connection.py::_seed_admin`) so the app is usable immediately — the login page also displays this credential as a hint.

---

## 13. File-by-File Reference

### Backend — entry point & config

| File | What it does |
|---|---|
| `backend/main.py` | Creates the FastAPI app, registers CORS, mounts every router under `/api/v1`, and defines the `lifespan` startup hook: initializes the DB, eagerly loads all ML models (`initialize_models()`), then reloads any persisted `CorrectionEntry` rows into the in-memory correction cache so admin fixes survive a restart. Also defines `/health`, `/`, and global exception handlers for `ValueError` (→ 400) and any other exception (→ 500). |
| `backend/config.py` | Defines the `Settings` (Pydantic) class loaded from `backend/.env` — DB URL, model cache dir, device (`auto`/`cuda`/`cpu`), JWT secret/algorithm/expiry, CORS origins, YouTube API key. Resolves `DEVICE=auto` to `cuda`/`cpu` at import time based on `torch.cuda.is_available()`. |

### Backend — auth

| File | What it does |
|---|---|
| `auth/deps.py` | All auth primitives: `hash_password`/`verify_password` (bcrypt via passlib), `create_access_token`/`_decode_token` (JWT via python-jose), and three FastAPI dependencies — `get_current_user` (401 if no/invalid token), `get_optional_user` (returns `None` instead of raising, used for anonymous report submission), `require_admin` (403 if `role != "admin"`). |

### Backend — AI/ML pipeline (`modules/`)

| File | What it does |
|---|---|
| `modules/pipeline.py` | The orchestrator. `analyze_text()` runs all 8 stages in order and assembles the final result dict. Contains `_lookup_correction()` (checks the correction cache by original text, translated text, then case-insensitive match) and `_align_emotion_with_sentiment()` (the `_SENTIMENT_EMOTION_COMPAT` post-processing step that keeps emotion labels compatible with sentiment polarity). Also exposes `initialize_models()`, called once at startup to warm up every singleton detector so the first real request isn't slow. |
| `modules/language_detector.py` | `detect_language()` wraps `langdetect` and maps ISO codes to display names (`LANGUAGE_NAMES`). `is_hinglish()` detects Devanagari-script Hindi mixed with Latin characters by character-ratio. `is_romanized_hinglish()` detects Hindi written in Roman script by matching ≥2 common Hindi function words (`_ROMANIZED_HINDI_WORDS`, a ~90-word list) against ≥15% of the text's alphabetic tokens — this is what tells the pipeline to skip MarianMT (which can't handle romanized Hindi) and let multilingual BERT handle it directly. |
| `modules/translation.py` | `translate_to_english()` is the single entry point: returns immediately for English text, otherwise tries `_google_translate()` (via `deep_translator.GoogleTranslator`, no key needed) first, then falls back to `_marian_translate()` for the fixed set of languages in `_MARIAN_MODELS`. MarianMT models are lazily loaded and cached in `_marian_cache` on first use per language. |
| `modules/sentiment.py` | The core classifier. Defines `SEED_DATA` (60 hand-written examples spanning formal/informal/emoji text across positive/negative/neutral) and emoji sets (`_POSITIVE_EMOJIS`/`_NEGATIVE_EMOJIS`). The `BERTLogisticSentimentAnalyzer` singleton: `_get_embedding()` mean-pools DistilBERT's last hidden state; `_train_lr()` fits the Logistic Regression head on `SEED_DATA` at startup; `analyze()` checks the correction cache first, then blends LR probabilities (35%) with the Twitter-RoBERTa pipeline (65%), applies the emoji signal and keyword-signal adjustments from corrections, normalizes, and applies a confidence floor (<55%→neutral) plus a negative/neutral margin guard. `apply_single_correction()` does an immediate cache-only update; `retrain_with_corrections()` refits the LR head on seed+correction data and rebuilds both caches; `load_online_data()` pulls extra labeled samples from HuggingFace's `tweet_eval` and `tyqiangz/multilingual-sentiments` datasets to enrich training data on demand. |
| `modules/sarcasm.py` | `SarcasmDetector` singleton wrapping `cardiffnlp/twitter-roberta-base-irony`. `analyze()` returns `detected=True` only when the model's `irony` label scores ≥ `SARCASM_THRESHOLD` (0.70). |
| `modules/emotion.py` | `EmotionDetector` singleton wrapping the GoEmotions distilRoBERTa model. Maps the model's raw 7 labels to nicer display labels (`EMOTION_DISPLAY`, e.g. `sadness`→`Disappointment`, `surprise`→`Excitement`), taking the max score when two raw labels collapse to the same display label. |
| `modules/tone.py` / `modules/intent.py` | Near-identical `ToneDetector`/`IntentDetector` singletons, both wrapping the same `typeform/distilbert-base-uncased-mnli` zero-shot classifier pipeline but with different candidate label sets (`TONE_LABELS` vs `INTENT_LABELS`) and (for tone) natural-language hypothesis templates (`TONE_HYPOTHESES`) fed into the zero-shot NLI call. |
| `modules/interpretation.py` | Pure function `generate_interpretation()` — no model calls. Stitches together a human-readable paragraph from sentiment/emotion/tone/intent labels using lookup dicts (`sent_map`, `emotion_intent_map`) and simple keyword extraction (`positive_keywords`/`negative_keywords`) against the translated text. |
| `modules/response_generator.py` | Pure function `generate_response()` — looks up `RESPONSE_TEMPLATES` keyed by `(sentiment, intent, tone)` tuples, falling back to partial `(sentiment, intent)` match, then sentiment-only match, then `DEFAULT_RESPONSES`. Each match has multiple template variants chosen at random via `random.choice`. |
| `modules/analytics.py` | `get_analytics()` queries the last N `AnalysisRecord` rows and computes: label distributions (sentiment/emotion/tone/intent/language) via `Counter`, average confidence, a 30-day trend series bucketed by date, a stopword-filtered word-frequency cloud (`top_words`), and the 10 most recent reviews. `generate_ai_insight()` turns those aggregates into a short natural-language summary paragraph (e.g. flags when negative feedback exceeds 50%, or when "complaint" is the dominant intent). |
| `modules/url_fetcher.py` | `detect_platform()` inspects the URL host to route to `youtube` or `myntra` (raises `ValueError` for anything else). `fetch_youtube_comments()` uses `google-api-python-client` to pull video metadata and paginate `commentThreads.list` up to `max_comments`. `fetch_myntra_reviews()` uses `curl_cffi` (Chrome-120 TLS impersonation) to load the product page for its title, extract the numeric product ID from the URL, then paginate Myntra's internal `/web/v1/reviews/product/{id}` JSON endpoint. `fetch_comments()` is the single public entry point used by the router. |
| `modules/pdf_generator.py` | Three report builders (`generate_single_analysis_pdf`, `generate_bulk_analysis_pdf`, `generate_url_analysis_pdf`) built on a custom `_PDF(FPDF)` subclass with helpers for colored header bars, progress bars (`h_bar`), and bordered "cards". Each report renders key metrics, sentiment/emotion distribution bars, highlighted best/worst examples, and a full per-item results table. `_safe()` sanitizes text to latin-1 (fpdf2's charset) and truncates long strings. |

### Backend — routers (`routers/`, all mounted under `/api/v1`)

| File | What it does |
|---|---|
| `routers/analysis.py` | `POST /analyze` — validates length (≤5000 chars), calls `analyze_text()`, persists the result as a background task (`save_analysis_to_db`, defined here) so the DB write doesn't block the response. |
| `routers/bulk.py` | `POST /bulk-analyze` — runs up to 100 texts through the pipeline sequentially, persisting each and computing an `aggregate` summary (distributions + dominants + average confidence). Failed items get a placeholder neutral result instead of aborting the whole batch. `POST /upload-csv` — parses an uploaded CSV (UTF-8 then latin-1 fallback), heuristically picks a text column (`text`/`review`/`comment`/`feedback`/`content`/`message`, else the first column), and returns up to 500 extracted rows as plain text for the frontend to feed into bulk-analyze. |
| `routers/analytics.py` | `GET /analytics` — thin wrapper that just calls `modules/analytics.get_analytics()`. |
| `routers/history.py` | `GET /history` (paginated, filterable by sentiment/emotion/language/text search), `GET /history/{id}`, `DELETE /history/{id}`, `DELETE /history` (wipe all). Directly serializes `AnalysisRecord` rows into the nested response shape the frontend expects. |
| `routers/url_analysis.py` | `POST /analyze-url` — calls `fetch_comments()`, runs every comment/review through `analyze_text()`, persists each as an `AnalysisRecord` with `mode="url"`, and returns post metadata + per-item results + aggregate stats, mirroring `bulk.py`'s aggregation logic. |
| `routers/export.py` | Three endpoints (`/export-pdf`, `/export-pdf/single`, `/export-pdf/bulk`) that each call the matching `pdf_generator` function and stream the bytes back with a `Content-Disposition: attachment` header and a timestamped filename. |
| `routers/auth.py` | `POST /auth/register` (checks username/email uniqueness, hashes password, issues JWT), `POST /auth/login` (verifies password, 403s if `is_active=False`, issues JWT), `GET /auth/me` (returns the current authenticated user). |
| `routers/corrections.py` | Admin-only CRUD over `CorrectionEntry`: `POST /corrections` (create + immediately push into the in-memory cache via `apply_single_correction`), `GET /corrections`, `GET /corrections/stats` (label breakdown, top keywords, `needs_retrain` flag at `RETRAIN_THRESHOLD=20`), `DELETE /corrections/{id}`, `GET /corrections/online-status`, `POST /corrections/fetch-online` (triggers `load_online_data`), `POST /corrections/retrain` (triggers `retrain_with_corrections` on all stored corrections). |
| `routers/reports.py` | `POST /reports` (any user or anonymous — `get_optional_user`), `GET /reports` and `/reports/stats` (admin), `PATCH /reports/{id}` (admin review: setting `status="fixed"` with a `correct_label` auto-creates a `CorrectionEntry`, retroactively updates every matching `AnalysisRecord` row so History reflects the fix immediately, and pushes the fix into the live correction cache), `DELETE /reports/{id}`. |
| `routers/admin.py` | Admin-only: `GET /admin/stats` (user list + counts, SQLite file size vs. a 500MB soft cap via `_db_file_size()`, record counts across all three tables), `PATCH /admin/users/{id}/restrict` (toggle `is_active`, blocked for self), `DELETE /admin/users/{id}` (blocked for self), `DELETE /admin/clear-analysis`, `DELETE /admin/clear-all`. |

### Backend — database & schemas

| File | What it does |
|---|---|
| `database/connection.py` | Creates the SQLAlchemy `engine`/`SessionLocal`/`Base`. `init_db()` creates all tables, runs `_migrate_users_table()` (adds the `is_active` column via raw `ALTER TABLE` if missing — a lightweight SQLite migration since there's no Alembic), and `_seed_admin()` (creates the default `admin`/`admin123` account if no admin exists yet). `get_db()` is the standard FastAPI session-per-request dependency. |
| `database/models.py` | Four SQLAlchemy models: `User` (auth + role + `is_active`), `UserReport` (mis-classification reports with lifecycle status), `CorrectionEntry` (admin-approved label fixes + keywords), `AnalysisRecord` (every analysis result, flattened into columns per signal, with `mode`/`batch_id` to distinguish single/bulk/url runs). |
| `schemas/analysis.py` | Pydantic request/response models mirroring the pipeline's result dict: `SentimentResult`, `SarcasmResult`, `EmotionResult`, `ToneResult`, `IntentResult`, `AnalysisRequest`, `BulkAnalysisRequest`, `SingleAnalysisResponse`, `BulkAnalysisItem`/`BulkAnalysisResponse`, `AnalyticsResponse`. |
| `schemas/auth.py` | `RegisterRequest` (username/password/email with length validation), `LoginRequest`, `TokenResponse` (access token + embedded `UserOut`), `UserOut`. |
| `schemas/corrections.py` | `CorrectionCreate` (label constrained to `positive|negative|neutral` via regex), `CorrectionResponse`, `CorrectionStats`, `RetrainResponse`. |
| `schemas/reports.py` | `ReportCreate`, `ReportResponse`, `ReportReview` (status constrained to `reviewed|fixed`, optional `correct_label`/`keywords`). |
| `schemas/url_analysis.py` | `URLAnalysisRequest` (validates non-empty URL, clamps `max_comments` to 5–100), `PostMetadata`, `URLAnalysisResponse` (reuses `BulkAnalysisItem` for its `items` list). |

### Frontend — app shell & infrastructure

| File | What it does |
|---|---|
| `App.tsx` | Defines all routes with `react-router-dom`. `RequireAuth` redirects to `/login` if there's no token; `RequireAdmin` redirects to `/dashboard` if the user's role isn't `admin` (client-side guard only — the backend still enforces 401/403 independently). `ThemeApplier` re-applies the active theme's CSS variables on mount/change. `ClearAuthOnStartup` logs the user out on every fresh app load (so a stale token doesn't silently persist across browser sessions). |
| `store/index.ts` | The single Zustand store (`useAppStore`). Holds: last analysis results for each mode (single/bulk/URL), analytics cache, loading flags, sidebar collapsed state, active theme ID, the correction-panel's open/prefill/section state, and auth state (`user`/`token`, persisted to `localStorage` under `sentimentiq_token`/`sentimentiq_user`). `loginUser()`/`logoutUser()` write/clear localStorage alongside in-memory state. |
| `lib/api.ts` | The only place that talks to the backend. One `axios` instance with a request interceptor that attaches `Authorization: Bearer <token>` from localStorage, and a response interceptor that unwraps FastAPI's `{detail: "..."}` error shape (including from Blob error responses on PDF export calls) into a plain `Error`. Exports one typed function per backend endpoint (`analyzeText`, `bulkAnalyze`, `uploadCSV`, `getAnalytics`, `getHistory`, `analyzeURL`, the three `export*PDF` functions plus a shared `_downloadPdf` helper, all `*Correction*`/`*Report*`/`*Admin*` functions, and auth functions). |
| `lib/themes.ts` | Defines 5 color themes (`aurora`, `ocean`, `rose`, `emerald`, `amber`) as CSS-variable sets (`primary`/`secondary`/`accent` + 4 "aurora blob" gradient colors used for the background). `applyTheme()` writes them onto `document.documentElement` as CSS custom properties; `getTheme()`/`DEFAULT_THEME_ID` handle lookup/fallback. |
| `lib/utils.ts` | Small pure helpers: `cn()` (clsx + tailwind-merge class combiner), `getSentimentColor`/`getSentimentBg`/`getEmotionColor` (label→color/class lookups used across every result card), `formatConfidence`, `truncateText`, `formatDate`, `capitalize`. |
| `types/index.ts` | The single source of truth for all API response shapes on the frontend — `User`, `UserReport`, `ReportStats`, `SentimentResult`/`SarcasmResult`/`EmotionResult`/`ToneResult`/`IntentResult`, `SingleAnalysisResponse`, `BulkAnalysisItem`/`BulkAnalysisResponse`, `AnalyticsData`, `PostMetadata`/`URLAnalysisResponse`, `AdminUserEntry`/`AdminStats`, `CorrectionEntry`/`CorrectionStats`, `HistoryRecord`. Kept in sync by hand with the backend's Pydantic schemas. |
| `components/Layout.tsx` | The authenticated app shell — renders the animated "aurora blob" background (using the active theme's CSS variables), the `Sidebar`, and an `Outlet` for the current page, shifting its left margin based on whether the sidebar is collapsed. |
| `components/Sidebar.tsx` | The main nav rail. Polls `/health` every 30s to show a live "Backend Connected/Offline" pill, and (for admins) polls `/reports/stats` every 15s to show a pending-report count badge on the "User Reports" link. Shows/hides the Admin Overview, Training Data, and User Reports links based on `user.role`. Collapsible via an animated width toggle (Framer Motion). |
| `components/BackendStatus.tsx` | A standalone connected/offline pill + manual refresh button around `checkHealth()` — a smaller, reusable variant of the status indicator embedded in the Sidebar. |
| `components/ReportModal.tsx` | The "Report incorrect analysis" dialog shown to any user from an analysis result card. Submits `{text, model_label, user_note}` to `POST /reports` and shows a success state before auto-closing. |
| `components/CorrectionPanel.tsx` | The large admin-only slide-over panel with two sections (`training` / `reports`, switched via the store's `correctionPanelSection`): the **training** section lets an admin submit a correction directly, shows correction-count progress toward the retrain threshold, triggers `POST /corrections/retrain`, and can pull in HuggingFace online datasets via `POST /corrections/fetch-online`; the **reports** section lists pending/reviewed/fixed `UserReport`s with inline "Mark Reviewed" / "Fix & Add to Dataset" actions (the latter requires picking a correct label first). |
| `components/analysis/*.tsx` | Small presentational cards, one per pipeline signal, each taking that signal's typed result and rendering a labeled badge/score bar: `SentimentCard`, `EmotionCard`, `ToneCard`, `IntentCard`, `LanguageCard`, `InterpretationCard`, `ResponseCard`. Reused across `SingleAnalysis`, `BulkAnalysis`, and `URLAnalysis`. |
| `components/ui/*.tsx` | Generic design-system primitives shared everywhere: `Button` (variants + loading spinner + icon slot), `Card`/`CardHeader`/`CardTitle`, `Input`, `Textarea`, `Select`, `Badge`, `Progress`, `Skeleton` (incl. `AnalysisCardSkeleton` loading placeholder), `Toast` (react-hot-toast wrapper). |

### Frontend — pages (`pages/`)

| File | What it does |
|---|---|
| `Login.tsx` | Combined login/register form (tab-toggled). Calls `loginUser`/`registerUser`, stores the returned token+user via the Zustand store, and redirects to `/dashboard`. Displays the default `admin`/`admin123` credential as an on-screen hint. |
| `Dashboard.tsx` | Fetches `getAnalytics()` and renders KPI cards, sentiment/emotion/tone/intent distribution charts (Recharts), a 30-day trend line, a keyword cloud from `top_words`, the AI-generated insight paragraph, and a recent-reviews list. |
| `SingleAnalysis.tsx` | The primary single-text workflow: textarea + example prompts (including Hindi/Hinglish samples) → `analyzeText()` → renders all seven per-signal cards → supports PDF export (`exportSingleAnalysisPDF`) and opening `ReportModal` to flag a wrong result. |
| `BulkAnalysis.tsx` | Textarea (newline-separated) or CSV upload (`uploadCSV`) → `bulkAnalyze()` → results table with per-row sentiment/emotion/tone/intent, aggregate summary, PDF export (`exportBulkAnalysisPDF`), and per-row report flagging. |
| `URLAnalysis.tsx` | URL input (YouTube or Myntra) → `analyzeURL()` (long timeout — up to 10 minutes for large comment/review counts) → post metadata header + aggregate summary + per-comment results table, PDF export (`exportURLAnalysisPDF`). |
| `History.tsx` | Paginated, filterable (sentiment/emotion/language/search) table over `getHistory()`, with per-record delete (`deleteHistoryRecord`) and a "clear all" action (`clearHistory`). |
| `Settings.tsx` | Theme picker (swaps between the 5 `THEMES`) and a backend health check panel (`checkHealth`). |
| `TrainingData.tsx` | Admin-only standalone page wrapping the same correction-management functionality as `CorrectionPanel`'s training section — correction submission, stats, retrain trigger, online-dataset fetch, recent corrections list. |
| `UserReports.tsx` | Admin-only standalone page for reviewing user-submitted mis-classification reports (list, stats, filter by status, review/fix/delete actions) — a full-page counterpart to `CorrectionPanel`'s reports section. |
| `AdminOverview.tsx` | Admin-only dashboard: user list with restrict/delete actions (`restrictUser`, `deleteUser`), storage usage gauge and record counts (`getAdminStats`), and destructive data-wipe actions (`clearAnalysisRecords`, `clearAllData`). |
