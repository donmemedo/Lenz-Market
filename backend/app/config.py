import os
import secrets
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = Path(os.getenv("QAAB_DATA_DIR", BASE_DIR / "data"))
MEDIA_DIR = Path(os.getenv("QAAB_MEDIA_DIR", BASE_DIR / "media"))
# Full-resolution originals are never mounted; they are served only through the
# authenticated download endpoint to the owner or a buyer.
ORIGINALS_DIR = DATA_DIR / "originals"
for _d in (DATA_DIR, MEDIA_DIR, ORIGINALS_DIR):
    _d.mkdir(parents=True, exist_ok=True)

PRODUCTION = os.getenv("APP_ENV", "development") == "production"
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{DATA_DIR / 'qaab.db'}")

def _secret_key() -> str:
    key = os.getenv("SECRET_KEY", "")
    if key:  # the old placeholders ("change-me-in-production", ...) are short, so they fail here too
        if len(key) < 32:
            raise RuntimeError("SECRET_KEY must be at least 32 random characters")
        return key
    if PRODUCTION:
        raise RuntimeError("SECRET_KEY must be set when APP_ENV=production")
    # Development: a random key generated once and kept in the (git-ignored) data dir.
    path = DATA_DIR / ".secret_key"
    try:  # created owner-only and exclusively, so two starting workers agree on one key
        fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(fd, "w") as fh:
            fh.write(secrets.token_urlsafe(48))
    except FileExistsError:
        pass
    return path.read_text().strip()


SECRET_KEY = _secret_key()
ACCESS_TOKEN_TTL_MIN = int(os.getenv("ACCESS_TOKEN_TTL_MIN", "1440"))
COOKIE_SECURE = os.getenv("COOKIE_SECURE", "1" if PRODUCTION else "0") == "1"

CORS_ORIGINS = [o.strip() for o in
                os.getenv("CORS_ORIGINS", "http://localhost:3041").split(",") if o.strip()]
if "*" in CORS_ORIGINS:
    raise RuntimeError("CORS_ORIGINS='*' is not allowed: sessions use credentials. List the web origins.")

MAX_UPLOAD = 12 * 1024 * 1024
# فروشنده سهم ۵۰٪ از هر فروش دارد (مدل فوآپ) — integer percent keeps money math exact
CREATOR_SHARE_PCT = round(float(os.getenv("CREATOR_SHARE", "0.5")) * 100)
# Demo data (with the public demo login) never runs in production, whatever the env says.
SEED_DEMO = not PRODUCTION and os.getenv("QAAB_SEED_DEMO", "1") == "1"
