# SentimentIQ — Complete Codebase Documentation

> Multilingual AI-powered sentiment analysis platform with emotion, tone, intent detection, and social media comment analysis.

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
│   ├── database/
│   │   ├── __init__.py
│   │   ├── connection.py              # Engine, session factory, init_db()
│   │   └── models.py                  # AnalysisRecord ORM model
│   ├── modules/
│   │   ├── pipeline.py                # Main orchestrator — calls all modules
│   │   ├── sentiment.py               # BERT + RoBERTa + LR ensemble
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
│   │   └── export.py                  # POST /export-pdf (3 variants)
│   └── schemas/
│       ├── __init__.py
│       ├── analysis.py                # Pydantic models for text analysis
│       └── url_analysis.py            # Pydantic models for URL analysis
│
└── frontend/
    ├── package.json
    ├── vite.config.ts
    ├── tailwind.config.js
    ├── tsconfig.json
    ├── index.html
    └── src/
        ├── main.tsx                   # ReactDOM.createRoot, Toaster setup
        ├── App.tsx                    # BrowserRouter, routes, theme init
        ├── vite-env.d.ts
        ├── pages/
        │   ├── Dashboard.tsx          # Analytics + charts
        │   ├── SingleAnalysis.tsx     # Single text form + result cards
        │   ├── BulkAnalysis.tsx       # Bulk text/CSV + results table
        │   ├── URLAnalysis.tsx        # YouTube/Instagram analysis
        │   ├── History.tsx            # Paginated history browser
        │   └── Settings.tsx           # Config, themes, model info
        ├── components/
        │   ├── Layout.tsx             # Sidebar + Outlet wrapper
        │   ├── Sidebar.tsx            # Collapsible nav sidebar
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
        │   └── index.ts               # Zustand global store
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
┌─────────────────────────────────┐
│   1. Language Detection          │  langdetect library
│   → language name, code,         │  Returns: "Hindi", "hi", 0.99
│     confidence                   │
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│   2. Hinglish Detection          │  Custom heuristics
│   → is Devanagari mixed?         │  Checks script ratios
│   → is Romanized Hinglish?       │  Checks Hindi word list
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│   3. Translation                 │  Helsinki-NLP MarianMT
│   → if non-English: translate    │  Cached per language pair
│     to English                   │  Hinglish uses hi→en model
│   → pure romanized Hinglish:     │
│     skip translation             │
└────────────────┬────────────────┘
                 │ (English text from here on)
                 ▼
┌─────────────────────────────────┐
│   4. Sentiment Analysis          │  BERT + RoBERTa + LR Ensemble
│   → positive/negative/neutral    │  35% LR + 65% RoBERTa weights
│   → confidence, probabilities    │  Emoji signal processing applied
│   → negative margin guard        │  Min 55% confidence threshold
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│   5. Sarcasm Detection           │  cardiffnlp/twitter-roberta-irony
│   → if detected (≥0.70):         │  Binary: irony / non-irony
│     flip positive → negative     │  Threshold: 0.70 confidence
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│   6. Emotion Detection           │  j-hartmann/emotion-distilroberta
│   → Joy/Anger/Disgust/etc.       │  28 raw labels → 8 display labels
│   → confidence, all scores       │  Handles duplicate label merging
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│   7. Emotion-Sentiment Alignment │  Post-processing rule
│   → ensures emotion polarity     │  e.g. positive sentiment + Anger
│     matches sentiment polarity   │  → emotion corrected to Joy
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│   8. Tone Detection              │  typeform/distilbert-mnli
│   → professional/casual/etc.     │  Zero-shot NLI classification
│   → intensity (0.0–1.0)          │  8 candidate labels
│   → all tone scores              │
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│   9. Intent Detection            │  typeform/distilbert-mnli
│   → complaint/appreciation/etc.  │  Zero-shot NLI classification
│   → confidence, all scores       │  8 candidate labels
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│  10. Interpretation Generation   │  Rule-based text generation
│   → human-readable paragraph     │  Combines all results above
│   → key phrase extraction        │  ~20 combination mappings
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│  11. Response Generation         │  Template lookup
│   → suggested reply text         │  (sentiment, intent, tone) key
│                                  │  Falls back through partial keys
└────────────────┬────────────────┘
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
- On startup: calls `init_db()` to create tables, then `initialize_models()` to pre-load all ML models into memory
- Adds **CORSMiddleware** allowing configured origins
- Mounts all 6 routers under `/api/v1` prefix
- Exposes `GET /health` returning `{status, database, models_loaded, timestamp}`
- Exposes `GET /` returning version info
- Global exception handlers for `ValueError` (400) and all others (500)
- Sets `HF_HUB_OFFLINE=0` and `TRANSFORMERS_OFFLINE=0` to allow model downloads

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
- `init_db()` — calls `Base.metadata.create_all(engine)` to create tables
- `get_db()` — FastAPI dependency that yields a session and closes it after the request

