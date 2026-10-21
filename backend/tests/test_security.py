"""Security regression tests: each test pins one fixed weakness (see SECURITY_AUDIT.md)."""
import io

import jwt
import pytest
from sqlalchemy import event

from app.config import SECRET_KEY
from app.db import engine
from conftest import ORIGIN, login, png_bytes, register


# ---------- authentication & sessions ----------
def test_register_rejects_client_supplied_role(client):
    r = client.post("/api/auth/register", json={"name": "x", "email": "role@example.com",
                                                "password": "correct horse 1", "role": "admin"})
    assert r.status_code == 422
    user, _ = register(client)
    assert user["user"]["role"] == "creator"


def test_register_enforces_password_length(client):
    r = client.post("/api/auth/register", json={"name": "x", "email": "short@example.com", "password": "123"})
    assert r.status_code == 422


def test_login_is_throttled_per_account(client):
    codes = [client.post("/api/auth/login", json={"email": "demo@qaab.ir", "password": "nope-nope"}).status_code
             for _ in range(8)]
    assert codes[0] == 401 and 429 in codes
    assert "retry-after" in {k.lower() for k in
                             client.post("/api/auth/login", json={"email": "demo@qaab.ir", "password": "x" * 8}).headers}


def test_token_lifetime_is_at_most_one_day(client):
    tok = client.post("/api/auth/login", json={"email": "demo@qaab.ir", "password": "demo1234"}).json()["token"]
    client.cookies.clear()
    claims = jwt.decode(tok, SECRET_KEY, algorithms=["HS256"])
    assert claims["exp"] - claims["iat"] <= 86400


def test_tampered_or_unsigned_tokens_are_rejected(client):
    forged = jwt.encode({"sub": "1", "exp": 9999999999, "iat": 0}, "wrong-key", algorithm="HS256")
    assert client.get("/api/auth/me", headers={"Authorization": f"Bearer {forged}"}).status_code == 401
    unsigned = jwt.encode({"sub": "1", "exp": 9999999999, "iat": 0}, None, algorithm="none")
    assert client.get("/api/auth/me", headers={"Authorization": f"Bearer {unsigned}"}).status_code == 401


def test_login_sets_httponly_cookie_and_logout_clears_it(client):
    r = client.post("/api/auth/login", json={"email": "demo@qaab.ir", "password": "demo1234"})
    cookie = r.headers["set-cookie"].lower()
    assert "qaab_session=" in cookie and "httponly" in cookie and "samesite=lax" in cookie
    assert client.get("/api/auth/me").status_code == 200
    assert client.post("/api/auth/logout", headers=ORIGIN).status_code == 204
    client.cookies.clear()
    assert client.get("/api/auth/me").status_code == 401


def test_cookie_auth_requires_trusted_origin_on_writes(client):
    client.post("/api/auth/login", json={"email": "demo@qaab.ir", "password": "demo1234"})
    try:
        assert client.post("/api/photos/1/like", headers={"Origin": "https://evil.example"}).status_code == 403
        assert client.post("/api/photos/1/like").status_code == 403  # no Origin at all
        assert client.post("/api/photos/1/like", headers=ORIGIN).status_code == 200
    finally:
        client.cookies.clear()


def test_legacy_password_hash_is_upgraded_on_login(client):
    from sqlmodel import Session, select
    from app.models import User
    from app.security import _ITER, hash_password
    _, _ = register(client)
    with Session(engine) as s:
        u = s.exec(select(User).order_by(User.id.desc())).first()
        u.password_hash = hash_password("legacy pass 1", iterations=120_000)
        s.add(u); s.commit(); email = u.email
    login(client, email, "legacy pass 1")
    with Session(engine) as s:
        assert s.exec(select(User).where(User.email == email)).one().password_hash.split("$")[1] == str(_ITER)


# ---------- data exposure ----------
@pytest.mark.parametrize("path", ["/api/creators", "/api/photos?limit=5", "/api/creators/1", "/api/photos/1"])
def test_public_endpoints_do_not_leak_email_or_balance(client, path):
    body = client.get(path).text
    assert "@qaab.ir" not in body and '"balance"' not in body and '"email"' not in body


def test_me_still_returns_private_fields(client):
    _, h = register(client)
    me = client.get("/api/auth/me", headers=h).json()
    assert "email" in me and "balance" in me


# ---------- purchases / wallet ----------
def _photo_not_owned_by(client, user_id):
    return next(p for p in client.get("/api/photos?limit=50").json() if p["author"]["id"] != user_id)


