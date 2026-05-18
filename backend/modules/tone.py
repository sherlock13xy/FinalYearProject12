import logging
from transformers import pipeline
import threading

logger = logging.getLogger(__name__)

TONE_LABELS = [
    "professional",
    "casual",
    "sarcastic",
    "aggressive",
    "critical",
    "appreciative",
    "formal",
    "informal",
]

TONE_HYPOTHESES = {
    "professional": "This text is written in a professional tone.",
    "casual": "This text is written in a casual and informal tone.",
    "sarcastic": "This text contains sarcasm or irony.",
    "aggressive": "This text has an aggressive or hostile tone.",
    "critical": "This text is critical and finding fault.",
    "appreciative": "This text is appreciative and grateful.",
    "formal": "This text is formal and official.",
    "informal": "This text is informal and colloquial.",
}


class ToneDetector:
    """Singleton zero-shot NLI tone classifier."""

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

        logger.info("Initializing tone detector (zero-shot NLI)...")
        self.classifier = pipeline(
            "zero-shot-classification",
            model="typeform/distilbert-base-uncased-mnli",
            device=0 if device == "cuda" else -1,
        )
        self._initialized = True
        logger.info("Tone detector initialized")

    def analyze(self, text: str) -> dict:
        try:
            result = self.classifier(
                text[:512],
                candidate_labels=TONE_LABELS,
                multi_label=False,
            )

            scores = {
                label: round(score, 4)
                for label, score in zip(result["labels"], result["scores"])
            }
            top_tone = result["labels"][0]
            top_score = result["scores"][0]
            intensity = round(float(top_score), 4)

            return {
                "label": top_tone,
                "intensity": intensity,
                "scores": scores,
            }
        except Exception as e:
            logger.error(f"Tone detection failed: {e}")
            return {
                "label": "professional",
                "intensity": 0.5,
                "scores": {"professional": 0.5},
            }


def get_tone_detector() -> ToneDetector:
    return ToneDetector()
