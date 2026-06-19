from fpdf import FPDF
from datetime import datetime

# ── colour palette ────────────────────────────────────────────────────────────
_INDIGO   = (99,  102, 241)
_GREEN    = (16,  185, 129)
_RED      = (239, 68,  68)
_AMBER    = (245, 158, 11)
_VIOLET   = (139, 92,  246)
_GRAY     = (107, 114, 128)
_LIGHT    = (243, 244, 246)
_DARK     = (31,  41,  55)
_WHITE    = (255, 255, 255)
_BORDER   = (209, 213, 219)

SENTIMENT_COLOR = {"positive": _GREEN, "negative": _RED, "neutral": _GRAY}
PLATFORM_COLOR  = {"youtube": _RED, "myntra": _INDIGO}


class _PDF(FPDF):
    def set_color(self, rgb, target="fill"):
        r, g, b = rgb
        if target == "fill":
            self.set_fill_color(r, g, b)
        elif target == "text":
            self.set_text_color(r, g, b)
        elif target == "draw":
            self.set_draw_color(r, g, b)

    def h_bar(self, x, y, total_w, pct, color, h=4):
        """Draw a background track then a filled progress bar."""
        self.set_color((229, 231, 235), "fill")
        self.rect(x, y, total_w, h, "F")
        filled = total_w * pct / 100
        if filled > 0:
            self.set_color(color, "fill")
            self.rect(x, y, filled, h, "F")

    def colored_rect(self, x, y, w, h, rgb, radius=2):
        self.set_color(rgb, "fill")
        self.rect(x, y, w, h, "F")

    def card(self, x, y, w, h, bg=_LIGHT, border=_BORDER):
        self.set_color(bg, "fill")
        self.set_color(border, "draw")
        self.set_line_width(0.2)
        self.rect(x, y, w, h, "FD")


def _safe(text: str, limit: int = 200) -> str:
    text = (text or "")
    text = text.replace("\u2018", "'").replace("\u2019", "'")
    text = text.replace("\u201c", '"').replace("\u201d", '"')
    text = text.replace("\u2026", "...").replace("\u2013", "-").replace("\u2014", "--")
    text = text.encode("latin-1", errors="replace").decode("latin-1")
    return text[:limit] + ("..." if len(text) > limit else "")