#### `database/models.py` — `AnalysisRecord`

Single table storing every analysis result.

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
| `batch_id` | String | Groups bulk/URL records |
| `created_at` | DateTime | Auto-set to UTC now |

---

### 5.4 Modules — ML Processing

#### `modules/pipeline.py`

**`initialize_models()`**
Called once at startup. Instantiates singletons for all detectors so models are loaded into memory before the first request arrives. Catches and logs any initialization errors.

**`analyze_text(text, mode) → dict`**
The full orchestration function. Steps:
1. Timestamps start time
2. Strips and validates text
3. Calls `detect_language()` — get language metadata
4. Checks `is_hinglish()` and `is_romanized_hinglish()` for special Hindi handling
5. Calls `translate()` if non-English (skips for pure romanized Hinglish)
6. Runs `analyze_sentiment()` on translated/English text
7. Runs `detect_sarcasm()` — if detected and sentiment is positive, flips label to negative
8. Runs `detect_emotion()` — then aligns emotion with sentiment polarity
9. Runs `detect_tone()`
10. Runs `detect_intent()`
11. Calls `generate_interpretation()` with all results
12. Calls `generate_response()` with sentiment + intent + tone
13. Returns assembled result dict with UUID, timestamp, counts, processing time

---

#### `modules/sentiment.py` — `BERTLogisticSentimentAnalyzer`

Singleton class, instantiated once.

**Models loaded:**
- `distilbert-base-multilingual-cased` — generates 768-dim text embeddings
- `cardiffnlp/twitter-roberta-base-sentiment-latest` — 3-class sentiment pipeline
- A `LogisticRegression` classifier trained on 51 hand-labelled seed examples

**`analyze_sentiment(text) → {label, confidence, probabilities}`**

1. Tokenize text (max 128 tokens), get DistilBERT last hidden state, mean-pool to embedding
2. LR predicts probabilities on embedding → `lr_probs`
3. RoBERTa pipeline predicts probabilities → `roberta_probs`
4. Ensemble: `0.35 * lr_probs + 0.65 * roberta_probs`
5. Scan text for sentiment emojis (😊→+positive, 😠→+negative, etc.) and adjust scores
6. Normalize probabilities to sum to 1.0
7. If max confidence < 0.55 → return neutral
8. Negative guard: if negative and neutral within 10pp → return neutral
9. Return winner label with confidence

---

#### `modules/emotion.py` — `EmotionDetector`

Singleton, loads `j-hartmann/emotion-english-distilroberta-base`.

**`detect_emotion(text) → {label, confidence, scores}`**

- Runs HuggingFace pipeline top-k classification
- Maps raw GoEmotions labels to 8 display labels:
  - `joy` → Joy, `anger` → Anger, `disgust` → Disgust
  - `sadness/disappointment` → Disappointment, `annoyance/frustration` → Frustration
  - `excitement/admiration` → Excitement, `neutral` → Neutral, `gratitude/approval` → Appreciation
- Deduplicates by keeping max score per display label
- Falls back to `{Neutral, 0.5}` on any error

---

#### `modules/tone.py` — `ToneDetector`

Singleton, loads `typeform/distilbert-base-uncased-mnli`.

**`detect_tone(text) → {label, intensity, scores}`**

- Runs zero-shot classification with 8 candidate labels:
  `professional, casual, sarcastic, aggressive, critical, appreciative, formal, informal`
- Each label is tested as an NLI hypothesis: "The tone of this text is [label]"
- Returns the top label as `label`, its score as `intensity`, all scores as `scores`

---

#### `modules/intent.py` — `IntentDetector`

Singleton, loads `typeform/distilbert-base-uncased-mnli`.

**`detect_intent(text) → {label, confidence, scores}`**

- Zero-shot classification with 8 labels:
  `complaint, appreciation, inquiry, request, suggestion, feedback, threat, praise`
- Same NLI approach as tone
- Returns top label with confidence

---

#### `modules/sarcasm.py` — `SarcasmDetector`

Singleton, loads `cardiffnlp/twitter-roberta-base-irony`.

**`detect_sarcasm(text) → {detected, confidence}`**

- Binary classification: `irony` vs `non-irony`
- Returns `detected=True` only if `irony` score ≥ 0.70
- Below threshold: `{detected: False, confidence: score}`

---

#### `modules/language_detector.py`

**`detect_language(text) → {language, code, confidence}`**

Uses `langdetect` to identify language. Maps ISO codes to display names for 22 supported languages. Returns `"Unknown"` on failure.

**`is_hinglish(text) → bool`**

Detects mixed Devanagari + ASCII text. Returns True if:
- Text contains Devanagari characters
- Devanagari ratio is between 10% and 90% (mixed, not pure Hindi)

**`is_romanized_hinglish(text) → bool`**

Detects Roman-script Hindi. Returns True if:
- At least 2 words from a curated list of common Hindi words written in Roman script (`acha`, `nahi`, `bahut`, `kya`, `hai`, `hain`, `toh`, `mein`, `yaar`, etc.)
- Those words constitute ≥15% of total tokens

