import re
import logging
from urllib.parse import urlparse, parse_qs

logger = logging.getLogger(__name__)


def detect_platform(url: str) -> str:
    """Return 'youtube' or 'myntra'; raise ValueError for unsupported URLs."""
    host = urlparse(url.strip()).netloc.lower().removeprefix("www.")
    if host in ("youtube.com", "youtu.be", "m.youtube.com"):
        return "youtube"
    if host == "myntra.com":
        return "myntra"
    raise ValueError(
        "Unsupported URL. Paste a YouTube video URL or a Myntra product URL."
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


def _myntra_product_id(url: str) -> str:
    path = urlparse(url).path
    m = re.search(r'/(\d{6,10})(?:/|$)', path)
    if not m:
        raise ValueError(
            "Could not extract Myntra product ID from URL. "
            "Paste a valid Myntra product page URL (e.g. myntra.com/shoes/.../12345678/buy)."
        )
    return m.group(1)


def fetch_myntra_reviews(url: str, max_reviews: int = 50) -> dict:
    """Fetch product reviews from Myntra using their internal reviews API."""
    try:
        from curl_cffi import requests as cf_requests
    except ImportError:
        raise RuntimeError(
            "curl-cffi is not installed. Run: pip install curl-cffi"
        )

    product_id = _myntra_product_id(url)

    _HEADERS = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/120.0.0.0 Safari/537.36"
        ),
        "Accept": "text/html,application/xhtml+xml,*/*",
        "Accept-Language": "en-US,en;q=0.9",
    }

    with cf_requests.Session(impersonate="chrome120") as session:
        # Load the product page to establish session cookies and grab the title
        pg = session.get(url, headers=_HEADERS, timeout=20)
        if pg.status_code not in (200, 301, 302):
            raise ValueError(
                f"Myntra product page returned HTTP {pg.status_code}. Check the URL."
            )

        title_m = re.search(r"<title>(.*?)</title>", pg.text)
        raw_title = title_m.group(1) if title_m else ""
        for suffix in [
            "- Buy Online at Best Price in India",
            "| Myntra",
            "Buy ",
        ]:
            raw_title = raw_title.replace(suffix, "")
        # Remove trailing product ID digits that sometimes appear in the <title>
        raw_title = re.sub(r'\s*\d{6,10}\s*$', '', raw_title)
        title = raw_title.strip(" -|") or f"Myntra Product {product_id}"

        # Fetch review pages
        reviews: list[str] = []
        total_available = 0
        page_num = 1
        page_size = 10

        api_headers = {
            **_HEADERS,
            "Accept": "application/json, text/plain, */*",
            "Referer": url,
        }

        while len(reviews) < max_reviews:
            api_url = (
                f"https://www.myntra.com/web/v1/reviews/product/{product_id}"
                f"?size={page_size}&page={page_num}"
            )
            resp = session.get(api_url, headers=api_headers, timeout=15)
            if resp.status_code != 200:
                break

            data = resp.json()
            batch = data.get("reviews", [])
            if not batch:
                break

            for r in batch:
                text = (r.get("review") or "").strip()
                if text:
                    reviews.append(text)

            if not total_available:
                total_available = (
                    data.get("reviewsMetaData", {}).get("reviewCount", 0)
                )

            if len(batch) < page_size:
                break
            page_num += 1

    if not reviews:
        raise ValueError(
            "No reviews found for this Myntra product. "
            "The product may have no reviews yet."
        )

    return {
        "platform": "myntra",
        "title": title,
        "author": "Myntra Customers",
        "url": url,
        "total_available": total_available or len(reviews),
        "comments": reviews[:max_reviews],
    }


def fetch_comments(url: str, max_comments: int = 50) -> dict:
    """Detect platform and return comments/reviews + post metadata."""
    platform = detect_platform(url)  # raises ValueError for unsupported URLs
    if platform == "myntra":
        return fetch_myntra_reviews(url, max_comments)
    return fetch_youtube_comments(url, max_comments)
