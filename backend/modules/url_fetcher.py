import re
import logging
from urllib.parse import urlparse, parse_qs

logger = logging.getLogger(__name__)


def detect_platform(url: str) -> str:
    """Return 'youtube', raise ValueError for unsupported URLs."""
    host = urlparse(url.strip()).netloc.lower().removeprefix("www.")
    if host in ("youtube.com", "youtu.be", "m.youtube.com"):
        return "youtube"
    raise ValueError(
        "Unsupported URL. Paste a YouTube video URL (youtube.com/watch?v=... or youtu.be/...)."
    )


def _youtube_video_id(url: str) -> str:
    parsed = urlparse(url)
    host = parsed.netloc.lower().removeprefix("www.")
    if host == "youtu.be":
        vid = parsed.path.lstrip("/").split("/")[0]
        if vid:
            return vid
    qs = parse_qs(parsed.query)
    if "v" in qs:
        return qs["v"][0]
    m = re.search(r"/shorts/([A-Za-z0-9_-]+)", parsed.path)
    if m:
        return m.group(1)
    raise ValueError("Could not extract YouTube video ID from URL.")


def fetch_youtube_comments(url: str, max_comments: int = 50) -> dict:
    from config import settings

    if not getattr(settings, "YOUTUBE_API_KEY", ""):
        raise ValueError(
            "YOUTUBE_API_KEY is not set. Get a free key at "
            "console.cloud.google.com → APIs & Services → YouTube Data API v3, "
            "then add YOUTUBE_API_KEY=your_key to your backend .env file."
        )

    try:
        from googleapiclient.discovery import build
        from googleapiclient.errors import HttpError
    except ImportError:
        raise RuntimeError(
            "google-api-python-client is not installed. "
            "Run: pip install google-api-python-client"
        )

    video_id = _youtube_video_id(url)
    youtube = build("youtube", "v3", developerKey=settings.YOUTUBE_API_KEY)

    try:
        video_resp = youtube.videos().list(
            part="snippet,statistics", id=video_id
        ).execute()
    except HttpError as e:
        raise ValueError(f"YouTube API error: {e.reason}")

    if not video_resp.get("items"):
        raise ValueError("Video not found or comments are disabled.")

    snippet = video_resp["items"][0]["snippet"]
    stats = video_resp["items"][0]["statistics"]
    title = snippet["title"]
    author = snippet["channelTitle"]
    total_available = int(stats.get("commentCount", 0))

    comments: list[str] = []
    next_page_token = None

    while len(comments) < max_comments:
        batch = min(100, max_comments - len(comments))
        try:
            resp = youtube.commentThreads().list(
                part="snippet",
                videoId=video_id,
                maxResults=batch,
                order="relevance",
                textFormat="plainText",
                pageToken=next_page_token,
            ).execute()
        except HttpError as e:
            if "commentsDisabled" in str(e):
                raise ValueError("Comments are disabled for this video.")
            raise ValueError(f"YouTube API error: {e.reason}")

        for item in resp.get("items", []):
            text = item["snippet"]["topLevelComment"]["snippet"]["textDisplay"].strip()
            if text:
                comments.append(text)

        next_page_token = resp.get("nextPageToken")
        if not next_page_token:
            break

    return {
        "platform": "youtube",
        "title": title,
        "author": author,
        "url": url,
        "total_available": total_available,
        "comments": comments[:max_comments],
    }


def fetch_comments(url: str, max_comments: int = 50) -> dict:
    """Detect platform and return comments + post metadata."""
    detect_platform(url)  # raises ValueError for unsupported URLs
    return fetch_youtube_comments(url, max_comments)