---

#### `modules/translation.py`

**`translate(text, source_lang_code) → (translated_text, was_translated)`**

- Returns `(text, False)` if language is English
- Looks up MarianMT model for the language pair:
  - Direct pairs: `hi→en`, `bn→en`, `fr→en`, `de→en`, `es→en`, `it→en`, `pt→en`, `ru→en`, `zh→en`, `ja→en`, `ko→en`, `ar→en`
  - Fallback: `Helsinki-NLP/opus-mt-mul-en` for other languages
- Caches loaded `(tokenizer, model)` pairs in a dict to avoid re-loading
- Returns `(translated_text, True)`

---

#### `modules/interpretation.py`

**`generate_interpretation(original, translated, sentiment, emotion, tone, intent, sarcasm, language_info) → str`**

Rule-based paragraph generator. Builds the sentence by combining:

1. **Language note** — if non-English: "Originally written in [Language], the text..."
2. **Sentiment framing** — maps confidence to "strongly/moderately positive/negative"
3. **Emotion + Intent combo** — ~20 predefined mappings:
   - `(Joy, appreciation)` → "The reviewer expresses genuine satisfaction..."
   - `(Anger, complaint)` → "The feedback reflects frustration..."
   - etc.
4. **Tone notes** — if sarcastic/aggressive/critical/professional/formal → appends tone context
5. **Keyword extraction** — scans text for positive/negative signal words, includes top 3

---

#### `modules/response_generator.py`

**`generate_response(sentiment, intent, tone) → str`**

Template lookup with cascading fallback:

1. Exact match: `(sentiment, intent, tone)` tuple → specific template
2. Partial match: `(sentiment, intent)` → general template for that combo
3. Partial match: `(sentiment,)` → generic sentiment-based response
4. Default: neutral fallback message

~20 curated templates. Examples:
- `(positive, appreciation, appreciative)` → "Thank you so much for your wonderful feedback!..."
- `(negative, complaint, aggressive)` → "We sincerely apologise for the experience you've had..."
- `(neutral, inquiry, professional)` → "Thank you for reaching out. We'd be happy to help..."

---

#### `modules/analytics.py`

**`get_analytics(db, limit=1000) → dict`**

Queries the last `limit` records and computes:

- **Distributions**: `Counter` over sentiment/emotion/tone/intent/language labels
- **Average confidence**: mean of `sentiment_confidence` across all records
- **Trend data**: groups records by date (last 30 days), counts positive/negative/neutral per day
- **Top words**: tokenizes all `original_text`, filters stopwords, returns top 50 by frequency as `[{word, count}]`
- **Recent reviews**: last 10 records with key fields
- **AI insight**: auto-generated summary sentence based on dominant labels
- **Dominant values**: `Counter.most_common(1)` for each dimension

---

#### `modules/pdf_generator.py`

Uses `fpdf2`. Three public functions:

**`generate_url_analysis_pdf(data) → bytes`**
Full report for URL analysis (YouTube/Instagram):
- Header: platform name, URL, date
- Post metadata block: title, author, comment counts
- 4 KPI metric cards
- Sentiment distribution (3 horizontal bar charts)
- Emotion distribution (top 6, colored bars)
- Highlighted comments box (most positive + most negative)
- Full comments table with columns: #, Text, Sentiment, Emotion, Tone, Intent
- Page footers with page numbers

**`generate_single_analysis_pdf(data) → bytes`**
Single text report:
- Analysis metadata
- Text content block
- All dimension results with scores
- Interpretation paragraph
- Suggested response

**`generate_bulk_analysis_pdf(data) → bytes`**
Bulk summary:
- Aggregate statistics page
- Distribution charts
- Per-row results table

---

#### `modules/url_fetcher.py`

**`detect_platform(url) → 'youtube' | 'instagram' | None`**

Checks URL domain.

**`fetch_youtube_comments(url, max_comments=50) → dict`**

- Extracts video ID from URL (handles `?v=`, `/shorts/`, `youtu.be/` formats)
- Calls YouTube Data API v3:
  - `videos.list` → title, author, total comment count
  - `commentThreads.list` → top-level comments, paginates until `max_comments` reached
- Returns: `{platform, title, author, url, total_available, comments[]}`

**`fetch_instagram_comments(url, max_comments=50) → dict`**

- Uses `instagrapi.Client`
- Authenticates via session ID (preferred) or username/password
- Patches client for `XDTGraphImage` and `XDTGraphVideo` media types
- Extracts post shortcode from URL, fetches media info and comments
- Returns: `{platform, title (caption), author, url, total_available, comments[]}`

---

### 5.5 Routers — API Endpoints

#### `routers/analysis.py`

**`POST /api/v1/analyze`**

Request: `{text: str, mode?: str}`
Response: `SingleAnalysisResponse`

