import io
import re
import uuid
from typing import List, Literal, Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, Request, Response, UploadFile
from fastapi.responses import FileResponse, RedirectResponse
from PIL import Image, ImageOps
from sqlalchemy import update
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, func, select

from .config import CREATOR_SHARE_PCT, MEDIA_DIR, ORIGINALS_DIR
from .db import get_session
from .models import Like, Mission, Photo, Purchase, Upload, User, now
from .schemas import (CATEGORIES, AuthOut, LoginIn, MissionOut, PhotoIn, PhotoOut, PublicUserOut,
                      PurchaseOut, RegisterIn, Stats, UploadOut, UserOut)
from .security import (LIMITS, clear_session_cookie, client_ip, create_token, current_user, dummy_hash,
                       get_user_by_email, hash_password, needs_rehash, optional_user, set_session_cookie,
                       verify_password)

router = APIRouter(prefix="/api")

MAX_UPLOAD = 12 * 1024 * 1024
MAX_PIXELS = 50_000_000
Image.MAX_IMAGE_PIXELS = MAX_PIXELS  # Pillow refuses decompression bombs above 2x this
_UPLOAD_URL = re.compile(r"^/media/([0-9a-f]{32})\.jpg$")
LICENSE_MULTIPLIER = {"standard": 1, "extended": 3}
MISSION_ENTRIES_PER_USER = 10


def photo_outs(session: Session, photos: List[Photo], viewer: Optional[User] = None,
               downloads: bool = False) -> List[PhotoOut]:
    """Serialize a page of photos with 1 author query + 1 like query, never one per photo."""
    if not photos:
        return []
    ids = [p.id for p in photos]
    authors = {u.id: u for u in session.exec(select(User).where(User.id.in_({p.owner_id for p in photos})))}
    liked, bought = set(), set()
    if viewer:
        liked = set(session.exec(select(Like.photo_id).where(Like.user_id == viewer.id, Like.photo_id.in_(ids))))
        if downloads:
            bought = set(session.exec(select(Purchase.photo_id).where(Purchase.buyer_id == viewer.id,
                                                                      Purchase.photo_id.in_(ids))))
    out = []
    for p in photos:
        a = authors.get(p.owner_id)
        out.append(PhotoOut(
            **p.model_dump(exclude={"tags"}),
            tags=[t for t in (p.tags or "").split(",") if t],
            author=PublicUserOut(**a.model_dump()) if a else None,
            liked=p.id in liked,
            can_download=bool(viewer) and (p.owner_id == viewer.id or p.id in bought),
        ))
    return out


def _session_response(response: Response, user: User) -> AuthOut:
    token = create_token(user)
    set_session_cookie(response, token)
    return AuthOut(token=token, user=UserOut(**user.model_dump()))


# ---------- auth ----------
@router.post("/auth/register", response_model=AuthOut)
def register(body: RegisterIn, request: Request, response: Response, session: Session = Depends(get_session)):
    LIMITS["register_ip"].hit(client_ip(request))
    taken = HTTPException(409, "این ایمیل قبلاً ثبت شده است | Email already registered")
    if get_user_by_email(session, body.email):
        raise taken
    user = User(name=body.name, email=body.email, password_hash=hash_password(body.password),
                avatar=f"https://i.pravatar.cc/160?u={uuid.uuid4().hex}")  # never put the email in a third-party URL
    session.add(user)
    try:
        session.commit()
    except IntegrityError:
        session.rollback()
        raise taken
    session.refresh(user)
    return _session_response(response, user)


@router.post("/auth/login", response_model=AuthOut)
def login(body: LoginIn, request: Request, response: Response, session: Session = Depends(get_session)):
    LIMITS["login_ip"].hit(client_ip(request))
    LIMITS["login_fail"].check(body.email)
    user = get_user_by_email(session, body.email)
    ok = verify_password(body.password, user.password_hash if user else dummy_hash())
    if not (user and ok):
        LIMITS["login_fail"].add(body.email)
        raise HTTPException(401, "ایمیل یا رمز عبور نادرست است | Wrong email or password")
    if needs_rehash(user.password_hash):
        user.password_hash = hash_password(body.password)
        session.add(user)
        session.commit()
        session.refresh(user)
    return _session_response(response, user)


@router.post("/auth/logout", status_code=204)
def logout(response: Response, session: Session = Depends(get_session), user: User = Depends(current_user)):
    # Revokes every session of this account, not just the current browser.
    session.execute(update(User).where(User.id == user.id).values(token_version=User.token_version + 1))
    session.commit()
    clear_session_cookie(response)