def generate_url_analysis_pdf(data: dict) -> bytes:
    post      = data.get("post", {})
    items     = data.get("items", [])
    aggregate = data.get("aggregate", {})
    total     = data.get("total", len(items))
    proc_time = data.get("processing_time", 0)

    platform = post.get("platform", "unknown")
    title    = _safe(post.get("title", "Untitled"), 120)
    author   = _safe(post.get("author", "Unknown"), 60)
    url      = _safe(post.get("url", ""), 90)
    fetched  = post.get("fetched_comments", total)
    total_av = post.get("total_available", total)

    dom_sentiment  = aggregate.get("dominant_sentiment", "neutral")
    dom_emotion    = aggregate.get("dominant_emotion", "—")
    avg_conf       = aggregate.get("average_confidence", 0)
    sent_dist      = aggregate.get("sentiment_distribution", {})
    emo_dist       = aggregate.get("emotion_distribution", {})

    pdf = _PDF(orientation="P", unit="mm", format="A4")
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()
    pdf.set_margins(15, 15, 15)
    CW = 180  # content width

    # ── header bar ────────────────────────────────────────────────────────────
    plat_color = PLATFORM_COLOR.get(platform, _INDIGO)
    pdf.colored_rect(0, 0, 210, 28, plat_color)

    pdf.set_xy(15, 6)
    pdf.set_color(_WHITE, "text")
    pdf.set_font("Helvetica", "B", 16)
    pdf.cell(130, 8, "Sentiment Analysis Report", ln=0)

    pdf.set_font("Helvetica", "", 8)
    pdf.set_xy(15, 15)
    pdf.cell(130, 5, f"Generated on {datetime.now().strftime('%B %d, %Y  %H:%M')}", ln=0)

    # platform badge (top-right)
    pdf.set_xy(155, 9)
    pdf.set_color(_WHITE, "fill")
    pdf.set_color(plat_color, "draw")
    pdf.set_line_width(0.3)
    pdf.rect(155, 9, 40, 10, "FD")
    pdf.set_color(plat_color, "text")
    pdf.set_font("Helvetica", "B", 9)
    pdf.set_xy(155, 12)
    pdf.cell(40, 5, platform.upper(), align="C")

    pdf.ln(18)

    # ── post info card ────────────────────────────────────────────────────────
    y0 = pdf.get_y()
    card_h = 32
    pdf.card(15, y0, CW, card_h)

    pdf.set_xy(18, y0 + 4)
    pdf.set_color(_DARK, "text")
    pdf.set_font("Helvetica", "B", 9)
    pdf.cell(20, 5, "Title:", ln=0)
    pdf.set_font("Helvetica", "", 9)
    pdf.cell(CW - 22, 5, title, ln=1)

    pdf.set_xy(18, y0 + 11)
    pdf.set_font("Helvetica", "B", 9)
    pdf.cell(20, 5, "Author:", ln=0)
    pdf.set_font("Helvetica", "", 9)
    pdf.cell(CW - 22, 5, f"@{author}", ln=1)

    pdf.set_xy(18, y0 + 18)
    pdf.set_font("Helvetica", "B", 9)
    pdf.cell(20, 5, "URL:", ln=0)
    pdf.set_color(_INDIGO, "text")
    pdf.set_font("Helvetica", "", 8)
    pdf.cell(CW - 22, 5, url, ln=1)

    pdf.set_color(_DARK, "text")
    pdf.set_xy(18, y0 + 25)
    pdf.set_font("Helvetica", "", 8)
    pdf.set_color(_GRAY, "text")
    pdf.cell(CW - 6, 5,
             f"{fetched} comments analysed  ·  {total_av:,} total available  ·  {proc_time}s processing time")

    pdf.set_y(y0 + card_h + 6)

    # ── key metrics ───────────────────────────────────────────────────────────
    pdf.set_color(_DARK, "text")
    pdf.set_font("Helvetica", "B", 9)
    pdf.cell(CW, 5, "Key Metrics", ln=1)
    pdf.ln(2)

    metrics = [
        ("Total Analysed", str(total),                                       _INDIGO),
        ("Dominant Sentiment", dom_sentiment.capitalize(),                    SENTIMENT_COLOR.get(dom_sentiment, _GRAY)),
        ("Dominant Emotion",   dom_emotion.capitalize(),                      _VIOLET),
        ("Avg Confidence",     f"{round(avg_conf * 100)}%",                  _AMBER),
    ]
    box_w = CW / 4
    y_m = pdf.get_y()
    for i, (label, value, color) in enumerate(metrics):
        x = 15 + i * box_w
        pdf.card(x, y_m, box_w - 2, 18, bg=_LIGHT)
        r, g, b = color
        pdf.colored_rect(x, y_m, box_w - 2, 3, color)
        pdf.set_color(_DARK, "text")
        pdf.set_font("Helvetica", "", 7)
        pdf.set_xy(x + 2, y_m + 5)
        pdf.cell(box_w - 6, 4, label, ln=1)
        pdf.set_color(color, "text")
        pdf.set_font("Helvetica", "B", 11)
        pdf.set_xy(x + 2, y_m + 9)
        pdf.cell(box_w - 6, 6, value, ln=1)

    pdf.set_y(y_m + 24)

    # ── sentiment distribution ────────────────────────────────────────────────
    pdf.set_color(_DARK, "text")
    pdf.set_font("Helvetica", "B", 9)
    pdf.cell(CW, 5, "Sentiment Distribution", ln=1)
    pdf.ln(2)

    for sentiment in ["positive", "negative", "neutral"]:
        count = sent_dist.get(sentiment, 0)
        pct   = round(count / total * 100) if total else 0
        color = SENTIMENT_COLOR[sentiment]
        y_row = pdf.get_y()

        pdf.set_color(color, "text")
        pdf.set_font("Helvetica", "B", 8)
        pdf.set_xy(15, y_row)
        pdf.cell(28, 5, sentiment.capitalize(), ln=0)

        pdf.h_bar(45, y_row + 1, 110, pct, color, h=4)

        pdf.set_color(_DARK, "text")
        pdf.set_font("Helvetica", "", 8)
        pdf.set_xy(158, y_row)
        pdf.cell(37, 5, f"{count}  ({pct}%)", ln=1)
        pdf.ln(2)

    pdf.ln(4)

    # ── emotion distribution ──────────────────────────────────────────────────
    pdf.set_color(_DARK, "text")
    pdf.set_font("Helvetica", "B", 9)
    pdf.cell(CW, 5, "Top Emotions", ln=1)
    pdf.ln(2)

    top_emotions = sorted(emo_dist.items(), key=lambda x: x[1], reverse=True)[:6]
    for emotion, count in top_emotions:
        pct   = round(count / total * 100) if total else 0
        y_row = pdf.get_y()

        pdf.set_color(_VIOLET, "text")
        pdf.set_font("Helvetica", "B", 8)
        pdf.set_xy(15, y_row)
        pdf.cell(28, 5, emotion.capitalize(), ln=0)

        pdf.h_bar(45, y_row + 1, 110, pct, _VIOLET, h=4)

        pdf.set_color(_DARK, "text")
        pdf.set_font("Helvetica", "", 8)
        pdf.set_xy(158, y_row)
        pdf.cell(37, 5, f"{count}  ({pct}%)", ln=1)
        pdf.ln(2)

    pdf.ln(4)

    # ── highlighted comments ──────────────────────────────────────────────────
    positives = [i for i in items if i.get("sentiment", {}).get("label") == "positive"]
    negatives = [i for i in items if i.get("sentiment", {}).get("label") == "negative"]
    top_pos   = max(positives, key=lambda x: x["sentiment"]["confidence"], default=None)
    top_neg   = max(negatives, key=lambda x: x["sentiment"]["confidence"], default=None)

    if top_pos or top_neg:
        pdf.set_color(_DARK, "text")
        pdf.set_font("Helvetica", "B", 9)
        pdf.cell(CW, 5, "Highlighted Comments", ln=1)
        pdf.ln(2)

        hl_w = (CW - 4) / 2
        y_hl = pdf.get_y()

        if top_pos:
            pdf.card(15, y_hl, hl_w, 22, bg=(236, 253, 245))
            pdf.set_color(_GREEN, "fill")
            pdf.rect(15, y_hl, hl_w, 3, "F")
            pdf.set_color(_GREEN, "text")
            pdf.set_font("Helvetica", "B", 7)
            pdf.set_xy(17, y_hl + 5)
            pdf.cell(hl_w - 4, 4, "MOST POSITIVE", ln=1)
            pdf.set_color(_DARK, "text")
            pdf.set_font("Helvetica", "", 7.5)
            pdf.set_xy(17, y_hl + 10)
            pdf.multi_cell(hl_w - 4, 3.5, _safe(top_pos.get("original_text", ""), 160))

        if top_neg:
            x_neg = 15 + hl_w + 4
            pdf.card(x_neg, y_hl, hl_w, 22, bg=(254, 242, 242))
            pdf.set_color(_RED, "fill")
            pdf.rect(x_neg, y_hl, hl_w, 3, "F")
            pdf.set_color(_RED, "text")
            pdf.set_font("Helvetica", "B", 7)
            pdf.set_xy(x_neg + 2, y_hl + 5)
            pdf.cell(hl_w - 4, 4, "MOST NEGATIVE", ln=1)
            pdf.set_color(_DARK, "text")
            pdf.set_font("Helvetica", "", 7.5)
            pdf.set_xy(x_neg + 2, y_hl + 10)
            pdf.multi_cell(hl_w - 4, 3.5, _safe(top_neg.get("original_text", ""), 160))

        pdf.set_y(y_hl + 28)

    # ── comments table ────────────────────────────────────────────────────────
    pdf.add_page()

    pdf.set_color(_DARK, "text")
    pdf.set_font("Helvetica", "B", 9)
    pdf.cell(CW, 6, "All Comments", ln=1)
    pdf.ln(1)

    # table header
    cols = [("#", 8), ("Comment", 92), ("Sentiment", 26), ("Emotion", 26), ("Conf%", 18), ("Lang", 14)]
    pdf.colored_rect(15, pdf.get_y(), CW, 6, _INDIGO)
    pdf.set_color(_WHITE, "text")
    pdf.set_font("Helvetica", "B", 7)
    x_cur = 15
    for label, w in cols:
        pdf.set_xy(x_cur + 1, pdf.get_y())
        pdf.cell(w - 1, 6, label, ln=0)
        x_cur += w
    pdf.ln(6)

    for idx, item in enumerate(items):
        sent  = item.get("sentiment", {})
        emo   = item.get("emotion", {})
        lang  = item.get("detected_language", "—")
        text  = _safe(item.get("original_text", ""), 100)
        label = sent.get("label", "neutral")
        conf  = f"{round(sent.get('confidence', 0) * 100)}%"
        color = SENTIMENT_COLOR.get(label, _GRAY)

        row_bg = _WHITE if idx % 2 == 0 else (249, 250, 251)
        pdf.colored_rect(15, pdf.get_y(), CW, 6, row_bg)

        pdf.set_color(_GRAY, "text")
        pdf.set_font("Helvetica", "", 6.5)
        row_vals = [str(idx + 1), text, label.capitalize(), emo.get("label", "—").capitalize(), conf, lang]
        x_cur = 15
        for (_, w), val in zip(cols, row_vals):
            if val in ("Positive", "positive"):
                pdf.set_color(_GREEN, "text")
            elif val in ("Negative", "negative"):
                pdf.set_color(_RED, "text")
            else:
                pdf.set_color(_DARK, "text")
            pdf.set_xy(x_cur + 1, pdf.get_y())
            pdf.cell(w - 1, 6, val, ln=0)
            x_cur += w
        pdf.ln(6)

        pdf.set_color(_BORDER, "draw")
        pdf.set_line_width(0.1)
        pdf.line(15, pdf.get_y(), 195, pdf.get_y())

    # ── footer on all pages ───────────────────────────────────────────────────
    for page_num in range(1, pdf.page + 1):
        pdf.page = page_num
        pdf.set_y(-12)
        pdf.set_color(_GRAY, "text")
        pdf.set_font("Helvetica", "", 7)
        pdf.cell(0, 5, f"Sentiment Intelligence Platform  ·  Page {page_num}", align="C")

    return bytes(pdf.output())


