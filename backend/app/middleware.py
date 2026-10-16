"""Pure-ASGI middleware: header lists are built once, so each response costs one list concat."""
import json

from .config import PRODUCTION

_BASE = [
    (b"x-content-type-options", b"nosniff"),
    (b"x-frame-options", b"DENY"),
    (b"referrer-policy", b"no-referrer"),
    (b"cross-origin-opener-policy", b"same-origin"),
    (b"permissions-policy", b"camera=(), microphone=(), geolocation=()"),
] + ([(b"strict-transport-security", b"max-age=63072000; includeSubDomains")] if PRODUCTION else [])
_API = _BASE + [(b"content-security-policy", b"default-src 'none'; frame-ancestors 'none'; sandbox")]
_PRIVATE = _API + [(b"cache-control", b"no-store")]
# Uploaded files: never executable, never framed; names are random so they can be cached forever.
_MEDIA = _BASE + [(b"content-security-policy", b"default-src 'none'; img-src 'self'; sandbox"),
                  (b"cache-control", b"public, max-age=31536000, immutable")]
_PRIVATE_PREFIXES = ("/api/auth", "/api/me", "/api/purchases", "/api/upload")


def _headers_for(path: str) -> list:
    if path.startswith("/media/"):
        return _MEDIA
    if path.startswith(_PRIVATE_PREFIXES) or path.endswith("/download"):
        return _PRIVATE
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
    """Reject oversized bodies from the Content-Length header, before anything is parsed or spooled."""

    def __init__(self, app, default: int = 64 * 1024, upload: int = 12 * 1024 * 1024 + 64 * 1024):
        self.app, self.default, self.upload = app, default, upload

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http" or scope["method"] not in ("POST", "PUT", "PATCH"):
            return await self.app(scope, receive, send)
        limit = self.upload if scope["path"] == "/api/upload" else self.default
        length = dict(scope["headers"]).get(b"content-length")
        if length is None:
            return await _reply(send, 411, "Content-Length required")
        if not length.isdigit() or int(length) > limit:
            return await _reply(send, 413, "حجم درخواست بیش از حد مجاز است | Request too large")
        await self.app(scope, receive, send)


async def _reply(send, status: int, detail: str) -> None:
    body = json.dumps({"detail": detail}).encode()
    await send({"type": "http.response.start", "status": status,
                "headers": [(b"content-type", b"application/json"), (b"content-length", str(len(body)).encode())]
                + _API})
    await send({"type": "http.response.body", "body": body})