def test_buy_rejects_unknown_license(client):
    h = login(client, "demo@qaab.ir", "demo1234")
    assert client.post("/api/photos/1/buy?license=platinum", headers=h).status_code == 422


def test_buy_debits_buyer_and_credits_seller_once(client):
    h = login(client, "demo@qaab.ir", "demo1234")
    me = client.get("/api/auth/me", headers=h).json()
    photo = _photo_not_owned_by(client, me["id"])
    r = client.post(f"/api/photos/{photo['id']}/buy?license=standard", headers=h)
    assert r.status_code == 200, r.text
    assert client.get("/api/auth/me", headers=h).json()["balance"] == me["balance"] - photo["price"]
    assert client.post(f"/api/photos/{photo['id']}/buy?license=standard", headers=h).status_code == 409


def test_buy_without_funds_is_refused_and_moves_no_money(client):
    user, h = register(client)
    photo = _photo_not_owned_by(client, user["user"]["id"])
    assert client.post(f"/api/photos/{photo['id']}/buy", headers=h).status_code == 402
    assert client.get("/api/auth/me", headers=h).json()["balance"] == 0


# ---------- uploads ----------
def _upload(client, h, data, name="x.png", ctype="image/png"):
    return client.post("/api/upload", headers=h, files={"file": (name, io.BytesIO(data), ctype)})


def test_upload_rejects_non_image_content(client):
    _, h = register(client)
    assert _upload(client, h, b"<html><body>hi</body></html>", "page.png").status_code == 415
    assert _upload(client, h, b"<svg xmlns='http://www.w3.org/2000/svg'/>", "a.svg", "image/svg+xml").status_code == 415


def test_upload_is_reencoded_with_server_chosen_name_and_safe_headers(client):
    _, h = register(client)
    r = _upload(client, h, png_bytes(), "../../evil name.html")
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["url"].startswith("/media/") and body["url"].endswith((".jpg", ".png", ".webp"))
    assert (body["width"], body["height"]) == (64, 48)
    media = client.get(body["url"])
    assert media.status_code == 200
    assert media.headers["x-content-type-options"] == "nosniff"
    assert "sandbox" in media.headers["content-security-policy"]


def test_upload_size_limit(client):
    _, h = register(client)
    assert _upload(client, h, b"\x89PNG" + b"0" * (13 * 1024 * 1024)).status_code == 413


def test_create_photo_only_accepts_own_uploads(client):
    _, owner = register(client)
    _, other = register(client)
    url = _upload(client, owner, png_bytes()).json()["url"]
    base = {"title": "t", "category": "nature", "price": 190000}
    assert client.post("/api/photos", headers=other, json={**base, "url": url}).status_code == 403
    assert client.post("/api/photos", headers=owner, json={**base, "url": "javascript:void(0)"}).status_code == 422
    assert client.post("/api/photos", headers=owner, json={**base, "url": "https://example.com/a.jpg"}).status_code == 422
    assert client.post("/api/photos", headers=owner, json={**base, "url": url}).status_code == 201
    assert client.post("/api/photos", headers=owner, json={**base, "url": url}).status_code == 409


@pytest.mark.parametrize("patch,code", [({"price": 0}, 422), ({"price": -5}, 422), ({"title": "x" * 500}, 422),
                                        ({"category": "nope"}, 422), ({"mission_id": 99999}, 404)])
def test_create_photo_validates_fields(client, patch, code):
    _, h = register(client)
    url = _upload(client, h, png_bytes()).json()["url"]
    body = {"title": "t", "category": "nature", "price": 190000, "url": url, **patch}
    assert client.post("/api/photos", headers=h, json=body).status_code == code


# ---------- query bounds ----------
@pytest.mark.parametrize("path", ["/api/photos?offset=-1", "/api/photos?limit=0", "/api/photos?limit=1000",
                                  "/api/creators?limit=100000", "/api/photos?q=" + "a" * 500])
def test_query_parameters_are_bounded(client, path):
    assert client.get(path).status_code == 422


def test_search_treats_like_wildcards_literally(client):
    assert client.get("/api/photos?q=%25").json() == []


# ---------- transport / headers / CORS ----------
def test_security_headers_on_api(client):
    h = client.get("/api/health").headers
    assert h["x-content-type-options"] == "nosniff"
    assert h["x-frame-options"] == "DENY"
    assert h["referrer-policy"] == "no-referrer"
    assert "frame-ancestors 'none'" in h["content-security-policy"]


