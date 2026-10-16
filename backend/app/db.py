import logging

from sqlalchemy import event, inspect
from sqlalchemy.exc import IntegrityError, OperationalError
from sqlmodel import Session, SQLModel, create_engine

from .config import DATABASE_URL

log = logging.getLogger("qaab.db")
_sqlite = DATABASE_URL.startswith("sqlite")
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False} if _sqlite else {})

if _sqlite:
    @event.listens_for(engine, "connect")
    def _pragmas(conn, _):
        cur = conn.cursor()
        # WAL lets readers run during a write; busy_timeout queues writers instead of failing.
        for pragma in ("journal_mode=WAL", "busy_timeout=5000", "foreign_keys=ON", "synchronous=NORMAL"):
            cur.execute(f"PRAGMA {pragma}")
        cur.close()


def init_db() -> None:
    SQLModel.metadata.create_all(engine)
    _migrate()


def _migrate() -> None:
    """create_all never alters existing tables, so patch the few schema changes in place."""
    if "token_version" not in {c["name"] for c in inspect(engine).get_columns("user")}:
        with engine.begin() as c:
            c.exec_driver_sql('ALTER TABLE "user" ADD COLUMN token_version INTEGER NOT NULL DEFAULT 0')
    with engine.begin() as c:
        c.exec_driver_sql('DELETE FROM "like" WHERE id NOT IN '
                          '(SELECT MIN(id) FROM "like" GROUP BY user_id, photo_id)')
        c.exec_driver_sql('CREATE UNIQUE INDEX IF NOT EXISTS ux_like_user_photo ON "like"(user_id, photo_id)')
        c.exec_driver_sql("CREATE INDEX IF NOT EXISTS ix_photo_likes ON photo(likes)")
        c.exec_driver_sql("CREATE INDEX IF NOT EXISTS ix_photo_created ON photo(created_at)")
    try:
        with engine.begin() as c:
            c.exec_driver_sql("CREATE UNIQUE INDEX IF NOT EXISTS ux_purchase ON purchase(buyer_id, photo_id, license)")
    except (IntegrityError, OperationalError):
        log.warning("duplicate purchases exist; ux_purchase not created (app-level check still applies)")


def get_session():
    with Session(engine) as session:
        yield session
