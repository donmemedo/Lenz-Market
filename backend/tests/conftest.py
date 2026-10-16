import io
import itertools
import os
import tempfile

_tmp = tempfile.mkdtemp(prefix="qaab-test-")
os.environ.update(
    QAAB_DATA_DIR=_tmp,
    QAAB_MEDIA_DIR=os.path.join(_tmp, "media"),
    CORS_ORIGINS="http://localhost:3041",
    SECRET_KEY="",
)

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402

ORIGIN = {"Origin": "http://localhost:3041"}
_ids = itertools.count(1)


@pytest.fixture(scope="session")
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture(autouse=True)
def _fresh_limits():
    from app.security import reset_rate_limits
    reset_rate_limits()


def register(client, **extra):
    n = next(_ids)
    body = {"name": f"Tester {n}", "email": f"t{n}@example.com", "password": "correct horse 1", **extra}
    r = client.post("/api/auth/register", json=body)
    assert r.status_code == 200, r.text
    client.cookies.clear()
    return r.json(), {"Authorization": f"Bearer {r.json()['token']}"}


def login(client, email, password):
    r = client.post("/api/auth/login", json={"email": email, "password": password})
    client.cookies.clear()
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['token']}"}


def png_bytes(w=64, h=48):
    from PIL import Image
    buf = io.BytesIO()
    Image.new("RGB", (w, h), (120, 60, 200)).save(buf, "PNG")
    return buf.getvalue()