- Validates: non-empty, max 5000 chars
- Runs `analyze_text(text, mode="single")`
- Returns result immediately
- Saves `AnalysisRecord` to DB via `BackgroundTask` (non-blocking)

---

#### `routers/bulk.py`

**`POST /api/v1/bulk-analyze`**

Request: `{texts: list[str]}`
Response: `BulkAnalysisResponse`

- Validates: non-empty list, max 100 items
- Assigns a shared `batch_id` (UUID) to all records
- Processes each text through `analyze_text(text, mode="bulk")`
- Skips empty strings
- Saves each result to DB; commits once at end (rollbacks on failure)
- Aggregates: `Counter` over sentiment/emotion/tone/intent labels
- Returns: `{total, items[], aggregate{...}, processing_time}`

**`POST /api/v1/upload-csv`**

Request: `multipart/form-data` with `file` field (`.csv`)
Response: `{texts[], total, column_used}`

- Validates file extension
- Reads with pandas, tries UTF-8 then Latin-1 encoding
- Auto-detects text column by checking column names in order: `text, review, comment, feedback, content, message`, then falls back to first column
- Drops nulls, converts to strings
- Caps at 500 rows
- Returns extracted texts (caller then passes to `/bulk-analyze`)

---

#### `routers/history.py`

**`GET /api/v1/history`**

Query params: `page=1`, `page_size=20`, `sentiment=`, `emotion=`, `language=`, `search=`
Response: `{total, page, pages, items[]}`

- Builds SQLAlchemy query with optional filters (LIKE for search, equality for others)
- Orders by `created_at DESC`
- Paginates with `offset/limit`

**`GET /api/v1/history/{record_id}`**

Response: Full `HistoryRecord` including all scores

**`DELETE /api/v1/history/{record_id}`**

Deletes single record, returns `{message}`

**`DELETE /api/v1/history`**

Deletes all records, returns `{message, deleted}`

---

#### `routers/analytics.py`

**`GET /api/v1/analytics`**

Response: `AnalyticsResponse`

Delegates to `modules/analytics.get_analytics(db)`. Returns full dashboard data.

---

#### `routers/url_analysis.py`

**`POST /api/v1/analyze-url`**

Request: `{url: str, max_comments?: int (default 50)}`
Response: `URLAnalysisResponse`

- Detects platform from URL
- Calls `fetch_youtube_comments()` or `fetch_instagram_comments()`
- Assigns shared `batch_id`
- Analyzes each comment through `analyze_text(comment, mode="url")`
- Saves all records to DB
- Aggregates: distributions, dominant values, avg confidence
- Finds most positive and most negative comments
- Returns: post metadata + analysis results

---

#### `routers/export.py`

**`POST /api/v1/export-pdf`** → URL analysis PDF
**`POST /api/v1/export-pdf/single`** → single analysis PDF
**`POST /api/v1/export-pdf/bulk`** → bulk analysis PDF

All three:
- Accept the full analysis result dict as JSON body
- Call the corresponding `pdf_generator` function
- Return `StreamingResponse` with `application/pdf` content type
- Set `Content-Disposition: attachment; filename=...pdf`

---

### 5.6 Schemas — Validation

#### `schemas/analysis.py`

```
SentimentResult     {label, confidence, probabilities{}}
SarcasmResult       {detected, confidence}
EmotionResult       {label, confidence, scores{}}
ToneResult          {label, intensity, scores{}}
IntentResult        {label, confidence, scores{}}

AnalysisRequest     {text, mode="single"}
BulkAnalysisRequest {texts[]}

SingleAnalysisResponse  {id, original_text, detected_language, language_code,
                         translated_text, is_translation, sentiment, sarcasm,
                         emotion, tone, intent, interpretation, suggested_response,
                         processing_time, timestamp, word_count, char_count}

BulkAnalysisItem    {row_number, original_text, detected_language, translated_text,
                     sentiment, sarcasm?, emotion, tone, intent,
                     interpretation, suggested_response, processing_time}

BulkAnalysisResponse {total, items[], aggregate{}, processing_time}

AnalyticsResponse   {total_analyzed, sentiment_distribution, emotion_distribution,
                     tone_distribution, intent_distribution, language_distribution,
                     average_confidence, trend_data[], top_words[], recent_reviews[],
                     ai_insight, dominant_sentiment, dominant_emotion,
                     dominant_tone, dominant_intent}
```

#### `schemas/url_analysis.py`

```
URLAnalysisRequest  {url, max_comments=50}
PostMetadata        {platform, title, author, url, total_available, fetched_count}
URLAnalysisResponse {metadata, total, items[], aggregate{}, processing_time}
```

---

## 6. Frontend — File by File

### 6.1 Entry & Routing

#### `src/main.tsx`

- Calls `ReactDOM.createRoot(document.getElementById('root')).render(...)`
- Wraps app in `<React.StrictMode>`
- Mounts `<Toaster>` (React Hot Toast) with dark theme config globally

