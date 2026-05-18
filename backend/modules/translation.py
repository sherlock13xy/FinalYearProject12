import torch
from transformers import MarianMTModel, MarianTokenizer
import logging

logger = logging.getLogger(__name__)

# Model mapping for language pairs (source -> English)
TRANSLATION_MODELS = {
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
    "default": "Helsinki-NLP/opus-mt-mul-en",  # multilingual fallback
}

_translation_cache: dict = {}


def get_translation_model(lang_code: str):
    """Load (and cache) the MarianMT model for the given source language."""
    model_name = TRANSLATION_MODELS.get(lang_code, TRANSLATION_MODELS["default"])
    if model_name not in _translation_cache:
        logger.info(f"Loading translation model: {model_name}")
        tokenizer = MarianTokenizer.from_pretrained(model_name)
        model = MarianMTModel.from_pretrained(model_name)
        model.eval()
        _translation_cache[model_name] = (tokenizer, model)
    return _translation_cache[model_name]


def translate_to_english(text: str, source_lang: str) -> tuple[str, bool]:
    """Returns (translated_text, was_translated).

    If source_lang is already English the original text is returned unchanged
    and was_translated is False.
    """
    if source_lang == "en":
        return text, False

    try:
        tokenizer, model = get_translation_model(source_lang)
        inputs = tokenizer(
            [text],
            return_tensors="pt",
            padding=True,
            truncation=True,
            max_length=512,
        )
        with torch.no_grad():
            translated = model.generate(**inputs, max_length=512)
        result = tokenizer.decode(translated[0], skip_special_tokens=True)
        return result, True
    except Exception as e:
        logger.error(f"Translation failed for lang {source_lang}: {e}")
        return text, False
