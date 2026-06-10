import random

RESPONSE_TEMPLATES: dict[tuple, list[str]] = {
    ("positive", "complaint", "appreciative"): [
        (
            "Thank you so much for your wonderful feedback! We're thrilled to hear about "
            "your positive experience. Your kind words motivate our entire team to continue "
            "delivering excellence. We look forward to serving you again!"
        ),
        (
            "We sincerely appreciate you taking the time to share your experience. It's "
            "fantastic to hear that everything met your expectations. Your satisfaction is "
            "our top priority, and we're committed to maintaining this standard."
        ),
    ],
    ("positive", "appreciation", "appreciative"): [
        (
            "Thank you for your heartfelt appreciation! We're absolutely delighted to have "
            "provided you with an excellent experience. Your positive feedback is incredibly "
            "motivating for our team. We look forward to welcoming you back!"
        ),
        (
            "What a wonderful message to receive! Thank you for sharing your experience. "
            "We're so pleased that we could make a difference, and we're committed to "
            "continuing to provide this level of service."
        ),
    ],
    ("negative", "complaint", "aggressive"): [
        (
            "We sincerely apologize for the experience you described. This does not reflect "
            "our standards, and we take your concerns very seriously. Our team will "
            "investigate this matter immediately. Please contact our customer service team "
            "so we can resolve this personally."
        ),
        (
            "We're deeply sorry to hear about your negative experience. Your feedback is "
            "invaluable in helping us improve. We'd like to make this right — please reach "
            "out to our support team with your order details so we can address this urgently."
        ),
    ],
    ("negative", "complaint", "critical"): [
        (
            "Thank you for bringing this to our attention. We're sorry that your experience "
            "didn't meet your expectations. We're actively working to address the issues "
            "you've highlighted. A member of our team will reach out to you within 24 hours "
            "to resolve this."
        ),
        (
            "We appreciate your candid feedback and sincerely apologize for the "
            "inconvenience. Your concerns have been escalated to our quality team. We are "
            "committed to making improvements based on your valuable input."
        ),
    ],
    ("negative", "complaint", "professional"): [
        (
            "Thank you for your detailed feedback. We regret the experience you've had and "
            "understand your concerns. Our team is reviewing your case and will provide a "
            "resolution within 2 business days. We value your relationship and are committed "
            "to resolving this matter."
        ),
        (
            "We appreciate you bringing this matter to our attention through professional "
            "channels. Your experience does not meet our service standards. We are "
            "immediately initiating a review and will ensure appropriate corrective measures "
            "are taken."
        ),
    ],
    ("neutral", "inquiry", "professional"): [
        (
            "Thank you for reaching out. We'd be happy to provide you with the information "
            "you need. Please contact our support team with your specific questions, and "
            "we'll ensure a prompt and detailed response."
        ),
        (
            "Thank you for your inquiry. Our team is here to help. Please provide your "
            "contact details and specific questions, and we'll have a representative get "
            "back to you within one business day."
        ),
    ],
    ("neutral", "suggestion", "professional"): [
        (
            "Thank you for your suggestion! We greatly value customer input in helping us "
            "improve. Your suggestion has been noted and will be shared with our product "
            "development team for consideration."
        ),
        (
            "We appreciate your constructive suggestion. Customer feedback is central to our "
            "improvement process. We've recorded your input and our team will evaluate it "
            "carefully."
        ),
    ],
    ("positive", "praise", "casual"): [
        (
            "Wow, thank you so much! Your enthusiasm really makes our day. We're so happy "
            "you're loving the experience! Keep spreading the good vibes and we'll keep "
            "delivering the goods!"
        ),
        (
            "That's absolutely amazing to hear! Thanks for the love! We work hard to make "
            "every experience special, and knowing it's working means everything to us. "
            "Can't wait to see you again!"
        ),
    ],
}

DEFAULT_RESPONSES: dict[str, str] = {
    "positive": (
        "Thank you for your positive feedback! We're delighted to hear about your "
        "experience and will continue working hard to maintain this standard of excellence."
    ),
    "negative": (
        "We sincerely apologize for any inconvenience caused. Your feedback is important "
        "to us, and we are committed to improving your experience. Please contact our "
        "support team so we can address your concerns directly."
    ),
    "neutral": (
        "Thank you for sharing your feedback. We value your input and will use it to "
        "improve our services. Please don't hesitate to reach out if you need further "
        "assistance."
    ),
}


def generate_response(
    sentiment: dict,
    tone: dict,
    intent: dict,
    emotion: dict,
    original_text: str,
) -> str:
    """Return a contextually appropriate suggested response string."""

    sentiment_label = sentiment["label"]
    tone_label = tone["label"].lower()
    intent_label = intent["label"].lower()

    # Exact match
    key = (sentiment_label, intent_label, tone_label)
    if key in RESPONSE_TEMPLATES:
        return random.choice(RESPONSE_TEMPLATES[key])

    # Partial match: sentiment + intent
    for stored_key, responses in RESPONSE_TEMPLATES.items():
        if stored_key[0] == sentiment_label and stored_key[1] == intent_label:
            return random.choice(responses)

    # Partial match: sentiment only
    for stored_key, responses in RESPONSE_TEMPLATES.items():
        if stored_key[0] == sentiment_label:
            return random.choice(responses)

    return DEFAULT_RESPONSES.get(sentiment_label, DEFAULT_RESPONSES["neutral"])