#### `src/App.tsx`

- Sets up `<BrowserRouter>` with `<Routes>`
- On mount: reads `themeId` from Zustand store, calls `applyTheme()` to set CSS variables
- Route map:

| Path | Component |
|---|---|
| `/` | redirect to `/dashboard` |
| `/dashboard` | `Dashboard` |
| `/analyze` | `SingleAnalysis` |
| `/bulk` | `BulkAnalysis` |
| `/url` | `URLAnalysis` |
| `/history` | `History` |
| `/settings` | `Settings` |

All routes wrapped in `<Layout>` (sidebar + outlet).

---

### 6.2 Pages

#### `pages/Dashboard.tsx`

Fetches analytics and health on mount. Renders:

- **Header**: Title + Refresh button + backend connection badge (green/red)
- **KPI Row** (6 cards): Total Analyzed, Dominant Sentiment, Dominant Emotion, Dominant Tone, Dominant Intent, Avg Confidence
- **Charts row**:
  - `PieChart` (Recharts): Sentiment distribution with custom tooltip
  - `BarChart` (Recharts): Top 6 emotions
- **Line Chart**: Sentiment trends over last 30 days (3 lines: positive/negative/neutral)
- **Word Cloud**: Top 50 words as sized text
- **Recent Activity**: Last 10 analyses as a list
- **AI Insight**: Generated summary paragraph

Loading state: all sections show `<Skeleton>` placeholders.

---

#### `pages/SingleAnalysis.tsx`

- **Input section**: `<Textarea>` with 5000 char limit + counter, 6 example-text chips
- **Controls**: Analyze button (shows spinner while loading), Clear button
- **Result section** (animated in with Framer Motion):
  - Stats row: processing time, word count, char count
  - `<LanguageCard>` — language + translation if applicable
  - `<SentimentCard>` — label + sarcasm badge + probabilities
  - `<EmotionCard>` — emotion + scores
  - `<ToneCard>` — tone + intensity + scores
  - `<IntentCard>` — intent + scores
  - `<InterpretationCard>` — full paragraph
  - `<ResponseCard>` — suggested reply
  - Export PDF button (triggers download)

---

#### `pages/BulkAnalysis.tsx`

Two tabs: **Text Input** and **CSV Upload**.

**Text Input tab**: Textarea where each line = one review.

**CSV Upload tab**:
- `<Dropzone>`: drag-and-drop or click to browse
- Calls `uploadCSV(file)` → shows preview of extracted texts, column used, total count

On Analyze:
- Collects texts (from textarea lines or CSV result)
- Calls `bulkAnalyze(texts)`
- Shows loading skeleton

**Results panel**:
- 4 KPI cards: Total, Dominant Sentiment, Dominant Emotion, Avg Confidence
- Sentiment distribution progress bars
- Emotion distribution progress bars
- Paginated results table (15/page):
  - Columns: #, Text, Language, Sentiment, Emotion, Tone, Intent, Confidence
  - Expandable rows: full text, translation, interpretation, response
- Search input + Sentiment filter dropdown
- Export PDF button

---

#### `pages/URLAnalysis.tsx`

- **URL input**: with real-time platform detection badge (YouTube/Instagram icon)
- **Max comments slider**: 5–100, shows estimated fetch time
- **Platform tips**: example URLs for each platform

On Analyze:
- Calls `analyzeURL(url, max_comments)`
- Long loading state (fetching + analyzing comments)

**Results** (sub-component `URLResultsPanel`):
- Platform badge + post metadata card (title, author, URL, counts)
- 4 KPI cards
- Sentiment + Emotion distribution bars
- Most Positive / Most Negative comment highlights
- Comments table with search + sentiment filter
- Expandable comment rows
- Export PDF button

---

#### `pages/History.tsx`

- **Filter bar**: text search input + sentiment dropdown
- **Paginated table** (20/page, page selector up to 5 pages shown):
  - Date, Text (truncated), Language, Mode badge, Sentiment, Emotion, Tone, Intent, Confidence, Delete icon
- **Expandable rows**:
  - Full text + translated text
  - Probability grids for sentiment/emotion/tone/intent
  - Interpretation + response paragraphs
  - Mode badge + processing time
- **Clear All button**: opens confirmation modal before deleting everything
- **Refresh button**: re-fetches current page

---

#### `pages/Settings.tsx`

Four sections:

**API Configuration**:
- Backend URL text input
- "Test Connection" button → calls `checkHealth()`, shows status badge

**Model Settings** (informational):
- Device selector display
- Max text length display

**Appearance**:
- Theme selector: 6 theme cards with color swatches, click to apply
- Animations toggle
- Show confidence decimals toggle

**About**:
- Version info table
- Platform description
- Tech stack badges
- ML models table (model name, task, type)
- Supported languages grid

---

### 6.3 Analysis Component Cards

All in `src/components/analysis/`. Each receives the relevant result object as props.

