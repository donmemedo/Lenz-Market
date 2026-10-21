import hashlib
import hmac
import logging
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
# One hash per core at a time: a login burst queues briefly instead of occupying every request thread.
_HASH_SLOTS = threading.BoundedSemaphore(os.cpu_count() or 2)
_BUSY = "سرور مشغول است؛ کمی بعد دوباره امتحان کنید | Server busy, try again shortly"


def _pbkdf2(password: str, salt: bytes, iterations: int) -> bytes:
    if not _HASH_SLOTS.acquire(timeout=10):
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, _BUSY, headers={"Retry-After": "5"})
    try:
        return hashlib.pbkdf2_hmac("sha256", password.encode(), salt, iterations)
    finally:
        _HASH_SLOTS.release()
COOKIE = "qaab_session"
_SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}


# ---------- passwords ----------
def hash_password(password: str, iterations: int = _ITER) -> str:
    salt = os.urandom(16)
    dk = _pbkdf2(password, salt, iterations)
    return f"pbkdf2${iterations}${salt.hex()}${dk.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        _, iters, salt, digest = stored.split("$")
        salt_bytes, rounds = bytes.fromhex(salt), int(iters)
    except ValueError:  # unusable hash ("!") or malformed value
        return False
    return hmac.compare_digest(_pbkdf2(password, salt_bytes, rounds).hex(), digest)


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
        self.pruned = 0.0

    def hit(self, key: str) -> None:
        """Count this attempt and raise 429 when over the limit; check and count are one atomic step."""
        now = time.monotonic()
        with self.lock:
            start, count = self.hits.get(key, (now, 0))
            if now - start >= self.window:
                start, count = now, 0
            if count < self.limit:
                self.hits[key] = (start, count + 1)
                # Drop expired windows, at most a few times per window so a flood of keys can't make every hit O(n).
                if len(self.hits) > 50_000 and now - self.pruned >= self.window / 10:
                    self.pruned = now
                    self.hits = {k: v for k, v in self.hits.items() if now - v[0] < self.window}
                return
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS,
                            "تلاش‌های زیادی انجام شد؛ کمی بعد دوباره امتحان کنید | Too many attempts, try again later",
                            headers={"Retry-After": str(int(self.window - (now - start)) + 1)})


LIMITS = {
    "login_ip": RateLimiter(30, 60),               # all login attempts per IP
    "login_account_ip": RateLimiter(5, 15 * 60),   # per account from one IP: stops guessing
    "login_account": RateLimiter(50, 3600),        # per account from anywhere: slows distributed guessing
                                                   # without letting one stranger lock the owner out
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


def current_user(request: Request, session: Session = Depends(get_session)) -> User:
    header = request.headers.get("authorization", "")
    token = header[7:] if header.lower().startswith("bearer ") else None
    if token is None:
        token = request.cookies.get(COOKIE)
        # Cookies ride along on cross-site requests; writes must come from our own web origin (CSRF).
        if token and request.method not in _SAFE_METHODS and request.headers.get("origin") not in CORS_ORIGINS:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "درخواست پذیرفته نشد؛ صفحه را دوباره باز کنید | Untrusted origin")
    if not token:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "نیاز به ورود | Login required")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"], options={"require": ["exp", "iat", "sub"]})
        user = session.get(User, int(payload["sub"]))
    except (jwt.PyJWTError, ValueError, KeyError):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "لطفاً دوباره وارد شوید | Please log in again")
    if not user or payload.get("ver", 0) != user.token_version:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "لطفاً دوباره وارد شوید | Please log in again")
    return user


def optional_user(request: Request, session: Session = Depends(get_session)) -> Optional[User]:
    try:
        return current_user(request, session)
    except HTTPException:
        return None


def get_user_by_email(session: Session, email: str) -> Optional[User]:
    return session.exec(select(User).where(User.email == email)).first()  # already lower-cased by the schema