def generate_single_analysis_pdf(data: dict) -> bytes:
    CW = 180
    sent     = data.get("sentiment", {})
    emo      = data.get("emotion", {})
    tone     = data.get("tone", {})
    intent   = data.get("intent", {})
    sarcasm  = data.get("sarcasm", {})
    label    = sent.get("label", "neutral")
    lang     = data.get("detected_language", "Unknown")

    pdf = _PDF(orientation="P", unit="mm", format="A4")
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()
    pdf.set_margins(15, 15, 15)

    # ── header bar ────────────────────────────────────────────────────────────
    pdf.colored_rect(0, 0, 210, 28, _INDIGO)
    pdf.set_xy(15, 6)
    pdf.set_color(_WHITE, "text")
    pdf.set_font("Helvetica", "B", 16)
    pdf.cell(130, 8, "Single Analysis Report", ln=0)
    pdf.set_font("Helvetica", "", 8)
    pdf.set_xy(15, 15)
    pdf.cell(130, 5, f"Generated on {datetime.now().strftime('%B %d, %Y  %H:%M')}", ln=0)

    sent_color = SENTIMENT_COLOR.get(label, _GRAY)
    pdf.set_xy(155, 9)
    pdf.set_color(_WHITE, "fill")
    pdf.set_color(sent_color, "draw")
    pdf.set_line_width(0.3)
    pdf.rect(155, 9, 40, 10, "FD")
    pdf.set_color(sent_color, "text")
    pdf.set_font("Helvetica", "B", 9)
    pdf.set_xy(155, 12)
    pdf.cell(40, 5, label.upper(), align="C")

    pdf.ln(18)

    # ── original text ─────────────────────────────────────────────────────────
    y0 = pdf.get_y()
    pdf.card(15, y0, CW, 28, bg=_LIGHT)
    pdf.set_color(_INDIGO, "fill")
    pdf.rect(15, y0, 3, 28, "F")
    pdf.set_color(_DARK, "text")
    pdf.set_font("Helvetica", "B", 8)
    pdf.set_xy(21, y0 + 4)
    pdf.cell(CW - 8, 5, "Original Text", ln=1)
    pdf.set_font("Helvetica", "", 8.5)
    pdf.set_xy(21, y0 + 10)
    pdf.multi_cell(CW - 10, 4.5, _safe(data.get("original_text", ""), 300))
    pdf.set_y(y0 + 34)

    # ── translation ───────────────────────────────────────────────────────────
    if data.get("is_translation") and data.get("translated_text"):
        y1 = pdf.get_y()
        pdf.card(15, y1, CW, 20, bg=(239, 246, 255))
        pdf.set_color(_INDIGO, "fill")
        pdf.rect(15, y1, 3, 20, "F")
        pdf.set_color(_INDIGO, "text")
        pdf.set_font("Helvetica", "B", 8)
        pdf.set_xy(21, y1 + 4)
        pdf.cell(CW - 8, 5, f"English Translation  (detected: {lang})", ln=1)
        pdf.set_color(_DARK, "text")
        pdf.set_font("Helvetica", "", 8.5)
        pdf.set_xy(21, y1 + 10)
        pdf.multi_cell(CW - 10, 4.5, _safe(data.get("translated_text", ""), 260))
        pdf.set_y(y1 + 26)

    pdf.ln(4)

    # ── key metrics ───────────────────────────────────────────────────────────
    pdf.set_color(_DARK, "text")
    pdf.set_font("Helvetica", "B", 9)
    pdf.cell(CW, 5, "Analysis Results", ln=1)
    pdf.ln(2)

    metrics = [
        ("Sentiment",   label.capitalize(),                              SENTIMENT_COLOR.get(label, _GRAY)),
        ("Confidence",  f"{round(sent.get('confidence', 0) * 100)}%",   _INDIGO),
        ("Emotion",     emo.get("label", "—").capitalize(),              _VIOLET),
        ("Tone",        tone.get("label", "—").capitalize(),             _AMBER),
        ("Intent",      intent.get("label", "—").capitalize(),           (6, 182, 212)),
        ("Language",    lang,                                            _GREEN),
    ]
    box_w = CW / 3
    y_m = pdf.get_y()
    for i, (lbl, val, color) in enumerate(metrics):
        col = i % 3
        row = i // 3
        x = 15 + col * box_w
        y = y_m + row * 22
        pdf.card(x, y, box_w - 2, 18, bg=_LIGHT)
        pdf.colored_rect(x, y, box_w - 2, 3, color)
        pdf.set_color(_GRAY, "text")
        pdf.set_font("Helvetica", "", 7)
        pdf.set_xy(x + 2, y + 5)
        pdf.cell(box_w - 6, 4, lbl, ln=1)
        pdf.set_color(color, "text")
        pdf.set_font("Helvetica", "B", 10)
        pdf.set_xy(x + 2, y + 10)
        pdf.cell(box_w - 6, 5, val, ln=1)

    pdf.set_y(y_m + (len(metrics) // 3) * 22 + 8)

    # ── sarcasm ───────────────────────────────────────────────────────────────
    if sarcasm.get("detected"):
        pdf.set_color(_AMBER, "text")
        pdf.set_font("Helvetica", "B", 8)
        conf_pct = round(sarcasm.get("confidence", 0) * 100)
        pdf.cell(CW, 5, f"Sarcasm detected  ({conf_pct}% confidence)", ln=1)
        pdf.ln(3)

    # ── sentiment probabilities ───────────────────────────────────────────────
    probs = sent.get("probabilities", {})
    if probs:
        pdf.set_color(_DARK, "text")
        pdf.set_font("Helvetica", "B", 9)
        pdf.cell(CW, 5, "Sentiment Probabilities", ln=1)
        pdf.ln(2)
        for s in ["positive", "negative", "neutral"]:
            p = probs.get(s, 0)
            pct = round(p * 100)
            y_row = pdf.get_y()
            pdf.set_color(SENTIMENT_COLOR[s], "text")
            pdf.set_font("Helvetica", "B", 8)
            pdf.set_xy(15, y_row)
            pdf.cell(28, 5, s.capitalize(), ln=0)
            pdf.h_bar(45, y_row + 1, 110, pct, SENTIMENT_COLOR[s], h=4)
            pdf.set_color(_DARK, "text")
            pdf.set_font("Helvetica", "", 8)
            pdf.set_xy(158, y_row)
            pdf.cell(37, 5, f"{pct}%", ln=1)
            pdf.ln(2)
        pdf.ln(4)

    # ── interpretation ────────────────────────────────────────────────────────
    interpretation = data.get("interpretation", "")
    if interpretation:
        y2 = pdf.get_y()
        pdf.card(15, y2, CW, 22, bg=(238, 242, 255))
        pdf.set_color(_INDIGO, "fill")
        pdf.rect(15, y2, 3, 22, "F")
        pdf.set_color(_DARK, "text")
        pdf.set_font("Helvetica", "B", 8)
        pdf.set_xy(21, y2 + 4)
        pdf.cell(CW - 8, 5, "Interpretation", ln=1)
        pdf.set_font("Helvetica", "", 8)
        pdf.set_xy(21, y2 + 10)
        pdf.multi_cell(CW - 10, 4, _safe(interpretation, 280))
        pdf.set_y(y2 + 28)

    # ── suggested response ────────────────────────────────────────────────────
    suggested = data.get("suggested_response", "")
    if suggested:
        y3 = pdf.get_y()
        pdf.card(15, y3, CW, 22, bg=(236, 254, 255))
        pdf.set_color((6, 182, 212), "fill")
        pdf.rect(15, y3, 3, 22, "F")
        pdf.set_color((6, 182, 212), "text")
        pdf.set_font("Helvetica", "B", 8)
        pdf.set_xy(21, y3 + 4)
        pdf.cell(CW - 8, 5, "Suggested Response", ln=1)
        pdf.set_color(_DARK, "text")
        pdf.set_font("Helvetica", "I", 8)
        pdf.set_xy(21, y3 + 10)
        pdf.multi_cell(CW - 10, 4, f'"{_safe(suggested, 280)}"')
        pdf.set_y(y3 + 28)

    # ── stats ─────────────────────────────────────────────────────────────────
    pdf.ln(4)
    pdf.set_color(_GRAY, "text")
    pdf.set_font("Helvetica", "", 7.5)
    pdf.cell(CW, 5,
             f"Words: {data.get('word_count', '—')}  ·  "
             f"Characters: {data.get('char_count', '—')}  ·  "
             f"Processing time: {data.get('processing_time', '—')}s", ln=1)

    # ── footer ────────────────────────────────────────────────────────────────
    pdf.set_y(-12)
    pdf.set_color(_GRAY, "text")
    pdf.set_font("Helvetica", "", 7)
    pdf.cell(0, 5, "Sentiment Intelligence Platform", align="C")

    return bytes(pdf.output())


def generate_bulk_analysis_pdf(data: dict) -> bytes:
    items     = data.get("items", [])
    aggregate = data.get("aggregate", {})
    total     = data.get("total", len(items))
    proc_time = data.get("processing_time", 0)

    dom_sentiment = aggregate.get("dominant_sentiment", "neutral")
    dom_emotion   = aggregate.get("dominant_emotion", "—")
    avg_conf      = aggregate.get("average_confidence", 0)
    sent_dist     = aggregate.get("sentiment_distribution", {})
    emo_dist      = aggregate.get("emotion_distribution", {})

    CW = 180
    pdf = _PDF(orientation="P", unit="mm", format="A4")
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()
    pdf.set_margins(15, 15, 15)

    # ── header bar ────────────────────────────────────────────────────────────
    pdf.colored_rect(0, 0, 210, 28, _INDIGO)
    pdf.set_xy(15, 6)
    pdf.set_color(_WHITE, "text")
    pdf.set_font("Helvetica", "B", 16)
    pdf.cell(130, 8, "Bulk Analysis Report", ln=0)
    pdf.set_font("Helvetica", "", 8)
    pdf.set_xy(15, 15)
    pdf.cell(130, 5, f"Generated on {datetime.now().strftime('%B %d, %Y  %H:%M')}  ·  {total} texts analysed", ln=0)

    pdf.set_xy(155, 9)
    pdf.set_color(_WHITE, "fill")
    pdf.set_color(_INDIGO, "draw")
    pdf.set_line_width(0.3)
    pdf.rect(155, 9, 40, 10, "FD")
    pdf.set_color(_WHITE, "text")
    pdf.set_font("Helvetica", "B", 9)
    pdf.set_xy(155, 12)
    pdf.cell(40, 5, f"{total} TEXTS", align="C")

    pdf.ln(18)

    # ── key metrics ───────────────────────────────────────────────────────────
    pdf.set_color(_DARK, "text")
    pdf.set_font("Helvetica", "B", 9)
    pdf.cell(CW, 5, "Key Metrics", ln=1)
    pdf.ln(2)

    metrics = [
        ("Total Analysed",      str(total),                                     _INDIGO),
        ("Dominant Sentiment",  dom_sentiment.capitalize(),                      SENTIMENT_COLOR.get(dom_sentiment, _GRAY)),
        ("Dominant Emotion",    dom_emotion.capitalize(),                        _VIOLET),
        ("Avg Confidence",      f"{round(avg_conf * 100)}%",                    _AMBER),
    ]
    box_w = CW / 4
    y_m = pdf.get_y()
    for i, (lbl, val, color) in enumerate(metrics):
        x = 15 + i * box_w
        pdf.card(x, y_m, box_w - 2, 18, bg=_LIGHT)
        pdf.colored_rect(x, y_m, box_w - 2, 3, color)
        pdf.set_color(_GRAY, "text")
        pdf.set_font("Helvetica", "", 7)
        pdf.set_xy(x + 2, y_m + 5)
        pdf.cell(box_w - 6, 4, lbl, ln=1)
        pdf.set_color(color, "text")
        pdf.set_font("Helvetica", "B", 11)
        pdf.set_xy(x + 2, y_m + 10)
        pdf.cell(box_w - 6, 5, val, ln=1)

    pdf.set_y(y_m + 24)

    # ── sentiment distribution ────────────────────────────────────────────────
    pdf.set_color(_DARK, "text")
    pdf.set_font("Helvetica", "B", 9)
    pdf.cell(CW, 5, "Sentiment Distribution", ln=1)
    pdf.ln(2)

    for sentiment in ["positive", "negative", "neutral"]:
        count = sent_dist.get(sentiment, 0)
        pct   = round(count / total * 100) if total else 0
        color = SENTIMENT_COLOR[sentiment]
        y_row = pdf.get_y()
        pdf.set_color(color, "text")
        pdf.set_font("Helvetica", "B", 8)
        pdf.set_xy(15, y_row)
        pdf.cell(28, 5, sentiment.capitalize(), ln=0)
        pdf.h_bar(45, y_row + 1, 110, pct, color, h=4)
        pdf.set_color(_DARK, "text")
        pdf.set_font("Helvetica", "", 8)
        pdf.set_xy(158, y_row)
        pdf.cell(37, 5, f"{count}  ({pct}%)", ln=1)
        pdf.ln(2)

    pdf.ln(4)

    # ── emotion distribution ──────────────────────────────────────────────────
    pdf.set_color(_DARK, "text")
    pdf.set_font("Helvetica", "B", 9)
    pdf.cell(CW, 5, "Top Emotions", ln=1)
    pdf.ln(2)

    for emotion, count in sorted(emo_dist.items(), key=lambda x: x[1], reverse=True)[:6]:
        pct   = round(count / total * 100) if total else 0
        y_row = pdf.get_y()
        pdf.set_color(_VIOLET, "text")
        pdf.set_font("Helvetica", "B", 8)
        pdf.set_xy(15, y_row)
        pdf.cell(28, 5, emotion.capitalize(), ln=0)
        pdf.h_bar(45, y_row + 1, 110, pct, _VIOLET, h=4)
        pdf.set_color(_DARK, "text")
        pdf.set_font("Helvetica", "", 8)
        pdf.set_xy(158, y_row)
        pdf.cell(37, 5, f"{count}  ({pct}%)", ln=1)
        pdf.ln(2)

    pdf.ln(4)

    # ── highlighted items ─────────────────────────────────────────────────────
    positives = [i for i in items if i.get("sentiment", {}).get("label") == "positive"]
    negatives = [i for i in items if i.get("sentiment", {}).get("label") == "negative"]
    top_pos   = max(positives, key=lambda x: x["sentiment"]["confidence"], default=None)
    top_neg   = max(negatives, key=lambda x: x["sentiment"]["confidence"], default=None)

    if top_pos or top_neg:
        pdf.set_color(_DARK, "text")
        pdf.set_font("Helvetica", "B", 9)
        pdf.cell(CW, 5, "Highlighted Entries", ln=1)
        pdf.ln(2)

        hl_w  = (CW - 4) / 2
        y_hl  = pdf.get_y()

        if top_pos:
            pdf.card(15, y_hl, hl_w, 22, bg=(236, 253, 245))
            pdf.colored_rect(15, y_hl, hl_w, 3, _GREEN)
            pdf.set_color(_GREEN, "text")
            pdf.set_font("Helvetica", "B", 7)
            pdf.set_xy(17, y_hl + 5)
            pdf.cell(hl_w - 4, 4, "MOST POSITIVE", ln=1)
            pdf.set_color(_DARK, "text")
            pdf.set_font("Helvetica", "", 7.5)
            pdf.set_xy(17, y_hl + 10)
            pdf.multi_cell(hl_w - 4, 3.5, _safe(top_pos.get("original_text", ""), 160))

        if top_neg:
            x_neg = 15 + hl_w + 4
            pdf.card(x_neg, y_hl, hl_w, 22, bg=(254, 242, 242))
            pdf.colored_rect(x_neg, y_hl, hl_w, 3, _RED)
            pdf.set_color(_RED, "text")
            pdf.set_font("Helvetica", "B", 7)
            pdf.set_xy(x_neg + 2, y_hl + 5)
            pdf.cell(hl_w - 4, 4, "MOST NEGATIVE", ln=1)
            pdf.set_color(_DARK, "text")
            pdf.set_font("Helvetica", "", 7.5)
            pdf.set_xy(x_neg + 2, y_hl + 10)
            pdf.multi_cell(hl_w - 4, 3.5, _safe(top_neg.get("original_text", ""), 160))

        pdf.set_y(y_hl + 28)

    # ── items table ───────────────────────────────────────────────────────────
    pdf.add_page()
    pdf.set_color(_DARK, "text")
    pdf.set_font("Helvetica", "B", 9)
    pdf.cell(CW, 6, "All Entries", ln=1)
    pdf.ln(1)

    cols = [("#", 8), ("Text", 92), ("Sentiment", 26), ("Emotion", 26), ("Conf%", 18), ("Lang", 14)]
    pdf.colored_rect(15, pdf.get_y(), CW, 6, _INDIGO)
    pdf.set_color(_WHITE, "text")
    pdf.set_font("Helvetica", "B", 7)
    x_cur = 15
    for lbl, w in cols:
        pdf.set_xy(x_cur + 1, pdf.get_y())
        pdf.cell(w - 1, 6, lbl, ln=0)
        x_cur += w
    pdf.ln(6)

    for idx, item in enumerate(items):
        sent  = item.get("sentiment", {})
        emo   = item.get("emotion", {})
        lang  = item.get("detected_language", "—")
        text  = _safe(item.get("original_text", ""), 100)
        lbl   = sent.get("label", "neutral")
        conf  = f"{round(sent.get('confidence', 0) * 100)}%"

        row_bg = _WHITE if idx % 2 == 0 else (249, 250, 251)
        pdf.colored_rect(15, pdf.get_y(), CW, 6, row_bg)
        pdf.set_font("Helvetica", "", 6.5)
        row_vals = [str(idx + 1), text, lbl.capitalize(), emo.get("label", "—").capitalize(), conf, lang]
        x_cur = 15
        for (_, w), val in zip(cols, row_vals):
            if val in ("Positive", "positive"):
                pdf.set_color(_GREEN, "text")
            elif val in ("Negative", "negative"):
                pdf.set_color(_RED, "text")
            else:
                pdf.set_color(_DARK, "text")
            pdf.set_xy(x_cur + 1, pdf.get_y())
            pdf.cell(w - 1, 6, val, ln=0)
            x_cur += w
        pdf.ln(6)
        pdf.set_color(_BORDER, "draw")
        pdf.set_line_width(0.1)
        pdf.line(15, pdf.get_y(), 195, pdf.get_y())

    # ── footer ────────────────────────────────────────────────────────────────
    for page_num in range(1, pdf.page + 1):
        pdf.page = page_num
        pdf.set_y(-12)
        pdf.set_color(_GRAY, "text")
        pdf.set_font("Helvetica", "", 7)
        pdf.cell(0, 5, f"Sentiment Intelligence Platform  ·  Page {page_num}", align="C")

    return bytes(pdf.output())