| Component | Displays |
|---|---|
| `SentimentCard` | Label badge (colored), confidence %, probability bars for all 3 classes, sarcasm alert if detected |
| `EmotionCard` | Emotion label + icon, confidence, score bar for each of 8 emotions |
| `ToneCard` | Tone label, intensity bar, score bars for all 8 tones |
| `IntentCard` | Intent label, confidence, score bars for all 8 intents |
| `LanguageCard` | Language name + flag-style badge, code, original text preview, translation preview if applicable |
| `InterpretationCard` | Full-width card with the interpretation paragraph |
| `ResponseCard` | Full-width card with quoted suggested response text |

---

### 6.4 UI Primitives

All in `src/components/ui/`. Reusable building blocks.

| Component | Props / Behaviour |
|---|---|
| `Card` | `className?` — rounded border box, consistent padding |
| `Button` | `variant` (primary/outline/ghost/danger), `size` (sm/md/lg), `loading`, `icon`, `disabled` |
| `Input` | `label?`, `icon?`, `error?`, character count display |
| `Textarea` | `label?`, `maxLength`, character counter, resizable |
| `Select` | `label?`, `options[]`, controlled |
| `Badge` | `variant` (primary/default/positive/negative/neutral/danger) — small pill label |
| `Progress` | `value` (0–1), `label?`, `color?` — horizontal bar |
| `Skeleton` | `className` — gray animated placeholder box |
| `Toast` | Re-exports React Hot Toast configured with dark theme |

---

### 6.5 Layout Components

#### `components/Layout.tsx`

- Top-level layout: `<Sidebar>` on the left + `<Outlet>` (page content) on the right
- Applies sidebar collapsed/expanded width via Tailwind transition classes

#### `components/Sidebar.tsx`

- Logo / branding at top
- Navigation items with Lucide icons:
  - Dashboard, Analyze, Bulk Analysis, URL Analysis, History, Settings
- Active route highlighted
- Collapse toggle button at bottom
- Collapsed state: shows icons only; expanded: icons + labels
- Framer Motion width animation on collapse/expand

---

### 6.6 State & API Layer

#### `store/index.ts` — Zustand Store

```ts
// State shape
{
  lastAnalysis: SingleAnalysisResponse | null
  lastBulkAnalysis: BulkAnalysisResponse | null
  lastURLAnalysis: URLAnalysisResponse | null
  analytics: AnalyticsData | null
  isAnalyzing: boolean
  isBulkAnalyzing: boolean
  isURLAnalyzing: boolean
  sidebarCollapsed: boolean
  themeId: string           // persisted to localStorage
}
```

Actions: `set*` for each state field, `toggleSidebar`, `setThemeId`.

`themeId` is read from `localStorage` on store init so theme persists across reloads.

#### `lib/api.ts` — Axios Client

Base URL: `import.meta.env.VITE_API_URL` or `http://localhost:8000/api/v1`
Timeout: 120 seconds (for slow ML inference)

Response interceptor:
- Extracts `error.response.data.detail` for user-friendly error messages
- Handles blob responses (PDF downloads) without JSON parsing

| Function | Method | Endpoint |
|---|---|---|
| `analyzeText(text)` | POST | `/analyze` |
| `bulkAnalyze(texts[])` | POST | `/bulk-analyze` |
| `uploadCSV(file)` | POST | `/upload-csv` |
| `getAnalytics()` | GET | `/analytics` |
| `getHistory(params)` | GET | `/history` |
| `getHistoryRecord(id)` | GET | `/history/{id}` |
| `deleteHistoryRecord(id)` | DELETE | `/history/{id}` |
| `clearHistory()` | DELETE | `/history` |
| `analyzeURL(url, n)` | POST | `/analyze-url` |
| `exportURLAnalysisPDF(data)` | POST | `/export-pdf` |
| `exportSingleAnalysisPDF(data)` | POST | `/export-pdf/single` |
| `exportBulkAnalysisPDF(data)` | POST | `/export-pdf/bulk` |
| `checkHealth()` | GET | `/health` |

---

### 6.7 Utilities & Themes

#### `lib/utils.ts`

Helper functions used throughout the UI:

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

6 theme definitions, each with:
```ts
{
  id: string
  name: string
  description: string
  colors: { primary, secondary, primaryRgb, secondaryRgb }
  preview: string[]   // hex swatches for Settings page
}
```

**Themes**: `dark`, `indigo`, `violet`, `rose`, `green`, `amber`

**`applyTheme(theme)`**:
Sets `--color-primary`, `--color-secondary`, `--color-primary-rgb`, `--color-secondary-rgb` on `document.documentElement`. Tailwind picks these up via `rgb(var(--color-primary))` utility classes defined in `tailwind.config.js`.

---

### 6.8 Types

#### `types/index.ts`

All TypeScript interfaces mirroring backend Pydantic models:

