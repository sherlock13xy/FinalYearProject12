import os
import re
import logging
from urllib.parse import urlparse, parse_qs

_BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

logger = logging.getLogger(__name__)


def detect_platform(url: str) -> str:
    """Return 'youtube' or 'instagram', raise ValueError for unsupported URLs."""
    host = urlparse(url.strip()).netloc.lower().removeprefix("www.")
    if host in ("youtube.com", "youtu.be", "m.youtube.com"):
        return "youtube"
    if host in ("instagram.com", "m.instagram.com"):
        return "instagram"
    raise ValueError(
        "Unsupported URL. Paste a YouTube video URL or an Instagram post/reel URL."
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


def _instagram_shortcode(url: str) -> str:
    path = urlparse(url).path
    m = re.search(r"/(?:p|reel|tv)/([A-Za-z0-9_-]+)", path)
    if not m:
        raise ValueError("Could not extract Instagram post shortcode from URL.")
    return m.group(1)


def _get_instagram_client():
    try:
        from instagrapi import Client
        from instagrapi.exceptions import LoginRequired, ChallengeRequired, BadPassword
        import instagrapi.extractors as _extractors
    except ImportError:
        raise RuntimeError("instagrapi is not installed. Run: python -m pip install instagrapi")

    # Instagram added XDTGraphImage/XDTGraphVideo types that instagrapi's GQL
    # parser doesn't recognise yet — patch the map so GQL succeeds instead of
    # falling back to the private API with a logged traceback every request.
    _extractors.MEDIA_TYPES_GQL.setdefault("XDTGraphImage", 1)   # 1 = Photo
    _extractors.MEDIA_TYPES_GQL.setdefault("XDTGraphVideo", 2)   # 2 = Video
    _extractors.MEDIA_TYPES_GQL.setdefault("XDTGraphSidecar", 8) # 8 = Carousel

    from config import settings

    session_id = getattr(settings, "INSTAGRAM_SESSION_ID", "").strip()
    username = getattr(settings, "INSTAGRAM_USERNAME", "").strip()
    password = getattr(settings, "INSTAGRAM_PASSWORD", "").strip()

    cl = Client()
    settings_file = os.path.join(_BACKEND_DIR, "instagram_client_settings.json")

    # Load previously saved client settings (device fingerprint + session)
    if os.path.exists(settings_file):
        cl.load_settings(settings_file)

    if session_id:
        cl.login_by_sessionid(session_id)
        logger.info("Instagram authenticated via session ID.")
    elif username and password:
        try:
            cl.login(username, password)
            cl.dump_settings(settings_file)
            logger.info("Instagram login successful.")
        except ChallengeRequired:
            raise ValueError(
                "Instagram requires identity verification for this login. "
                "Use the session ID method instead: log into instagram.com in Chrome, "
                "open DevTools → Application → Cookies → instagram.com, "
                "copy the 'sessionid' cookie value, and add INSTAGRAM_SESSION_ID=<value> to your .env file."
            )
        except BadPassword:
            raise ValueError("Instagram login failed: incorrect username or password.")
        except Exception as e:
            raise ValueError(
                f"Instagram login failed: {e}. "
                "Add INSTAGRAM_SESSION_ID to your .env (from browser cookies) for reliable access."
            )
    else:
        raise ValueError(
            "No Instagram credentials set. Add INSTAGRAM_SESSION_ID to your .env file. "
            "Get it from Chrome → instagram.com → F12 → Application → Cookies → sessionid."
        )

    return cl


def fetch_instagram_comments(url: str, max_comments: int = 50) -> dict:
    cl = _get_instagram_client()
    shortcode = _instagram_shortcode(url)

    try:
        from instagrapi.exceptions import MediaNotFound, MediaUnavailable
        pk = cl.media_pk_from_code(shortcode)
        media = cl.media_info(pk)
    except Exception as e:
        raise ValueError(f"Could not fetch Instagram post: {e}")

    caption = (media.caption_text or "").strip()
    title = caption[:120] + ("…" if len(caption) > 120 else "") if caption else "No caption"
    author = media.user.username if media.user else "unknown"
    total_available = media.comment_count or 0

    comments: list[str] = []
    try:
        raw = cl.media_comments(media.id, amount=max_comments)
        comments = [c.text.strip() for c in raw if c.text.strip()]
    except Exception as e:
        logger.warning("Error fetching Instagram comments: %s", e)

    return {
        "platform": "instagram",
        "title": title,
        "author": author,
        "url": url,
        "total_available": total_available,
        "comments": comments,
    }


def fetch_comments(url: str, max_comments: int = 50) -> dict:
    """Detect platform and return comments + post metadata."""
    platform = detect_platform(url)  # raises ValueError for unsupported URLs
    if platform == "instagram":
        return fetch_instagram_comments(url, max_comments)
    return fetch_youtube_comments(url, max_comments)
