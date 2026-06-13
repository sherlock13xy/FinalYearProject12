import torch
import logging
from transformers import MarianMTModel, MarianTokenizer

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# MarianMT — kept as offline fallback for specific well-supported languages
# ---------------------------------------------------------------------------
_MARIAN_MODELS = {
    "hi": "Helsinki-NLP/opus-mt-hi-en",
    "bn": "Helsinki-NLP/opus-mt-bn-en",
    "fr": "Helsinki-NLP/opus-mt-fr-en",
    "de": "Helsinki-NLP/opus-mt-de-en",
    "es": "Helsinki-NLP/opus-mt-es-en",
    "it": "Helsinki-NLP/opus-mt-it-en",
    "pt": "Helsinki-NLP/opus-mt-pt-en",
    "ru": "Helsinki-NLP/opus-mt-ru-en",
    "zh-cn": "Helsinki-NLP/opus-mt-zh-en",
    "ja": "Helsinki-NLP/opus-mt-ja-en",
    "ko": "Helsinki-NLP/opus-mt-ko-en",
    "ar": "Helsinki-NLP/opus-mt-ar-en",
}

_marian_cache: dict = {}


def _marian_translate(text: str, source_lang: str) -> str | None:
    """Try MarianMT translation. Returns None on any failure."""
    model_name = _MARIAN_MODELS.get(source_lang)
    if not model_name:
        return None
    try:
        if model_name not in _marian_cache:
            logger.info(f"Loading MarianMT model: {model_name}")
            tokenizer = MarianTokenizer.from_pretrained(model_name)
            model = MarianMTModel.from_pretrained(model_name)
            model.eval()
            _marian_cache[model_name] = (tokenizer, model)
        tokenizer, model = _marian_cache[model_name]
        inputs = tokenizer(
            [text], return_tensors="pt", padding=True, truncation=True, max_length=512
        )
        with torch.no_grad():
            translated = model.generate(**inputs, max_length=512)
        return tokenizer.decode(translated[0], skip_special_tokens=True)
    except Exception as exc:
        logger.warning(f"MarianMT failed for {source_lang}: {exc}")
        return None


def _google_translate(text: str) -> str | None:
    """Translate to English via Google Translate (deep-translator, no API key)."""
    try:
        from deep_translator import GoogleTranslator
        result = GoogleTranslator(source="auto", target="en").translate(text)
        return result if result and result.strip() else None
    except Exception as exc:
        logger.warning(f"Google Translate failed: {exc}")
        return None


def translate_to_english(text: str, source_lang: str) -> tuple[str, bool]:
    """Translate *text* to English.

    Strategy:
    1. Skip if already English.
    2. Try Google Translate (best quality, handles 100+ languages automatically).
    3. Fall back to MarianMT for the specific language if available.
    4. Return original text unchanged if both fail.
    """
    if source_lang == "en":
        return text, False

    # ── 1. Google Translate (primary) ──────────────────────────────────────
    result = _google_translate(text)
    if result and result.strip() and result.strip().lower() != text.strip().lower():
        logger.info(f"Google Translate succeeded for lang={source_lang}")
        return result, True

    # ── 2. MarianMT fallback ────────────────────────────────────────────────
    result = _marian_translate(text, source_lang)
    if result and result.strip():
        logger.info(f"MarianMT fallback used for lang={source_lang}")
        return result, True

    # ── 3. Give up — return original ───────────────────────────────────────
    logger.error(f"All translation methods failed for lang={source_lang}")
    return text, False
