from langdetect import detect, detect_langs, LangDetectException

LANGUAGE_NAMES = {
    "en": "English",
    "hi": "Hindi",
    "bn": "Bengali",
    "as": "Assamese",
    "te": "Telugu",
    "ta": "Tamil",
    "mr": "Marathi",
    "gu": "Gujarati",
    "kn": "Kannada",
    "ml": "Malayalam",
    "pa": "Punjabi",
    "ur": "Urdu",
    "fr": "French",
    "de": "German",
    "es": "Spanish",
    "it": "Italian",
    "pt": "Portuguese",
    "ru": "Russian",
    "zh-cn": "Chinese (Simplified)",
    "ja": "Japanese",
    "ko": "Korean",
    "ar": "Arabic",
}


def detect_language(text: str) -> tuple[str, str, float]:
    """Returns (language_code, language_name, confidence)."""
    try:
        langs = detect_langs(text)
        if langs:
            top = langs[0]
            code = str(top.lang)
            name = LANGUAGE_NAMES.get(code, f"Unknown ({code})")
            confidence = float(top.prob)
            return code, name, confidence
        return "en", "English", 1.0
    except LangDetectException:
        return "en", "English", 0.5


def is_hinglish(text: str) -> bool:
    """Detect mixed Hindi-English written in Devanagari script."""
    hindi_chars = sum(1 for c in text if "ऀ" <= c <= "ॿ")
    english_chars = sum(1 for c in text if c.isascii() and c.isalpha())
    total = hindi_chars + english_chars
    if total == 0:
        return False
    hindi_ratio = hindi_chars / total
    return 0.1 < hindi_ratio < 0.9


# Common Hindi function words / verb forms written in Roman script.
# Presence of ≥ 2 of these in a short text is a strong signal for Romanized Hinglish.
_ROMANIZED_HINDI_WORDS = {
    'ko', 'ka', 'ki', 'ke', 'hai', 'hain', 'se', 'ne', 'mein', 'me',
    'kya', 'koi', 'aur', 'bhi', 'nahi', 'nahin', 'tha', 'thi', 'the',
    'ho', 'jab', 'tab', 'wala', 'wali', 'wale', 'toh', 'bhai', 'yaar',
    'bahut', 'accha', 'achha', 'log', 'karna', 'krna', 'krke', 'kro',
    'dekha', 'dekho', 'mujhe', 'tum', 'aap', 'hum', 'unka', 'jisne',
    'jiske', 'sikhaya', 'sikhta', 'sikha', 'bata', 'bataya', 'kuch',
    'sab', 'sabhi', 'phir', 'fir', 'lekin', 'matlab', 'tere', 'mera',
    'meri', 'tera', 'uska', 'uski', 'yeh', 'ye', 'woh', 'vo', 'jo',
    'jitna', 'itna', 'kitna', 'kitne', 'unhone', 'usne', 'humne', 'isko',
    'usko', 'inhe', 'unhe', 'kyun', 'kyunki', 'kyoki', 'isliye', 'agar',
    'toh', 'phle', 'pehle', 'abhi', 'baad', 'puri', 'poori', 'sara',
    'raha', 'rahi', 'rahe', 'laga', 'lagi', 'lage', 'kiye', 'kiya',
}


def is_romanized_hinglish(text: str) -> bool:
    """Detect Hinglish written entirely in Roman/ASCII script (no Devanagari).

    MarianMT cannot translate Roman-script Hindi, so callers should skip
    translation and analyse the text as-is using the multilingual BERT.
    """
    # If Devanagari characters are present, is_hinglish() already covers it.
    if any("ऀ" <= c <= "ॿ" for c in text):
        return False

    words = [w.strip(".,!?\"'()[]").lower() for w in text.split()]
    words = [w for w in words if w.isalpha()]   # keep only alphabetic tokens
    if len(words) < 3:
        return False

    hindi_count = sum(1 for w in words if w in _ROMANIZED_HINDI_WORDS)
    # Require at least 2 Hindi words AND ≥ 15 % of alphabetic tokens
    return hindi_count >= 2 and hindi_count / len(words) >= 0.15
