import hashlib
import hmac
import os
from datetime import datetime, timedelta, timezone
from typing import Optional

import jwt
from fastapi import Depends, HTTPException, Request, status
from sqlmodel import Session, select

from .config import ACCESS_TOKEN_TTL_MIN, SECRET_KEY
from .db import get_session
from .models import User

_ITER = 120_000


def hash_password(password: str) -> str:
    salt = os.urandom(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, _ITER)
    return f"pbkdf2${_ITER}${salt.hex()}${dk.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        _, iters, salt, digest = stored.split("$")
        dk = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt), int(iters))
        return hmac.compare_digest(dk.hex(), digest)
    except Exception:
        return False


def create_token(user_id: int) -> str:
    payload = {
        "sub": str(user_id),
        "exp": datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_TTL_MIN),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm="HS256")


def _token_from(request: Request) -> Optional[str]:
    header = request.headers.get("authorization", "")
    if header.lower().startswith("bearer "):
        return header[7:]
    return None


def current_user(request: Request, session: Session = Depends(get_session)) -> User:
    token = _token_from(request)
    if not token:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "نیاز به ورود | Login required")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        user = session.get(User, int(payload["sub"]))
    except Exception:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "نشست نامعتبر | Invalid session")
    if not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "کاربر یافت نشد | User not found")
    return user


def optional_user(request: Request, session: Session = Depends(get_session)) -> Optional[User]:
    try:
        return current_user(request, session)
    except HTTPException:
        return None


def get_user_by_email(session: Session, email: str) -> Optional[User]:
    return session.exec(select(User).where(User.email == email)).first()
