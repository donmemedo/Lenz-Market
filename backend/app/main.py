from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .api import router
from .config import CORS_ORIGINS, MEDIA_DIR
from .db import init_db
from .seed import seed

app = FastAPI(
    title="Qaab API | قاب",
    description="بازار عکس ایرانی — Iranian photo marketplace & brand missions",
    version="1.0.0",
    docs_url="/docs",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)
app.mount("/media", StaticFiles(directory=MEDIA_DIR), name="media")


@app.on_event("startup")
def on_startup() -> None:
    init_db()
    seed()


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "qaab-api"}