```ts
SentimentResult, SarcasmResult, EmotionResult, ToneResult, IntentResult
SingleAnalysisResponse
BulkAnalysisItem, BulkAnalysisResponse
PostMetadata, URLAnalysisItem, URLAnalysisResponse
AnalyticsData { trend_data[], top_words[], recent_reviews[], ... }
HistoryRecord
Theme
```

---

## 7. ML Models Reference

| Task | Model ID | Type | Labels / Output |
|---|---|---|---|
| Sentiment (embedding) | `distilbert-base-multilingual-cased` | Feature extractor | 768-dim embedding |
| Sentiment (classification) | `cardiffnlp/twitter-roberta-base-sentiment-latest` | 3-class | positive / negative / neutral |
| Sentiment (ensemble) | Logistic Regression (in-memory) | Binary → 3-class | Trained on 51 seed examples |
| Emotion | `j-hartmann/emotion-english-distilroberta-base` | 28-class | Joy / Anger / Disgust / Disappointment / Frustration / Excitement / Appreciation / Neutral |
| Tone | `typeform/distilbert-base-uncased-mnli` | Zero-shot NLI | professional / casual / sarcastic / aggressive / critical / appreciative / formal / informal |
| Intent | `typeform/distilbert-base-uncased-mnli` | Zero-shot NLI | complaint / appreciation / inquiry / request / suggestion / feedback / threat / praise |
| Sarcasm | `cardiffnlp/twitter-roberta-base-irony` | Binary | irony / non-irony (threshold 0.70) |
| Language | `langdetect` | Statistical n-gram | ISO 639-1 code |
| Translation | `Helsinki-NLP/opus-mt-{src}-en` | Seq2Seq (MarianMT) | English text |

---

## 8. API Endpoints Reference

Base URL: `http://localhost:8000/api/v1`

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Backend health check |
| GET | `/` | Version info |
| POST | `/analyze` | Single text analysis |
| POST | `/bulk-analyze` | Bulk analysis (up to 100 texts) |
| POST | `/upload-csv` | CSV text extraction |
| GET | `/analytics` | Dashboard analytics data |
| GET | `/history` | Paginated history with filters |
| GET | `/history/{id}` | Single history record |
| DELETE | `/history/{id}` | Delete one record |
| DELETE | `/history` | Clear all records |
| POST | `/analyze-url` | YouTube/Instagram comment analysis |
| POST | `/export-pdf` | Export URL analysis PDF |
| POST | `/export-pdf/single` | Export single analysis PDF |
| POST | `/export-pdf/bulk` | Export bulk analysis PDF |

---

## 9. Data Flow Walkthroughs

### Single Text Analysis

```
User types text → clicks "Analyze"
        │
        ▼
SingleAnalysis.tsx
  setIsAnalyzing(true)
  analyzeText(text)               ← lib/api.ts → POST /analyze
        │
        ▼
routers/analysis.py
  validate (len, not empty)
  analyze_text(text, "single")    ← modules/pipeline.py
        │
        ▼  [full pipeline — see Section 4]
        │
        ▼
  result dict assembled
  BackgroundTask: save to DB      ← database/models.py
  return SingleAnalysisResponse
        │
        ▼
SingleAnalysis.tsx
  setLastAnalysis(result)
  setIsAnalyzing(false)
  render result cards (animated)
  user clicks Export PDF
  exportSingleAnalysisPDF(result) ← POST /export-pdf/single
  browser downloads .pdf
```

---

### Bulk CSV Flow

```
User drops CSV file
        │
        ▼
BulkAnalysis.tsx
  uploadCSV(file)                 ← POST /upload-csv
        │
        ▼
routers/bulk.py
  pandas.read_csv()
  detect text column heuristically
  return {texts[], total, column_used}
        │
        ▼
BulkAnalysis.tsx
  shows preview (N texts loaded, column: "review")
  user clicks "Analyze All"
  bulkAnalyze(texts)              ← POST /bulk-analyze
        │
        ▼
routers/bulk.py
  validate (≤100 texts)
  assign batch_id
  for each text: analyze_text() → save to DB
  db.commit()
  aggregate Counter stats
  return BulkAnalysisResponse
        │
        ▼
BulkAnalysis.tsx
  render KPIs + distributions + paginated table
```

---

### URL (YouTube) Analysis

```
User pastes YouTube URL, sets max_comments=50
        │
        ▼
URLAnalysis.tsx
  analyzeURL(url, 50)             ← POST /analyze-url
        │
        ▼
routers/url_analysis.py
  detect_platform(url) → "youtube"
  fetch_youtube_comments(url, 50)
    │  YouTube Data API v3
    │  videos.list → metadata
    │  commentThreads.list → paginate
    └→ {platform, title, author, comments[]}
  assign batch_id
  for each comment: analyze_text(comment, "url")
  save all records to DB
  aggregate: distributions + most +/- comments
  return URLAnalysisResponse
        │
        ▼
URLAnalysis.tsx
  render post metadata + KPIs + distributions + comments table
```

---

### Dashboard Load

