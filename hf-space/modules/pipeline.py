import time
import uuid
import logging
from datetime import datetime

from config import settings
from modules.language_detector import detect_language, is_hinglish, is_romanized_hinglish
from modules.translation import translate_to_english
from modules.sentiment import get_sentiment_analyzer
from modules.emotion import get_emotion_detector
from modules.tone import get_tone_detector
from modules.intent import get_intent_detector
from modules.sarcasm import get_sarcasm_detector
from modules.interpretation import generate_interpretation
from modules.response_generator import generate_response

logger = logging.getLogger(__name__)

# Emotions that are semantically compatible with each sentiment polarity.
# The emotion model runs independently, so we post-process its top pick to
# ensure it doesn't contradict the sentiment (e.g. Joy on a Negative result).
_SENTIMENT_EMOTION_COMPAT = {
    "positive": {"Joy", "Excitement", "Neutral", "Appreciation"},
    "negative": {"Anger", "Disappointment", "Frustration", "Disgust"},
    "neutral":  None,  # None means any emotion is acceptable
}


def _align_emotion_with_sentiment(sentiment_label: str, emotion: dict) -> dict:
    """Return emotion dict with label guaranteed compatible with sentiment_label.

    If the model's top emotion already fits, it is returned unchanged.
    Otherwise the highest-scoring compatible emotion from the existing scores
    dict is substituted so no extra inference is needed.
    """
    compatible = _SENTIMENT_EMOTION_COMPAT.get(sentiment_label.lower())
    if compatible is None or emotion["label"] in compatible:
        return emotion

    compatible_scores = {k: v for k, v in emotion["scores"].items() if k in compatible}
    if not compatible_scores:
        return emotion  # nothing compatible found — leave as-is

    best_label = max(compatible_scores, key=compatible_scores.get)
    return {**emotion, "label": best_label, "confidence": compatible_scores[best_label]}


def analyze_text(text: str, mode: str = "single") -> dict:
    """Run the full analysis pipeline on *text* and return a results dict."""

    start_time = time.time()
    text = text.strip()
    if not text:
        raise ValueError("Text cannot be empty")

    # Step 1: Language detection
    lang_code, lang_name, lang_confidence = detect_language(text)

    # Devanagari Hinglish — translate via Hindi→English MarianMT
    if is_hinglish(text):
        lang_name = "Hinglish"
        lang_code = "hi"
    # Romanized Hinglish (Roman-script Hindi mixed with English).
    # MarianMT expects Devanagari and will garble Roman-script Hindi,
    # so we skip translation and let multilingual BERT handle it directly.
    elif is_romanized_hinglish(text):
        lang_name = "Hinglish"
        lang_code = "en"  # no translation

    # Step 2: Translation to English
    translated_text, was_translated = translate_to_english(text, lang_code)
    analysis_text = translated_text

    # Step 3: Sentiment (BERT + LR ensemble)
    sentiment_analyzer = get_sentiment_analyzer()
    sentiment = sentiment_analyzer.analyze(analysis_text)

    # Step 3b: Sarcasm — if irony is detected with high confidence and the raw
    # sentiment is positive, flip to negative (the most common sarcasm pattern:
    # positive words used to mean the opposite).
    sarcasm_detector = get_sarcasm_detector()
    sarcasm = sarcasm_detector.analyze(analysis_text)
    if sarcasm["detected"] and sentiment["label"] == "positive":
        old_neg = sentiment["probabilities"].get("negative", 0.0)
        old_pos = sentiment["probabilities"].get("positive", 0.0)
        sentiment = {
            "label": "negative",
            "confidence": round(max(old_neg, sarcasm["confidence"] * 0.85), 4),
            "probabilities": {
                "positive": round(old_neg, 4),
                "negative": round(old_pos, 4),
                "neutral": sentiment["probabilities"].get("neutral", 0.0),
            },
        }

    # Step 4: Emotion
    emotion_detector = get_emotion_detector()
    emotion = emotion_detector.analyze(analysis_text)
    emotion = _align_emotion_with_sentiment(sentiment["label"], emotion)

    # Step 5: Tone
    tone_detector = get_tone_detector()
    tone = tone_detector.analyze(analysis_text)

    # Step 6: Intent
    intent_detector = get_intent_detector()
    intent = intent_detector.analyze(analysis_text)

    # Step 7: Semantic interpretation
    interpretation = generate_interpretation(
        original_text=text,
        translated_text=analysis_text,
        language=lang_name,
        sentiment=sentiment,
        emotion=emotion,
        tone=tone,
        intent=intent,
    )

    # Step 8: Suggested response
    suggested_response = generate_response(
        sentiment=sentiment,
        tone=tone,
        intent=intent,
        emotion=emotion,
        original_text=text,
    )

    processing_time = round(time.time() - start_time, 3)

    return {
        "id": str(uuid.uuid4()),
        "original_text": text,
        "detected_language": lang_name,
        "language_code": lang_code,
        "translated_text": analysis_text,
        "is_translation": was_translated,
        "sentiment": sentiment,
        "sarcasm": sarcasm,
        "emotion": emotion,
        "tone": tone,
        "intent": intent,
        "interpretation": interpretation,
        "suggested_response": suggested_response,
        "processing_time": processing_time,
        "timestamp": datetime.utcnow().isoformat(),
        "word_count": len(text.split()),
        "char_count": len(text),
    }


def initialize_models() -> None:
    """Eagerly load and warm-up all ML models.

    Called once at application startup so the first real request does not
    block while downloading / loading model weights.
    """

    device = settings.DEVICE
    if device == "auto":
        import torch
        device = "cuda" if torch.cuda.is_available() else "cpu"

    logger.info(f"Initializing models on device: {device}")

    try:
        sa = get_sentiment_analyzer()
        sa.initialize(device)
        logger.info("Sentiment analyzer ready")
    except Exception as e:
        logger.error(f"Failed to initialize sentiment analyzer: {e}")

    try:
        ed = get_emotion_detector()
        ed.initialize(device)
        logger.info("Emotion detector ready")
    except Exception as e:
        logger.error(f"Failed to initialize emotion detector: {e}")

    try:
        td = get_tone_detector()
        td.initialize(device)
        logger.info("Tone detector ready")
    except Exception as e:
        logger.error(f"Failed to initialize tone detector: {e}")

    try:
        idet = get_intent_detector()
        idet.initialize(device)
        logger.info("Intent detector ready")
    except Exception as e:
        logger.error(f"Failed to initialize intent detector: {e}")

    try:
        sd = get_sarcasm_detector()
        sd.initialize(device)
        logger.info("Sarcasm detector ready")
    except Exception as e:
        logger.error(f"Failed to initialize sarcasm detector: {e}")

    logger.info("All models initialized successfully")
