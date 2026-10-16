import hashlib
import hmac
import os
import secrets
import threading
import time
from datetime import datetime, timedelta, timezone
from functools import cache
from typing import Optional

import jwt
from fastapi import Depends, HTTPException, Request, Response, status
from sqlmodel import Session, select

from .config import ACCESS_TOKEN_TTL_MIN, CORS_ORIGINS, COOKIE_SECURE, SECRET_KEY
from .db import get_session
from .models import User

_ITER = 600_000  # OWASP 2023 guidance for PBKDF2-HMAC-SHA256
COOKIE = "qaab_session"
_SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}


# ---------- passwords ----------
def hash_password(password: str, iterations: int = _ITER) -> str:
    salt = os.urandom(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, iterations)
    return f"pbkdf2${iterations}${salt.hex()}${dk.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        _, iters, salt, digest = stored.split("$")
        dk = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt), int(iters))
        return hmac.compare_digest(dk.hex(), digest)
    except Exception:  # unusable hash ("!") or malformed value
        return False


def needs_rehash(stored: str) -> bool:
    parts = stored.split("$")
    return len(parts) == 4 and int(parts[1]) < _ITER


@cache
def dummy_hash() -> str:
    """Verified against when the email is unknown, so response time does not reveal accounts."""
    return hash_password(secrets.token_hex(16))


# ---------- rate limiting ----------
class RateLimiter:
    """Fixed-window counter per key: O(1) per check, bounded memory."""
    # ponytail: in-process state; move to Redis if the API runs more than one worker.

    def __init__(self, limit: int, window_s: int):
        self.limit, self.window = limit, window_s
        self.hits: dict[str, tuple[float, int]] = {}
        self.lock = threading.Lock()

    def _current(self, key: str, now: float) -> tuple[float, int]:
        start, count = self.hits.get(key, (now, 0))
        return (now, 0) if now - start >= self.window else (start, count)

    def check(self, key: str) -> None:
        """Raise 429 if the key is over its limit, without counting this call."""
        now = time.monotonic()
        with self.lock:
            start, count = self._current(key, now)
        if count >= self.limit:
            retry = int(self.window - (now - start)) + 1
            raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS,
                                "تلاش‌های زیادی انجام شد؛ کمی بعد دوباره امتحان کنید | Too many attempts, try again later",
                                headers={"Retry-After": str(retry)})

    def add(self, key: str) -> None:
        now = time.monotonic()
        with self.lock:
            start, count = self._current(key, now)
            self.hits[key] = (start, count + 1)
            if len(self.hits) > 50_000:  # drop expired windows so memory stays bounded
                self.hits = {k: v for k, v in self.hits.items() if now - v[0] < self.window}

    def hit(self, key: str) -> None:
        self.check(key)
        self.add(key)


LIMITS = {
    "login_ip": RateLimiter(30, 60),         # all login attempts per IP
    "login_fail": RateLimiter(5, 15 * 60),   # failed logins per account
    "register_ip": RateLimiter(10, 3600),
    "upload_user": RateLimiter(60, 3600),
    "buy_user": RateLimiter(30, 60),
}


def reset_rate_limits() -> None:
    for limiter in LIMITS.values():
        limiter.hits.clear()


def client_ip(request: Request) -> str:
    # Behind a reverse proxy run uvicorn with --proxy-headers so this is the real client.
    return request.client.host if request.client else "unknown"


# ---------- sessions ----------
def create_token(user: User) -> str:
    now = datetime.now(timezone.utc)
    payload = {"sub": str(user.id), "ver": user.token_version, "iat": now,
               "exp": now + timedelta(minutes=ACCESS_TOKEN_TTL_MIN)}
    return jwt.encode(payload, SECRET_KEY, algorithm="HS256")


def set_session_cookie(response: Response, token: str) -> None:
    response.set_cookie(COOKIE, token, max_age=ACCESS_TOKEN_TTL_MIN * 60, httponly=True,
                        secure=COOKIE_SECURE, samesite="lax", path="/")


def clear_session_cookie(response: Response) -> None:
    response.delete_cookie(COOKIE, path="/", httponly=True, secure=COOKIE_SECURE, samesite="lax")


def _trusted_origin(request: Request) -> bool:
    origin = request.headers.get("origin") or ""
    if not origin:
        referer = request.headers.get("referer") or ""
        origin = "/".join(referer.split("/")[:3]) if referer else ""
    return origin in CORS_ORIGINS


def current_user(request: Request, session: Session = Depends(get_session)) -> User:
    header = request.headers.get("authorization", "")
    token = header[7:] if header.lower().startswith("bearer ") else None
    if token is None:
        token = request.cookies.get(COOKIE)
        # Cookies ride along on cross-site requests; writes must come from our own web origin (CSRF).
        if token and request.method not in _SAFE_METHODS and not _trusted_origin(request):
            raise HTTPException(status.HTTP_403_FORBIDDEN, "درخواست از مبدأ نامعتبر | Untrusted origin")
    if not token:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "نیاز به ورود | Login required")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"], options={"require": ["exp", "iat", "sub"]})
        user = session.get(User, int(payload["sub"]))
    except (jwt.PyJWTError, ValueError, KeyError):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "نشست نامعتبر | Invalid session")
    if not user or payload.get("ver", 0) != user.token_version:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "نشست نامعتبر | Invalid session")
    return user


def optional_user(request: Request, session: Session = Depends(get_session)) -> Optional[User]:
    try:
        return current_user(request, session)
    except HTTPException:
        return None


def get_user_by_email(session: Session, email: str) -> Optional[User]:
    return session.exec(select(User).where(User.email == email.lower())).first()
