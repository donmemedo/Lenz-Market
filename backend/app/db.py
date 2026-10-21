import logging

from sqlalchemy import event, inspect
from sqlalchemy.exc import IntegrityError, OperationalError
from sqlmodel import Session, SQLModel, create_engine

from .config import DATABASE_URL

log = logging.getLogger("qaab.db")
_sqlite = DATABASE_URL.startswith("sqlite")
# Pool >= the 40-thread request pool, so a slow request can never leave the others waiting for a connection.
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False} if _sqlite else {},
                       pool_size=10, max_overflow=40)

if _sqlite:
    @event.listens_for(engine, "connect")
    def _pragmas(conn, _):
        cur = conn.cursor()
        # WAL lets readers run during a write; busy_timeout queues writers instead of failing.
        # synchronous=FULL: a confirmed wallet purchase survives power loss; writes are rare, so the fsync is cheap.
        for pragma in ("journal_mode=WAL", "busy_timeout=5000", "foreign_keys=ON", "synchronous=FULL"):
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
        c.exec_driver_sql("CREATE INDEX IF NOT EXISTS ix_photo_url ON photo(url)")  # the partial unique index can't serve url = ?
    for name, sql in (
        ("ux_purchase", "CREATE UNIQUE INDEX IF NOT EXISTS ux_purchase ON purchase(buyer_id, photo_id, license)"),
        ("ux_photo_media_url", "CREATE UNIQUE INDEX IF NOT EXISTS ux_photo_media_url ON photo(url) WHERE url LIKE '/media/%'"),
        ("lowercase emails", 'UPDATE "user" SET email = lower(email) WHERE email != lower(email)'),
    ):
        try:  # old data may hold duplicates; the app-level checks still apply without the index
            with engine.begin() as c:
                c.exec_driver_sql(sql)
        except (IntegrityError, OperationalError):
            log.warning("%s skipped: existing rows conflict", name)


def get_session():
    with Session(engine) as session:
        yield session
