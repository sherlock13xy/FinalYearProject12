import numpy as np
import torch
import logging
from transformers import AutoTokenizer, AutoModel, pipeline
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import LabelEncoder
import threading

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Seed training data for the Logistic Regression head
# ---------------------------------------------------------------------------
SEED_DATA = [
    # Positive — formal
    ("excellent product amazing quality love it highly recommended", "positive"),
    ("great service fast delivery very satisfied customer", "positive"),
    ("wonderful experience exceeded my expectations perfect", "positive"),
    ("fantastic product brilliant quality best purchase ever made", "positive"),
    ("outstanding service very helpful and professional team", "positive"),
    ("superb quality worth every penny highly recommend this", "positive"),
    ("amazing product works perfectly exactly what I needed", "positive"),
    ("great value for money very happy with my purchase", "positive"),
    ("five stars excellent quality prompt delivery love it", "positive"),
    ("perfect product beautiful design works flawlessly recommended", "positive"),
    # Positive — informal / comment-style
    ("lol this is so funny cracked me up haha love it", "positive"),
    ("this video made my day absolute gold content bro", "positive"),
    ("omg this is hilarious dying of laughter amazing", "positive"),
    ("love this so much keep up the great work please", "positive"),
    ("this cracks me up every time so good so wholesome", "positive"),
    ("bro this is pure talent respect the effort well done", "positive"),
    ("literally cannot stop laughing this is the best video", "positive"),
    # Negative — formal
    ("terrible product complete waste of money very disappointed", "negative"),
    ("horrible experience worst purchase ever never buying again", "negative"),
    ("broken on arrival poor quality useless product", "negative"),
    ("awful service very rude staff never going back there", "negative"),
    ("defective product customer service completely unhelpful", "negative"),
    ("very poor quality broke after one day money wasted", "negative"),
    ("disgusting experience product not as described misleading", "negative"),
    ("worst company ever no response to complaints total scam", "negative"),
    ("cheap poor quality stopped working after week useless", "negative"),
    ("terrible customer support product failed immediately disappointed", "negative"),
    # Negative — informal / comment-style
    ("this is trash dont waste your time seriously boring 👎", "negative"),
    ("clickbait title nothing useful here total disappointment", "negative"),
    ("worst advice ever do not follow this completely wrong", "negative"),
    ("disliked and unsubscribed this content is terrible", "negative"),
    # Neutral — formal
    ("product is okay average quality nothing special", "neutral"),
    ("it works as expected standard product decent quality", "neutral"),
    ("product arrived on time as described average experience", "neutral"),
    ("normal product does what it says not impressed not disappointed", "neutral"),
    ("okay product some pros and cons pretty average overall", "neutral"),
    ("product is fine quality is acceptable not exceptional", "neutral"),
    ("standard delivery on time product matches description", "neutral"),
    ("average product not great not terrible just okay", "neutral"),
    ("meets expectations neither impressed nor disappointed", "neutral"),
    ("decent product reasonable price average quality overall", "neutral"),
    # Neutral — informal / comment-style (timestamps, reactions, wordplay, observations)
    ("timestamp 5 30 for the main part of the video", "neutral"),
    ("haha okay I see what you did there interesting", "neutral"),
    ("first time watching this channel looks decent so far", "neutral"),
    ("that was unexpected at 3 minutes did not see that coming", "neutral"),
    ("this guy is playing with ideas like always just observing", "neutral"),
    ("nice wordplay there clever pun nothing more nothing less", "neutral"),
    ("watching this while eating lunch pretty chill content", "neutral"),
]

# ---------------------------------------------------------------------------
# Emoji sentiment signals
# ---------------------------------------------------------------------------

# Strong positive / humorous emojis
_POSITIVE_EMOJIS = {
    '😂', '🤣', '😄', '😃', '😁', '😊', '😍', '🥰', '😎', '😆', '🤩', '😏',
    # All heart variants — fans use any colour as a love/support signal
    '❤', '♥', '💕', '💗', '💓', '💖', '💝', '🧡', '💛', '💚', '💙', '💜',
    '🤍', '🖤', '🤎', '💞', '💘', '💟', '❣',
    '👍', '🔥', '💯', '👏', '🎉', '🥳', '✨', '💪', '🙏', '💫', '⭐', '🌟',
    '🫶', '🤝', '👌', '🎊', '😹', '🥹', '🫀',
}

# Strong negative emojis
_NEGATIVE_EMOJIS = {
    '😡', '😢', '😭', '💔', '👎', '🤮', '😤', '🤬', '😠', '😞',
    '😔', '😟', '😕', '☹', '🙁', '😩', '😫', '🥺', '😖', '😣',
}


