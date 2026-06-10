import logging
import threading
from transformers import pipeline

logger = logging.getLogger(__name__)

SARCASM_THRESHOLD = 0.70


class SarcasmDetector:
    """Singleton sarcasm/irony detector backed by twitter-roberta-base-irony."""

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

        logger.info("Initializing sarcasm detector...")
        self.sarcasm_pipeline = pipeline(
            "text-classification",
            model="cardiffnlp/twitter-roberta-base-irony",
            device=0 if device == "cuda" else -1,
        )
        self._initialized = True
        logger.info("Sarcasm detector initialized")

    def analyze(self, text: str) -> dict:
        try:
            result = self.sarcasm_pipeline(text[:512])[0]
            label = result["label"].lower()   # "irony" or "non_irony"
            score = float(result["score"])
            detected = label == "irony" and score >= SARCASM_THRESHOLD
            return {
                "detected": detected,
                "confidence": round(score if label == "irony" else 1.0 - score, 4),
            }
        except Exception as e:
            logger.error(f"Sarcasm detection failed: {e}")
            return {"detected": False, "confidence": 0.0}


def get_sarcasm_detector() -> SarcasmDetector:
    return SarcasmDetector()
