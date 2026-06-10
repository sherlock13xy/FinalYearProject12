import logging
from transformers import pipeline
import threading

logger = logging.getLogger(__name__)

EMOTION_LABELS = ["joy", "sadness", "anger", "fear", "surprise", "disgust", "neutral"]

EMOTION_DISPLAY = {
    "joy": "Joy",
    "sadness": "Disappointment",
    "anger": "Anger",
    "fear": "Frustration",
    "surprise": "Excitement",
    "disgust": "Disgust",
    "neutral": "Neutral",
    "appreciation": "Appreciation",
    "frustration": "Frustration",
}


class EmotionDetector:
    """Singleton emotion detector backed by a distilRoBERTa GoEmotions model."""

    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._initialized = False
        return cls._instance

    def initialize(self, device: str = "cpu"):
        if self._initialized:
            return

        logger.info("Initializing emotion detector...")
        self.emotion_pipeline = pipeline(
            "text-classification",
            model="j-hartmann/emotion-english-distilroberta-base",
            top_k=None,
            device=0 if device == "cuda" else -1,
        )
        self._initialized = True
        logger.info("Emotion detector initialized")

    def analyze(self, text: str) -> dict:
        try:
            results = self.emotion_pipeline(text[:512])[0]
            scores = {
                item["label"].lower(): round(item["score"], 4) for item in results
            }

            # Map raw labels to display labels, keeping the maximum when two
            # raw labels map to the same display label.
            display_scores: dict[str, float] = {}
            for label, score in scores.items():
                display_label = EMOTION_DISPLAY.get(label, label)
                display_scores[display_label] = max(
                    display_scores.get(display_label, 0.0), score
                )

            top_emotion = max(display_scores, key=display_scores.get)
            top_score = display_scores[top_emotion]

            return {
                "label": top_emotion,
                "confidence": top_score,
                "scores": display_scores,
            }
        except Exception as e:
            logger.error(f"Emotion detection failed: {e}")
            return {
                "label": "Neutral",
                "confidence": 0.5,
                "scores": {"Neutral": 0.5},
            }


def get_emotion_detector() -> EmotionDetector:
    return EmotionDetector()
