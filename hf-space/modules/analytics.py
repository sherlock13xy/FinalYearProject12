from sqlalchemy.orm import Session
from sqlalchemy import desc
from database.models import AnalysisRecord
from collections import Counter, defaultdict
import re
import logging

logger = logging.getLogger(__name__)

STOPWORDS = {
    "the", "a", "an", "is", "it", "in", "on", "at", "to", "for",
    "of", "and", "or", "but", "this", "that", "was", "are", "i",
    "my", "me", "we", "you", "he", "she", "they", "with", "be",
    "have", "has", "had", "do", "does", "did", "will", "would",
    "can", "could", "not", "no", "so", "if", "from", "by", "as",
    "very", "just", "get", "got",
}


def get_analytics(db: Session, limit: int = 1000) -> dict:
    records = (
        db.query(AnalysisRecord)
        .order_by(desc(AnalysisRecord.created_at))
        .limit(limit)
        .all()
    )

    if not records:
        return {
            "total_analyzed": 0,
            "sentiment_distribution": {"positive": 0, "negative": 0, "neutral": 0},
            "emotion_distribution": {},
            "tone_distribution": {},
            "intent_distribution": {},
            "language_distribution": {"English": 0},
            "average_confidence": 0.0,
            "trend_data": [],
            "top_words": [],
            "recent_reviews": [],
            "ai_insight": (
                "No analyses have been performed yet. "
                "Start analyzing text to see insights here."
            ),
            "dominant_sentiment": "neutral",
            "dominant_emotion": "neutral",
            "dominant_tone": "professional",
            "dominant_intent": "feedback",
        }

    total = len(records)

    # Distributions
    sentiment_dist = Counter(r.sentiment_label for r in records if r.sentiment_label)
    emotion_dist = Counter(r.emotion_label for r in records if r.emotion_label)
    tone_dist = Counter(r.tone_label for r in records if r.tone_label)
    intent_dist = Counter(r.intent_label for r in records if r.intent_label)
    lang_dist = Counter(r.detected_language for r in records if r.detected_language)

    # Average confidence
    confidences = [r.sentiment_confidence for r in records if r.sentiment_confidence is not None]
    avg_confidence = round(sum(confidences) / len(confidences), 4) if confidences else 0.0

    # Trend data (group by date, last 30 unique days)
    daily: dict[str, dict] = defaultdict(
        lambda: {"positive": 0, "negative": 0, "neutral": 0, "total": 0}
    )
    for r in records:
        if r.created_at:
            date_key = r.created_at.strftime("%Y-%m-%d")
            daily[date_key][r.sentiment_label or "neutral"] += 1
            daily[date_key]["total"] += 1

    trend_data = [
        {"date": date, **counts}
        for date, counts in sorted(daily.items())[-30:]
    ]

    # Word frequency across all analysed text
    all_text = " ".join(
        r.translated_text or r.original_text or "" for r in records
    )
    words = re.findall(r"\b[a-zA-Z]{3,}\b", all_text.lower())
    word_freq = Counter(w for w in words if w not in STOPWORDS)
    top_words = [
        {"text": word, "value": count}
        for word, count in word_freq.most_common(50)
    ]

    # Recent reviews (up to 10)
    recent_reviews = []
    for r in records[:10]:
        orig = r.original_text or ""
        recent_reviews.append(
            {
                "id": r.id,
                "text": orig[:100] + ("..." if len(orig) > 100 else ""),
                "sentiment": r.sentiment_label,
                "emotion": r.emotion_label,
                "confidence": r.sentiment_confidence,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
        )

    # Dominant values
    dominant_sentiment = (
        sentiment_dist.most_common(1)[0][0] if sentiment_dist else "neutral"
    )
    dominant_emotion = (
        emotion_dist.most_common(1)[0][0] if emotion_dist else "Neutral"
    )
    dominant_tone = tone_dist.most_common(1)[0][0] if tone_dist else "professional"
    dominant_intent = (
        intent_dist.most_common(1)[0][0] if intent_dist else "feedback"
    )

    ai_insight = generate_ai_insight(
        total,
        dominant_sentiment,
        dominant_emotion,
        dict(sentiment_dist),
        dict(tone_dist),
        dict(intent_dist),
    )

    return {
        "total_analyzed": total,
        "sentiment_distribution": dict(sentiment_dist),
        "emotion_distribution": dict(emotion_dist),
        "tone_distribution": dict(tone_dist),
        "intent_distribution": dict(intent_dist),
        "language_distribution": dict(lang_dist),
        "average_confidence": avg_confidence,
        "trend_data": trend_data,
        "top_words": top_words,
        "recent_reviews": recent_reviews,
        "ai_insight": ai_insight,
        "dominant_sentiment": dominant_sentiment,
        "dominant_emotion": dominant_emotion,
        "dominant_tone": dominant_tone,
        "dominant_intent": dominant_intent,
    }


def generate_ai_insight(
    total: int,
    dom_sentiment: str,
    dom_emotion: str,
    sent_dist: dict,
    tone_dist: dict,
    intent_dist: dict,
) -> str:
    if total == 0:
        return "No data available yet."

    pos = sent_dist.get("positive", 0)
    neg = sent_dist.get("negative", 0)

    pos_pct = round(pos / total * 100) if total > 0 else 0
    neg_pct = round(neg / total * 100) if total > 0 else 0

    parts: list[str] = []

    if pos_pct > 70:
        parts.append(
            f"Customer sentiment is overwhelmingly positive ({pos_pct}%), "
            "indicating strong brand satisfaction."
        )
    elif pos_pct > 50:
        parts.append(
            f"The majority of feedback is positive ({pos_pct}%), "
            "suggesting a generally good customer experience."
        )
    elif neg_pct > 50:
        parts.append(
            f"A significant portion of feedback is negative ({neg_pct}%), "
            "signaling potential service issues that require immediate attention."
        )
    else:
        parts.append(
            f"Customer sentiment is mixed with {pos_pct}% positive and "
            f"{neg_pct}% negative responses."
        )

    top_intent = max(intent_dist, key=intent_dist.get) if intent_dist else "feedback"
    if top_intent == "complaint":
        parts.append(
            "The dominant customer intent is complaints — consider reviewing "
            "support workflows and product quality."
        )
    elif top_intent == "appreciation":
        parts.append(
            "Customers are primarily expressing appreciation — leverage this "
            "for testimonials and case studies."
        )
    elif top_intent == "suggestion":
        parts.append(
            "Many customers are offering suggestions — this is a valuable "
            "source for product roadmap insights."
        )

    top_tone = max(tone_dist, key=tone_dist.get) if tone_dist else "professional"
    if top_tone in ("aggressive", "critical"):
        parts.append(
            f"The {top_tone} tone in many reviews suggests elevated customer "
            "frustration levels."
        )

    parts.append(
        f"Analysis is based on {total} total review(s) processed through the platform."
    )

    return " ".join(parts)
