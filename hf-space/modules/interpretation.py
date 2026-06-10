def generate_interpretation(
    original_text: str,
    translated_text: str,
    language: str,
    sentiment: dict,
    emotion: dict,
    tone: dict,
    intent: dict,
) -> str:
    """Generate a human-readable contextual interpretation of the analysis."""

    sentiment_label = sentiment["label"]
    emotion_label = emotion["label"]
    tone_label = tone["label"].lower()
    intent_label = intent["label"].lower()
    sentiment_conf = sentiment["confidence"]

    parts: list[str] = []

    # Language note
    if language not in ("English", "en"):
        parts.append(
            f"This {language} text has been analyzed after translation to English."
        )

    # Sentiment interpretation
    sent_map = {
        "positive": (
            f"The reviewer expresses a "
            f"{'strongly' if sentiment_conf > 0.85 else 'moderately'} positive sentiment"
        ),
        "negative": (
            f"The reviewer expresses a "
            f"{'strongly' if sentiment_conf > 0.85 else 'moderately'} negative sentiment"
        ),
        "neutral": "The reviewer expresses a neutral sentiment",
    }
    parts.append(sent_map.get(sentiment_label, "The sentiment is mixed"))

    # Emotion + intent combination
    emotion_intent_map = {
        ("Joy", "appreciation"): (
            "with evident satisfaction and appreciation for the experience."
        ),
        ("Joy", "praise"): "showing genuine enthusiasm and commendation.",
        ("Anger", "complaint"): (
            "highlighting significant dissatisfaction and a formal complaint."
        ),
        ("Anger", "threat"): (
            "expressing strong discontent with threatening undertones."
        ),
        ("Frustration", "complaint"): (
            "indicating frustration with specific aspects of the service."
        ),
        ("Disappointment", "feedback"): (
            "conveying disappointment and constructive feedback."
        ),
        ("Excitement", "appreciation"): (
            "reflecting high excitement and strong appreciation."
        ),
        ("Neutral", "inquiry"): (
            "while seeking specific information or clarification."
        ),
        ("Neutral", "suggestion"): (
            "and offers a neutral suggestion for improvement."
        ),
        ("Neutral", "request"): "and makes a clear and reasonable request.",
        ("Disgust", "complaint"): (
            "expressing strong disgust and dissatisfaction."
        ),
    }

    emotion_intent_key = (emotion_label, intent_label)
    emotion_intent_text = emotion_intent_map.get(
        emotion_intent_key,
        f"with a {emotion_label.lower()} emotion, primarily intending to express {intent_label}.",
    )
    parts.append(emotion_intent_text)

    # Tone note
    if tone_label in ("sarcastic", "aggressive", "critical"):
        parts.append(
            f"The tone is notably {tone_label}, suggesting the author feels strongly "
            "about this topic."
        )
    elif tone_label in ("professional", "formal"):
        parts.append(f"The response is written in a {tone_label} manner.")

    # Key phrase extraction from translated text
    words = translated_text.lower().split() if translated_text else []
    positive_keywords = {
        "good", "great", "excellent", "love", "perfect", "amazing",
        "wonderful", "best", "fast", "quality",
    }
    negative_keywords = {
        "bad", "terrible", "poor", "worst", "horrible", "broken",
        "slow", "waste", "disappointed", "useless",
    }

    found_positive = [w for w in words if w in positive_keywords]
    found_negative = [w for w in words if w in negative_keywords]

    if found_positive and sentiment_label == "positive":
        parts.append(
            f"Key positive aspects mentioned include: "
            f"{', '.join(list(dict.fromkeys(found_positive))[:3])}."
        )
    if found_negative and sentiment_label == "negative":
        parts.append(
            f"Key negative aspects mentioned include: "
            f"{', '.join(list(dict.fromkeys(found_negative))[:3])}."
        )

    return " ".join(parts)