@router.get("/auth/me", response_model=UserOut)
def me(user: User = Depends(current_user)):
    return UserOut(**user.model_dump())


# ---------- catalog ----------
@router.get("/categories")
def categories():
    return CATEGORIES


@router.get("/stats", response_model=Stats)
def stats(session: Session = Depends(get_session)):
    return Stats(
        photos=session.exec(select(func.count(Photo.id))).one(),
        creators=session.exec(select(func.count(User.id)).where(User.role == "creator")).one(),
        missions=session.exec(select(func.count(Mission.id))).one(),
        paid_out=session.exec(select(func.coalesce(func.sum(Purchase.creator_earning), 0))).one(),
    )


@router.get("/photos", response_model=List[PhotoOut])
def list_photos(
    q: str = Query("", max_length=100),
    category: str = Query("", max_length=20),
    sort: str = "trending",
    featured: Optional[bool] = None,
    owner_id: Optional[int] = None,
    limit: int = Query(24, ge=1, le=100),
    offset: int = Query(0, ge=0, le=10_000),
    session: Session = Depends(get_session),
    viewer: Optional[User] = Depends(optional_user),
):
    stmt = select(Photo)
    if q:
        like = "%" + q.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%"
        stmt = stmt.where(Photo.title.ilike(like, escape="\\") | Photo.title_fa.ilike(like, escape="\\")
                          | Photo.tags.ilike(like, escape="\\"))
    if category:
        stmt = stmt.where(Photo.category == category)
    if featured is not None:
        stmt = stmt.where(Photo.featured == featured)
    if owner_id:
        stmt = stmt.where(Photo.owner_id == owner_id)
    order = {
        "trending": Photo.likes.desc(),
        "newest": Photo.created_at.desc(),
        "price_low": Photo.price.asc(),
        "price_high": Photo.price.desc(),
        "popular": Photo.sales.desc(),
    }.get(sort, Photo.likes.desc())
    rows = session.exec(stmt.order_by(order, Photo.id.desc()).offset(offset).limit(limit)).all()
    return photo_outs(session, rows, viewer)


@router.get("/photos/{photo_id}", response_model=PhotoOut)
def get_photo(photo_id: int, session: Session = Depends(get_session),
              viewer: Optional[User] = Depends(optional_user)):
    photo = session.get(Photo, photo_id)
    if not photo:
        raise HTTPException(404, "عکس یافت نشد | Photo not found")
    return photo_outs(session, [photo], viewer, downloads=True)[0]


@router.post("/photos", response_model=PhotoOut, status_code=201)
def create_photo(body: PhotoIn, session: Session = Depends(get_session), user: User = Depends(current_user)):
    key = _UPLOAD_URL.match(body.url).group(1)
    up = session.exec(select(Upload).where(Upload.key == key)).first()
    if not up:
        raise HTTPException(404, "فایل بارگذاری‌شده یافت نشد | Upload not found")
    if up.owner_id != user.id:
        raise HTTPException(403, "این فایل متعلق به شما نیست | Not your upload")
    if session.exec(select(Photo.id).where(Photo.url == body.url)).first():
        raise HTTPException(409, "این عکس قبلاً ثبت شده است | Already published")
    if body.mission_id is not None:
        mission = session.get(Mission, body.mission_id)
        if not mission:
            raise HTTPException(404, "مأموریت یافت نشد | Mission not found")
        if not mission.is_open or mission.deadline < now():
            raise HTTPException(409, "مهلت این مأموریت تمام شده است | Mission closed")
        entries = session.exec(select(func.count(Photo.id)).where(
            Photo.owner_id == user.id, Photo.mission_id == mission.id)).one()
        if entries >= MISSION_ENTRIES_PER_USER:
            raise HTTPException(409, "سقف ارسال برای این مأموریت پر شده است | Entry limit reached")
        session.execute(update(Mission).where(Mission.id == mission.id)
                        .values(submissions=Mission.submissions + 1))
    photo = Photo(owner_id=user.id, title=body.title, title_fa=body.title_fa, description=body.description,
                  url=body.url, thumb=f"/media/{key}_t.jpg", width=up.width, height=up.height,
                  category=body.category, tags=",".join(t.replace(",", " ") for t in body.tags),
                  price=body.price, mission_id=body.mission_id)
    session.add(photo)
    session.commit()
    session.refresh(photo)
    return photo_outs(session, [photo], user)[0]


