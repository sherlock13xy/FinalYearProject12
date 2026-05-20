import re
import logging
from urllib.parse import urlparse, parse_qs

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


def _get_instaloader():
    """Return an authenticated Instaloader instance, using a saved session when possible."""
    try:
        import instaloader
    except ImportError:
        raise RuntimeError("instaloader is not installed. Run: pip install instaloader")

    from config import settings

    username = getattr(settings, "INSTAGRAM_USERNAME", "").strip()
    password = getattr(settings, "INSTAGRAM_PASSWORD", "").strip()

    if not username or not password:
        raise ValueError(
            "Instagram credentials are not set. "
            "Add INSTAGRAM_USERNAME and INSTAGRAM_PASSWORD to your backend .env file."
        )

    L = instaloader.Instaloader()
    session_file = f"instagram_session_{username}"

    try:
        L.load_session_from_file(username, filename=session_file)
        logger.info("Loaded Instagram session from file.")
    except FileNotFoundError:
        try:
            L.login(username, password)
            L.save_session_to_file(filename=session_file)
            logger.info("Instagram login successful, session saved.")
        except instaloader.exceptions.BadCredentialsException:
            raise ValueError("Instagram login failed: incorrect username or password.")
        except instaloader.exceptions.TwoFactorAuthRequiredException:
            raise ValueError(
                "Instagram account has two-factor authentication enabled. "
                "Disable 2FA or use an app-specific password."
            )
        except Exception as e:
            raise ValueError(f"Instagram login failed: {e}")

    return L, instaloader


def fetch_instagram_comments(url: str, max_comments: int = 50) -> dict:
    L, instaloader = _get_instaloader()
    shortcode = _instagram_shortcode(url)

    try:
        post = instaloader.Post.from_shortcode(L.context, shortcode)
    except instaloader.exceptions.QueryReturnedNotFoundException:
        raise ValueError("Instagram post not found. Make sure the URL is correct and the post is public.")
    except Exception as e:
        raise ValueError(f"Could not fetch Instagram post: {e}")

    caption = (post.caption or "").strip()
    title = caption[:120] + ("…" if len(caption) > 120 else "") if caption else "No caption"
    author = post.owner_username
    total_available = post.comments

    comments: list[str] = []
    try:
        for comment in post.get_comments():
            text = comment.text.strip()
            if text:
                comments.append(text)
            if len(comments) >= max_comments:
                break
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
