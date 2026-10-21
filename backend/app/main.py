import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.staticfiles import StaticFiles
from sqlmodel import Session

from .api import migrate_legacy_uploads, router
from .config import CORS_ORIGINS, MEDIA_DIR, PRODUCTION, SEED_DEMO
from .db import engine, init_db
from .middleware import BodyLimit, SecurityHeaders
from .seed import lock_sample_accounts, seed


@asynccontextmanager
async def lifespan(_: FastAPI):
    if PRODUCTION and os.getenv("FORWARDED_ALLOW_IPS", "127.0.0.1") in ("", "127.0.0.1"):
        logging.getLogger("qaab").warning(
            "FORWARDED_ALLOW_IPS is not set to your reverse proxy: every client shares one rate-limit bucket")
    init_db()
    lock_sample_accounts(include_demo=not SEED_DEMO)
    with Session(engine) as session:
        migrate_legacy_uploads(session)
    if SEED_DEMO:
        seed()
    yield


app = FastAPI(
    title="Qaab API | قاب",
    description="بازار عکس ایرانی — Iranian photo marketplace & brand missions",
    version="1.1.0",
    docs_url=None if PRODUCTION else "/docs",
    redoc_url=None,
    openapi_url=None if PRODUCTION else "/openapi.json",
    lifespan=lifespan,
)

# Last added runs first: headers on every response, then CORS (so 411/413 replies stay readable
# cross-origin), then the size check before any parsing.
app.add_middleware(GZipMiddleware, minimum_size=1024, compresslevel=6)  # ~1% bigger than 9, much less CPU
app.add_middleware(BodyLimit)
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Authorization", "Content-Type"],
    max_age=600,
)
app.add_middleware(SecurityHeaders)

app.include_router(router)
app.mount("/media", StaticFiles(directory=MEDIA_DIR), name="media")


@app.get("/api/health")
def health():
    # "demo" tells the web app whether the shared demo login exists, so UI and API never disagree.
    return {"status": "ok", "service": "qaab-api", "demo": SEED_DEMO}