@router.post("/photos/{photo_id}/like")
def toggle_like(photo_id: int, session: Session = Depends(get_session), user: User = Depends(current_user)):
    photo = session.get(Photo, photo_id)
    if not photo:
        raise HTTPException(404, "عکس یافت نشد | Photo not found")
    existing = session.exec(select(Like).where(Like.user_id == user.id, Like.photo_id == photo_id)).first()
    if existing:
        session.delete(existing)
    else:
        session.add(Like(user_id=user.id, photo_id=photo_id))
    delta = -1 if existing else 1
    session.execute(update(Photo).where(Photo.id == photo_id).values(likes=Photo.likes + delta))
    try:
        session.commit()
    except IntegrityError:  # a parallel request already liked it (unique index)
        session.rollback()
        raise HTTPException(409, "دوباره امتحان کنید | Please retry")
    session.refresh(photo)
    return {"liked": not existing, "likes": photo.likes}


@router.post("/photos/{photo_id}/buy", response_model=PurchaseOut)
def buy_photo(photo_id: int, license: Literal["standard", "extended"] = "standard",
              session: Session = Depends(get_session), user: User = Depends(current_user)):
    LIMITS["buy_user"].hit(str(user.id))
    photo = session.get(Photo, photo_id)
    if not photo:
        raise HTTPException(404, "عکس یافت نشد | Photo not found")
    if photo.owner_id == user.id:
        raise HTTPException(400, "نمی‌توانید عکس خودتان را بخرید | You own this photo")
    already = HTTPException(409, "این مجوز را قبلاً خریده‌اید | Already purchased")
    if session.exec(select(Purchase.id).where(Purchase.buyer_id == user.id, Purchase.photo_id == photo_id,
                                              Purchase.license == license)).first():
        raise already
    amount = photo.price * LICENSE_MULTIPLIER[license]
    earning = amount * CREATOR_SHARE_PCT // 100
    # Conditional, atomic debit: no overdraft even with concurrent purchases.
    debit = session.execute(update(User).where(User.id == user.id, User.balance >= amount)
                            .values(balance=User.balance - amount))
    if debit.rowcount != 1:
        session.rollback()
        raise HTTPException(402, "موجودی کیف پول کافی نیست | Insufficient wallet balance")
    session.execute(update(User).where(User.id == photo.owner_id).values(balance=User.balance + earning))
    session.execute(update(Photo).where(Photo.id == photo_id).values(sales=Photo.sales + 1))
    purchase = Purchase(buyer_id=user.id, photo_id=photo_id, amount=amount, creator_earning=earning, license=license)
    session.add(purchase)
    try:
        session.commit()
    except IntegrityError:  # parallel duplicate purchase hit ux_purchase; the debit rolls back too
        session.rollback()
        raise already
    session.refresh(purchase)
    session.refresh(photo)
    return PurchaseOut(id=purchase.id, amount=purchase.amount, license=purchase.license,
                       created_at=purchase.created_at, photo=photo_outs(session, [photo], user, downloads=True)[0])


@router.get("/photos/{photo_id}/download")
def download(photo_id: int, session: Session = Depends(get_session), user: User = Depends(current_user)):
    photo = session.get(Photo, photo_id)
    if not photo:
        raise HTTPException(404, "عکس یافت نشد | Photo not found")
    if photo.owner_id != user.id and not session.exec(
            select(Purchase.id).where(Purchase.buyer_id == user.id, Purchase.photo_id == photo_id)).first():
        raise HTTPException(403, "ابتدا مجوز این عکس را بخرید | Purchase required")
    m = _UPLOAD_URL.match(photo.url)
    if m and (ORIGINALS_DIR / f"{m.group(1)}.jpg").is_file():
        return FileResponse(ORIGINALS_DIR / f"{m.group(1)}.jpg", media_type="image/jpeg",
                            filename=f"qaab-{photo.id}.jpg")
    if photo.url.startswith("https://"):  # demo catalogue images hosted elsewhere
        return RedirectResponse(photo.url)
    raise HTTPException(404, "فایل اصلی در دسترس نیست | Original not available")


@router.get("/purchases", response_model=List[PurchaseOut])
def my_purchases(session: Session = Depends(get_session), user: User = Depends(current_user)):
    rows = session.exec(select(Purchase).where(Purchase.buyer_id == user.id)
                        .order_by(Purchase.created_at.desc()).limit(200)).all()
    photos = {p.id: p for p in session.exec(select(Photo).where(Photo.id.in_({r.photo_id for r in rows})))}
    outs = {o.id: o for o in photo_outs(session, list(photos.values()), user, downloads=True)}
    return [PurchaseOut(id=r.id, amount=r.amount, license=r.license, created_at=r.created_at, photo=outs[r.photo_id])
            for r in rows if r.photo_id in outs]