def test_private_responses_are_not_cached(client):
    _, h = register(client)
    assert client.get("/api/auth/me", headers=h).headers["cache-control"] == "no-store"


def test_cors_only_allows_configured_origin(client):
    ok = client.get("/api/health", headers=ORIGIN).headers
    bad = client.get("/api/health", headers={"Origin": "https://evil.example"}).headers
    assert ok["access-control-allow-origin"] == "http://localhost:3041"
    assert "access-control-allow-origin" not in bad


def test_likes_are_unique_per_user(client):
    _, h = register(client)
    first = client.post("/api/photos/2/like", headers=h).json()
    second = client.post("/api/photos/2/like", headers=h).json()
    assert first["liked"] and not second["liked"] and second["likes"] == first["likes"] - 1


# ---------- performance guard ----------
def test_photo_list_has_no_n_plus_one(client):
    _, h = register(client)
    seen = []
    listener = lambda *a, **k: seen.append(1)  # noqa: E731
    event.listen(engine, "before_cursor_execute", listener)
    try:
        assert len(client.get("/api/photos?limit=24", headers=h).json()) == 24
    finally:
        event.remove(engine, "before_cursor_execute", listener)
    assert len(seen) <= 5


# ---------- follow-ups from the verification review ----------
def test_browser_login_gets_no_readable_token(client):
    r = client.post("/api/auth/login", json={"email": "demo@qaab.ir", "password": "demo1234"}, headers=ORIGIN)
    client.cookies.clear()
    assert r.status_code == 200 and r.json()["token"] is None


def test_legacy_sample_accounts_are_locked(client):
    from sqlmodel import Session, select
    from app.models import User
    from app.security import hash_password
    from app.seed import lock_sample_accounts
    with Session(engine) as s:  # an old database still holding the published sample password
        u = s.exec(select(User).where(User.email == "arash@qaab.ir")).one()
        u.password_hash = hash_password("qaab1234", iterations=120_000)
        s.add(u); s.commit()
    lock_sample_accounts(include_demo=False)
    assert client.post("/api/auth/login", json={"email": "arash@qaab.ir", "password": "qaab1234"}).status_code == 401


def test_legacy_public_upload_becomes_private(client):
    from sqlmodel import Session
    from app.api import migrate_legacy_uploads
    from app.config import MEDIA_DIR, ORIGINALS_DIR
    from app.models import Photo
    (MEDIA_DIR / "legacyfile.png").write_bytes(png_bytes())
    with Session(engine) as s:
        p = Photo(owner_id=1, title="old", url="/media/legacyfile.png", thumb="/media/legacyfile.png")
        s.add(p); s.commit(); s.refresh(p); pid = p.id
        migrate_legacy_uploads(s)
        p = s.get(Photo, pid)
    assert not (MEDIA_DIR / "legacyfile.png").exists()
    assert p.url.endswith(".jpg") and (ORIGINALS_DIR / p.url.split("/")[-1]).is_file()


def test_camera_jpeg_with_embedded_preview_is_accepted(client):
    from PIL import Image
    _, h = register(client)
    buf = io.BytesIO()
    Image.new("RGB", (40, 30)).save(buf, "MPO", save_all=True, append_images=[Image.new("RGB", (20, 15))])
    assert _upload(client, h, buf.getvalue(), "camera.jpg", "image/jpeg").status_code == 200


def test_pending_uploads_are_capped(client):
    _, h = register(client)
    codes = [_upload(client, h, png_bytes(8, 8)).status_code for _ in range(21)]
    assert codes[:20] == [200] * 20 and codes[20] == 429


def test_original_download_is_owner_or_buyer_only(client):
    _, owner = register(client)
    _, stranger = register(client)
    url = _upload(client, owner, png_bytes()).json()["url"]
    pid = client.post("/api/photos", headers=owner, json={"title": "t", "price": 10000, "url": url}).json()["id"]
    got = client.get(f"/api/photos/{pid}/download", headers=owner)
    assert got.status_code == 200 and got.headers["content-type"] == "image/jpeg"
    assert client.get(f"/api/photos/{pid}/download", headers=stranger).status_code == 403
    buyer = login(client, "demo@qaab.ir", "demo1234")
    assert client.post(f"/api/photos/{pid}/buy", headers=buyer).status_code == 200
    assert client.get(f"/api/photos/{pid}/download", headers=buyer).status_code == 200


def test_health_reports_demo_mode(client):
    assert client.get("/api/health").json()["demo"] is True
