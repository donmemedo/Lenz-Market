from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.staticfiles import StaticFiles

from .api import router
from .config import CORS_ORIGINS, MEDIA_DIR, PRODUCTION, SEED_DEMO
from .db import init_db
from .middleware import BodyLimit, SecurityHeaders
from .seed import seed


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
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

# Last added runs first: size check, then headers on every response (errors and preflights too).
app.add_middleware(GZipMiddleware, minimum_size=1024)
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Authorization", "Content-Type"],
    max_age=600,
)
app.add_middleware(SecurityHeaders)
app.add_middleware(BodyLimit)

app.include_router(router)
app.mount("/media", StaticFiles(directory=MEDIA_DIR), name="media")


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "qaab-api"}