@router.get("/me/earnings")
def earnings(session: Session = Depends(get_session), user: User = Depends(current_user)):
    photos, likes = session.exec(select(func.count(Photo.id), func.coalesce(func.sum(Photo.likes), 0))
                                 .where(Photo.owner_id == user.id)).one()
    sales, revenue = session.exec(
        select(func.count(Purchase.id), func.coalesce(func.sum(Purchase.creator_earning), 0))
        .join(Photo, Photo.id == Purchase.photo_id).where(Photo.owner_id == user.id)).one()
    return {"balance": user.balance, "photos": photos, "sales": sales, "likes": likes, "revenue": revenue}


# ---------- missions ----------
@router.get("/missions", response_model=List[MissionOut])
def list_missions(open_only: bool = False, limit: int = Query(20, ge=1, le=60),
                  session: Session = Depends(get_session)):
    stmt = select(Mission)
    if open_only:
        stmt = stmt.where(Mission.is_open == True)  # noqa: E712
    return session.exec(stmt.order_by(Mission.deadline.asc()).limit(limit)).all()


@router.get("/missions/{mission_id}", response_model=MissionOut)
def get_mission(mission_id: int, session: Session = Depends(get_session)):
    mission = session.get(Mission, mission_id)
    if not mission:
        raise HTTPException(404, "مأموریت یافت نشد | Mission not found")
    return mission


@router.get("/missions/{mission_id}/photos", response_model=List[PhotoOut])
def mission_photos(mission_id: int, limit: int = Query(48, ge=1, le=100), session: Session = Depends(get_session),
                   viewer: Optional[User] = Depends(optional_user)):
    rows = session.exec(select(Photo).where(Photo.mission_id == mission_id)
                        .order_by(Photo.likes.desc()).limit(limit)).all()
    return photo_outs(session, rows, viewer)


# ---------- creators ----------
@router.get("/creators", response_model=List[PublicUserOut])
def creators(limit: int = Query(8, ge=1, le=50), session: Session = Depends(get_session)):
    return session.exec(select(User).where(User.role == "creator").order_by(User.id).limit(limit)).all()


@router.get("/creators/{user_id}")
def creator_profile(user_id: int, session: Session = Depends(get_session),
                    viewer: Optional[User] = Depends(optional_user)):
    user = session.get(User, user_id)
    if not user or user.role != "creator":
        raise HTTPException(404, "کاربر یافت نشد | User not found")
    photos = session.exec(select(Photo).where(Photo.owner_id == user_id)
                          .order_by(Photo.created_at.desc()).limit(100)).all()
    return {"user": PublicUserOut(**user.model_dump()), "photos": photo_outs(session, photos, viewer)}


# ---------- upload ----------
@router.post("/upload", response_model=UploadOut)
def upload(file: UploadFile = File(...), session: Session = Depends(get_session),
           user: User = Depends(current_user)):
    LIMITS["upload_user"].hit(str(user.id))
    data = file.file.read(MAX_UPLOAD + 1)
    if len(data) > MAX_UPLOAD:
        raise HTTPException(413, "حجم فایل بیش از ۱۲ مگابایت است | File larger than 12 MB")
    unsupported = HTTPException(415, "فقط عکس JPEG، PNG یا WebP | Only JPEG, PNG or WebP images")
    try:
        src = Image.open(io.BytesIO(data))
        if src.format not in {"JPEG", "PNG", "WEBP"}:
            raise unsupported
        if src.width * src.height > MAX_PIXELS:
            raise HTTPException(413, "ابعاد عکس بیش از حد بزرگ است | Image dimensions too large")
        # Full decode + re-encode: drops EXIF/GPS location and anything appended to the file.
        img = ImageOps.exif_transpose(src).convert("RGB")
    except HTTPException:
        raise
    except (OSError, ValueError, SyntaxError, Image.DecompressionBombError):
        raise unsupported
    key = uuid.uuid4().hex
    img.save(ORIGINALS_DIR / f"{key}.jpg", "JPEG", quality=95)
    preview = img.copy()
    preview.thumbnail((1280, 1280))
    preview.save(MEDIA_DIR / f"{key}.jpg", "JPEG", quality=82, progressive=True, optimize=True)
    preview.thumbnail((640, 640))
    preview.save(MEDIA_DIR / f"{key}_t.jpg", "JPEG", quality=78, progressive=True, optimize=True)
    session.add(Upload(owner_id=user.id, key=key, width=img.width, height=img.height))
    session.commit()
    return UploadOut(url=f"/media/{key}.jpg", thumb=f"/media/{key}_t.jpg", width=img.width, height=img.height)