```
Dashboard.tsx mounts
        │
        ├── checkHealth()         ← GET /health
        │     sets connection badge
        │
        └── getAnalytics()        ← GET /analytics
              │
              ▼
        routers/analytics.py
          get_analytics(db)       ← modules/analytics.py
            query last 1000 records
            Counter distributions
            trend data (30 days)
            top 50 words
            recent 10 reviews
            AI insight sentence
            return AnalyticsData
              │
              ▼
        Dashboard.tsx
          render KPIs, PieChart,
          BarChart, LineChart,
          word cloud, recent activity
```

---

## 10. Database Schema

Single table: `analysis_records`

```sql
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
    batch_id                TEXT,   -- groups related records
    created_at              DATETIME DEFAULT (datetime('now'))
);
```

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

### Single Analysis

**Request**
```http
POST /api/v1/analyze
Content-Type: application/json

{
  "text": "This product is absolutely amazing! Delivered fast and works perfectly."
}
```

**Response**
```json
{
  "id": "a1b2c3d4-...",
  "original_text": "This product is absolutely amazing! Delivered fast and works perfectly.",
  "detected_language": "English",
  "language_code": "en",
  "translated_text": "This product is absolutely amazing! Delivered fast and works perfectly.",
  "is_translation": false,
  "sentiment": {
    "label": "positive",
    "confidence": 0.95,
    "probabilities": { "positive": 0.95, "negative": 0.03, "neutral": 0.02 }
  },
  "sarcasm": { "detected": false, "confidence": 0.12 },
  "emotion": {
    "label": "Joy",
    "confidence": 0.89,
    "scores": { "Joy": 0.89, "Excitement": 0.07, "Neutral": 0.02, "Appreciation": 0.02 }
  },
  "tone": {
    "label": "appreciative",
    "intensity": 0.82,
    "scores": { "appreciative": 0.82, "professional": 0.10, "casual": 0.08 }
  },
  "intent": {
    "label": "appreciation",
    "confidence": 0.78,
    "scores": { "appreciation": 0.78, "praise": 0.14, "feedback": 0.08 }
  },
  "interpretation": "The reviewer expresses a strongly positive sentiment with evident joy and satisfaction. The appreciative tone and intent suggest genuine happiness with the product and delivery experience.",
  "suggested_response": "Thank you so much for your wonderful feedback! We're thrilled to hear you're happy with your purchase and the delivery. It means a lot to us!",
  "processing_time": 1.234,
  "timestamp": "2025-06-11T10:30:45.123Z",
  "word_count": 12,
  "char_count": 71
}
```

---

### Bulk Analysis

**Request**
```http
POST /api/v1/bulk-analyze
Content-Type: application/json

{
  "texts": [
    "Absolutely love this product!",
    "Worst experience ever. Never buying again.",
    "It's okay, nothing special."
  ]
}
```

**Response**
```json
{
  "total": 3,
  "items": [
    {
      "row_number": 1,
      "original_text": "Absolutely love this product!",
      "sentiment": { "label": "positive", "confidence": 0.97, "probabilities": {...} },
      "emotion": { "label": "Joy", "confidence": 0.91, "scores": {...} },
      "tone": { "label": "appreciative", "intensity": 0.88, "scores": {...} },
      "intent": { "label": "appreciation", "confidence": 0.83, "scores": {...} },
      "interpretation": "...",
      "suggested_response": "...",
      "processing_time": 0.89
    }
  ],
  "aggregate": {
    "sentiment_distribution": { "positive": 1, "negative": 1, "neutral": 1 },
    "emotion_distribution": { "Joy": 1, "Anger": 1, "Neutral": 1 },
    "tone_distribution": { "appreciative": 1, "aggressive": 1, "casual": 1 },
    "intent_distribution": { "appreciation": 1, "complaint": 1, "feedback": 1 },
    "dominant_sentiment": "positive",
    "dominant_emotion": "Joy",
    "dominant_tone": "appreciative",
    "dominant_intent": "appreciation",
    "average_confidence": 0.84
  },
  "processing_time": 3.12
}
```

---

### URL Analysis

**Request**
```http
POST /api/v1/analyze-url
Content-Type: application/json

{
  "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "max_comments": 20
}
```

**Response (shape)**
```json
{
  "metadata": {
    "platform": "youtube",
    "title": "Rick Astley - Never Gonna Give You Up",
    "author": "Rick Astley",
    "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "total_available": 4500000,
    "fetched_count": 20
  },
  "total": 20,
  "items": [ ...20 BulkAnalysisItem objects... ],
  "aggregate": {
    "sentiment_distribution": { "positive": 14, "neutral": 4, "negative": 2 },
    "dominant_sentiment": "positive",
    "most_positive_comment": "This song never gets old! Absolute classic.",
    "most_negative_comment": "Can't believe I got rickrolled again..."
  },
  "processing_time": 18.45
}
```

---

*Generated: 2025-06-11*
