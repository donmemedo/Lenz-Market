import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = Path(os.getenv("QAAB_DATA_DIR", BASE_DIR / "data"))
MEDIA_DIR = Path(os.getenv("QAAB_MEDIA_DIR", BASE_DIR / "media"))
DATA_DIR.mkdir(parents=True, exist_ok=True)
MEDIA_DIR.mkdir(parents=True, exist_ok=True)

DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{DATA_DIR / 'qaab.db'}")
SECRET_KEY = os.getenv("SECRET_KEY", "qaab-dev-secret-change-me")
ACCESS_TOKEN_TTL_MIN = int(os.getenv("ACCESS_TOKEN_TTL_MIN", "10080"))
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*").split(",")
# فروشنده سهم ۵۰٪ از هر فروش دارد (مدل فوآپ)
CREATOR_SHARE = float(os.getenv("CREATOR_SHARE", "0.5"))
