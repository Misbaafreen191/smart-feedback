from textblob import TextBlob

def analyze_sentiment(text: str):
    """Return sentiment and polarity score for a given text."""
    if not text or not text.strip():
        return {"sentiment": "Neutral", "score": 0.0}

    blob = TextBlob(text)
    polarity = blob.sentiment.polarity

    if polarity > 0.1:
        sentiment = "Positive"
    elif polarity < -0.1:
        sentiment = "Negative"
    else:
        sentiment = "Neutral"

    return {"sentiment": sentiment, "score": round(polarity, 3)}
