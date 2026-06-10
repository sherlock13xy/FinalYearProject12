import logging
from transformers import pipeline
import threading

logger = logging.getLogger(__name__)

INTENT_LABELS = [
    "complaint",
    "appreciation",
    "inquiry",
    "request",
    "suggestion",
    "feedback",
    "threat",
    "praise",
]


class IntentDetector:
    """Singleton zero-shot NLI intent classifier."""

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

        logger.info("Initializing intent detector (zero-shot NLI)...")
        self.classifier = pipeline(
            "zero-shot-classification",
            model="typeform/distilbert-base-uncased-mnli",
            device=0 if device == "cuda" else -1,
        )
        self._initialized = True
        logger.info("Intent detector initialized")

    def analyze(self, text: str) -> dict:
        try:
            result = self.classifier(
                text[:512],
                candidate_labels=INTENT_LABELS,
                multi_label=False,
            )

            scores = {
                label: round(score, 4)
                for label, score in zip(result["labels"], result["scores"])
            }
            top_intent = result["labels"][0]
            top_score = result["scores"][0]

            return {
                "label": top_intent,
                "confidence": round(float(top_score), 4),
                "scores": scores,
            }
        except Exception as e:
            logger.error(f"Intent detection failed: {e}")
            return {
                "label": "feedback",
                "confidence": 0.5,
                "scores": {"feedback": 0.5},
            }


def get_intent_detector() -> IntentDetector:
    return IntentDetector()