class BERTLogisticSentimentAnalyzer:
    """Singleton BERT + Logistic Regression ensemble sentiment analyzer."""

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

        self.device = device
        logger.info(f"Initializing BERT+LR sentiment analyzer on device: {device}")

        # DistilBERT multilingual for embeddings
        model_name = "distilbert-base-multilingual-cased"
        self.tokenizer = AutoTokenizer.from_pretrained(model_name)
        self.bert_model = AutoModel.from_pretrained(model_name)
        self.bert_model.eval()
        if device == "cuda":
            self.bert_model = self.bert_model.cuda()

        # Twitter-RoBERTa: trained on 124M tweets, 3-class (pos/neu/neg),
        # understands emojis, slang, and informal mixed-language text natively.
        self.sentiment_pipeline = pipeline(
            "sentiment-analysis",
            model="cardiffnlp/twitter-roberta-base-sentiment-latest",
            top_k=None,
            device=0 if device == "cuda" else -1,
        )

        # Logistic Regression head
        self.lr = LogisticRegression(max_iter=1000, C=1.0, random_state=42)
        self.label_encoder = LabelEncoder()
        self._train_lr()

        # Correction override state — populated by retrain_with_corrections()
        self._correction_cache: dict = {}   # exact text → correct label
        self._keyword_signals: dict = {}    # keyword → {label: count}

        # Online dataset state
        self._online_samples: list = []     # [(text, label), ...]
        self._online_sample_count: int = 0

        self._initialized = True
        logger.info("Sentiment analyzer initialized")

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _get_embedding(self, text: str) -> np.ndarray:
        inputs = self.tokenizer(
            text,
            return_tensors="pt",
            truncation=True,
            max_length=128,
            padding=True,
        )
        if self.device == "cuda":
            inputs = {k: v.cuda() for k, v in inputs.items()}

        with torch.no_grad():
            outputs = self.bert_model(**inputs)

        # Mean-pool over token dimension
        attention_mask = inputs["attention_mask"]
        token_embeddings = outputs.last_hidden_state
        input_mask_expanded = (
            attention_mask.unsqueeze(-1).expand(token_embeddings.size()).float()
        )
        embedding = torch.sum(token_embeddings * input_mask_expanded, 1) / torch.clamp(
            input_mask_expanded.sum(1), min=1e-9
        )
        return embedding.cpu().numpy()

    def _train_lr(self):
        logger.info("Training Logistic Regression classifier on seed data...")
        texts = [item[0] for item in SEED_DATA]
        labels = [item[1] for item in SEED_DATA]

        embeddings = [self._get_embedding(t) for t in texts]
        X = np.vstack(embeddings)
        y = self.label_encoder.fit_transform(labels)
        self.lr.fit(X, y)
        logger.info("LR classifier trained")

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    @staticmethod
    def _emoji_signal(text: str) -> dict:
        """Return raw probability adjustments based on emoji presence in text."""
        pos = sum(1 for ch in text if ch in _POSITIVE_EMOJIS)
        neg = sum(1 for ch in text if ch in _NEGATIVE_EMOJIS)
        if pos == 0 and neg == 0:
            return {}
        if pos > neg:
            strength = min(pos * 0.09, 0.28)
            return {"positive": strength, "neutral": strength * 0.4, "negative": -strength}
        if neg > pos:
            strength = min(neg * 0.09, 0.28)
            return {"negative": strength, "positive": -strength, "neutral": 0.0}
        return {"neutral": 0.06}  # mixed emojis — slight neutral push

    def analyze(self, text: str) -> dict:
        # ── 0. Exact-match correction override ──────────────────────────────
        # If an admin has corrected this exact text, return that label directly
        # without running inference so the fix is always honoured.
        if self._correction_cache:
            cached_label = self._correction_cache.get(text) or self._correction_cache.get(text.strip())
            if cached_label:
                probs = {"positive": 0.0, "negative": 0.0, "neutral": 0.0}
                probs[cached_label] = 1.0
                return {
                    "label": cached_label,
                    "confidence": 1.0,
                    "probabilities": probs,
                }

        # ── 1. Multilingual BERT embedding → LR probabilities ──────────────
        embedding = self._get_embedding(text[:512])
        lr_probs = self.lr.predict_proba(embedding)[0]
        lr_classes = self.label_encoder.classes_
        lr_dict = {cls: float(prob) for cls, prob in zip(lr_classes, lr_probs)}

        # ── 2. Twitter-RoBERTa 3-class pipeline ────────────────────────────
        # Returns all three scores (positive / neutral / negative) natively,
        # judging the whole sentence including emojis and tone.
        try:
            raw = self.sentiment_pipeline(text[:512])[0]   # list of {label, score}
            pipe_dict: dict[str, float] = {}
            for item in raw:
                # model labels are "Positive", "Neutral", "Negative"
                pipe_dict[item["label"].lower()] = float(item["score"])
            # safety: ensure all three keys exist
            for lbl in ("positive", "negative", "neutral"):
                pipe_dict.setdefault(lbl, 0.0)
        except Exception:
            pipe_dict = lr_dict

        # ── 3. Ensemble: 35 % multilingual LR + 65 % twitter-roberta ───────
        # Twitter-RoBERTa is dominant because it was trained on informal text
        # and already produces proper 3-class scores; LR adds multilingual
        # coverage for non-English text the roberta model may struggle with.
        all_labels = {"positive", "negative", "neutral"}
        final_probs = {
            label: 0.35 * lr_dict.get(label, 0.0) + 0.65 * pipe_dict.get(label, 0.0)
            for label in all_labels
        }

        # ── 4. Emoji signal ─────────────────────────────────────────────────
        emoji_adj = self._emoji_signal(text)
        if emoji_adj:
            for label, adj in emoji_adj.items():
                final_probs[label] = max(0.0, final_probs.get(label, 0.0) + adj)

        # ── 4b. Keyword signal from user corrections ─────────────────────────
        # User-tagged keywords boost their associated label, helping the model
        # generalise from corrections to similar texts without exact matching.
        if self._keyword_signals:
            text_lower = text.lower()
            for kw, label_counts in self._keyword_signals.items():
                if kw in text_lower:
                    dominant = max(label_counts, key=label_counts.get)
                    # Strength scales with how many corrections used this keyword
                    strength = min(label_counts[dominant] * 0.12, 0.30)
                    final_probs[dominant] = final_probs.get(dominant, 0.0) + strength
                    for other in set(final_probs) - {dominant}:
                        final_probs[other] = max(0.0, final_probs[other] - strength * 0.25)

        # ── 5. Normalise ────────────────────────────────────────────────────
        total = sum(final_probs.values()) or 1.0
        final_probs = {k: round(v / total, 4) for k, v in final_probs.items()}

        predicted_label = max(final_probs, key=final_probs.get)
        confidence = final_probs[predicted_label]

        # ── 6. Confidence floor: below 55 % → neutral ───────────────────────
        # When the model is uncertain, forcing positive/negative does more
        # harm than defaulting to neutral.
        if confidence < 0.55:
            predicted_label = "neutral"
            confidence = final_probs["neutral"]

        # ── 7. Margin guard on negative ─────────────────────────────────────
        # If negative and neutral are within 10 pp of each other the text
        # is too ambiguous to confidently call negative.
        elif predicted_label == "negative":
            if final_probs["negative"] - final_probs["neutral"] < 0.10:
                predicted_label = "neutral"
                confidence = final_probs["neutral"]

        return {
            "label": predicted_label,
            "confidence": round(confidence, 4),
            "probabilities": final_probs,
        }


    def apply_single_correction(self, text: str, correct_label: str, keywords: list = None) -> None:
        """Immediately override one text in the cache without retraining the LR."""
        self._correction_cache[text] = correct_label
        for kw in (keywords or []):
            kw_lower = kw.strip().lower()
            if not kw_lower:
                continue
            if kw_lower not in self._keyword_signals:
                self._keyword_signals[kw_lower] = {}
            self._keyword_signals[kw_lower][correct_label] = (
                self._keyword_signals[kw_lower].get(correct_label, 0) + 1
            )
        logger.info(f"Correction cache updated: '{text[:60]}' → {correct_label}")

    def retrain_with_corrections(self, corrections: list) -> None:
        """Retrain the LR head and rebuild correction caches.

        corrections: list of dicts with keys 'text', 'correct_label', 'keywords'.
        """
        # ── 1. Retrain LR ────────────────────────────────────────────────────
        all_data = SEED_DATA + [(c["text"], c["correct_label"]) for c in corrections]
        logger.info(
            f"Retraining LR with {len(all_data)} samples "
            f"(seed={len(SEED_DATA)}, corrections={len(corrections)})..."
        )
        texts = [item[0] for item in all_data]
        labels = [item[1] for item in all_data]
        embeddings = [self._get_embedding(t) for t in texts]
        X = np.vstack(embeddings)
        y = self.label_encoder.transform(labels)
        self.lr.fit(X, y)
        logger.info("LR classifier retrained successfully")

        # Keep a copy so online_retrain can include them
        self._last_corrections = corrections

        # ── 2. Rebuild exact-match cache ─────────────────────────────────────
        self._correction_cache = {c["text"]: c["correct_label"] for c in corrections}

        # ── 3. Rebuild keyword signal map ────────────────────────────────────
        keyword_signals: dict = {}
        for c in corrections:
            for kw in (c.get("keywords") or []):
                kw_lower = kw.strip().lower()
                if not kw_lower:
                    continue
                if kw_lower not in keyword_signals:
                    keyword_signals[kw_lower] = {}
                keyword_signals[kw_lower][c["correct_label"]] = (
                    keyword_signals[kw_lower].get(c["correct_label"], 0) + 1
                )
        self._keyword_signals = keyword_signals
        logger.info(
            f"Correction cache: {len(self._correction_cache)} entries, "
            f"keyword signals: {len(self._keyword_signals)} keywords"
        )


    def load_online_data(self, samples_per_class: int = 150) -> dict:
        """Fetch samples from HuggingFace public datasets and retrain the LR head.

        Uses cardiffnlp/tweet_eval (English Twitter) and
        tyqiangz/multilingual-sentiments (Hindi + Bengali + English).
        Returns a summary dict.
        """
        try:
            from datasets import load_dataset  # lazy import — only needed here
        except ImportError:
            raise RuntimeError("Install the 'datasets' package: pip install datasets")

        collected: list = []
        report: dict = {}

        # ── Dataset 1: Twitter sentiment (English informal) ──────────────────
        try:
            logger.info("Fetching cardiffnlp/tweet_eval ...")
            # labels: 0=negative, 1=neutral, 2=positive
            tweet_label_map = {0: "negative", 1: "neutral", 2: "positive"}
            ds = load_dataset("cardiffnlp/tweet_eval", "sentiment", split="train", trust_remote_code=True)
            per_label: dict = {v: [] for v in tweet_label_map.values()}
            for row in ds:
                lbl = tweet_label_map.get(row["label"])
                if lbl and len(per_label[lbl]) < samples_per_class:
                    text = row["text"].strip()
                    if text:
                        per_label[lbl].append((text, lbl))
                if all(len(v) >= samples_per_class for v in per_label.values()):
                    break
            for items in per_label.values():
                collected.extend(items)
            report["tweet_eval"] = sum(len(v) for v in per_label.values())
            logger.info(f"tweet_eval: {report['tweet_eval']} samples")
        except Exception as exc:
            logger.warning(f"tweet_eval fetch failed: {exc}")
            report["tweet_eval"] = 0

        # ── Dataset 2: Multilingual sentiments (Hindi, Bengali, English) ─────
        try:
            logger.info("Fetching tyqiangz/multilingual-sentiments ...")
            # labels: "positive", "neutral", "negative"
            multi_per_label: dict = {"positive": [], "negative": [], "neutral": []}
            for lang in ("english", "hindi", "bengali"):
                try:
                    ds2 = load_dataset(
                        "tyqiangz/multilingual-sentiments", lang,
                        split="train", trust_remote_code=True
                    )
                    for row in ds2:
                        lbl = str(row.get("label", "")).lower()
                        if lbl in multi_per_label and len(multi_per_label[lbl]) < samples_per_class:
                            text = str(row.get("text", "")).strip()
                            if text:
                                multi_per_label[lbl].append((text, lbl))
                except Exception as lang_exc:
                    logger.warning(f"multilingual-sentiments/{lang} failed: {lang_exc}")
            for items in multi_per_label.values():
                collected.extend(items)
            report["multilingual"] = sum(len(v) for v in multi_per_label.values())
            logger.info(f"multilingual-sentiments: {report['multilingual']} samples")
        except Exception as exc:
            logger.warning(f"multilingual-sentiments fetch failed: {exc}")
            report["multilingual"] = 0

        if not collected:
            raise RuntimeError("No samples could be fetched from any dataset.")

        # ── Retrain LR with seed + online + user corrections ─────────────────
        self._online_samples = collected
        self._online_sample_count = len(collected)

        all_data = SEED_DATA + self._online_samples + [
            (c["text"], c["correct_label"])
            for c in getattr(self, "_last_corrections", [])
        ]
        logger.info(f"Retraining LR on {len(all_data)} samples total ...")
        texts = [d[0] for d in all_data]
        labels = [d[1] for d in all_data]
        embeddings = [self._get_embedding(t) for t in texts]
        X = np.vstack(embeddings)
        y = self.label_encoder.transform(labels)
        self.lr.fit(X, y)
        logger.info("Online retrain complete")

        report["total_online"] = self._online_sample_count
        report["total_training"] = len(all_data)
        return report


def get_sentiment_analyzer() -> BERTLogisticSentimentAnalyzer:
    return BERTLogisticSentimentAnalyzer()
