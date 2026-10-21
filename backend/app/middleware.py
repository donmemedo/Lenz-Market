"""Pure-ASGI middleware: header lists are built once, so each response costs one list concat."""
from starlette.responses import JSONResponse

from .config import MAX_UPLOAD, PRODUCTION

_BASE = [
    (b"x-content-type-options", b"nosniff"),
    (b"x-frame-options", b"DENY"),
    (b"referrer-policy", b"no-referrer"),
    (b"cross-origin-opener-policy", b"same-origin"),
    (b"permissions-policy", b"camera=(), microphone=(), geolocation=()"),
] + ([(b"strict-transport-security", b"max-age=63072000; includeSubDomains")] if PRODUCTION else [])
_API = _BASE + [(b"content-security-policy", b"default-src 'none'; frame-ancestors 'none'; sandbox"),
                (b"cache-control", b"no-store")]
# Uploaded files: never executable, never framed; names are random so they can be cached forever.
_MEDIA = _BASE + [(b"content-security-policy", b"default-src 'none'; img-src 'self'; sandbox"),
                  (b"cache-control", b"public, max-age=31536000, immutable")]


def _headers_for(path: str) -> list:
    if path.startswith("/media/"):
        return _MEDIA
    if path.startswith(("/docs", "/openapi.json")):  # Swagger UI needs its own CDN scripts (dev only)
        return _BASE
    return _API


class SecurityHeaders:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            return await self.app(scope, receive, send)
        extra = _headers_for(scope["path"])

        async def send_with_headers(message):
            if message["type"] == "http.response.start":
                message["headers"] = list(message.get("headers", [])) + extra
            await send(message)

        await self.app(scope, receive, send_with_headers)


class BodyLimit:
    """Reject oversized bodies from the Content-Length header, before anything is parsed or spooled.
    uvicorn's default httptools parser refuses bodies longer than their Content-Length."""

    def __init__(self, app, default: int = 64 * 1024, upload: int = MAX_UPLOAD + 64 * 1024):
        self.app, self.default, self.upload = app, default, upload

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http" or scope["method"] not in ("POST", "PUT", "PATCH"):
            return await self.app(scope, receive, send)
        headers = dict(scope["headers"])
        upload = scope["path"] == "/api/upload"
        # FastAPI parses multipart before auth runs, so refuse anonymous uploads before 12 MB is spooled.
        if upload and not (headers.get(b"authorization") or b"qaab_session=" in headers.get(b"cookie", b"")):
            return await JSONResponse({"detail": "نیاز به ورود | Login required"}, 401)(scope, receive, send)
        limit = self.upload if upload else self.default
        length = headers.get(b"content-length")
        if length is None:
            return await JSONResponse({"detail": "Content-Length required"}, 411)(scope, receive, send)
        if not length.isdigit() or int(length) > limit:
            return await JSONResponse({"detail": "حجم درخواست بیش از حد مجاز است | Request too large"}, 413)(
                scope, receive, send)
        await self.app(scope, receive, send)
