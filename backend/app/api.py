import shutil
import uuid
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from sqlmodel import Session, func, select

from .config import CREATOR_SHARE, MEDIA_DIR
from .db import get_session
from .models import Like, Mission, Photo, Purchase, User
from .schemas import (AuthOut, LoginIn, MissionOut, PhotoIn, PhotoOut,
                      PurchaseOut, RegisterIn, Stats, UserOut)
from .security import (create_token, current_user, get_user_by_email,
                       hash_password, optional_user, verify_password)

router = APIRouter(prefix="/api")

CATEGORIES = [
    {"slug": "nature", "en": "Nature", "fa": "طبیعت", "icon": "leaf"},
    {"slug": "city", "en": "City & Street", "fa": "شهر و خیابان", "icon": "building"},
    {"slug": "food", "en": "Food", "fa": "خوراک", "icon": "utensils"},
    {"slug": "people", "en": "People", "fa": "مردم", "icon": "users"},
    {"slug": "lifestyle", "en": "Lifestyle", "fa": "سبک زندگی", "icon": "sparkles"},
    {"slug": "business", "en": "Business", "fa": "کسب‌وکار", "icon": "briefcase"},
    {"slug": "travel", "en": "Travel", "fa": "سفر", "icon": "plane"},
    {"slug": "abstract", "en": "Abstract", "fa": "انتزاعی", "icon": "shapes"},
]


def user_out(u: User) -> UserOut:
    return UserOut(**u.model_dump())


def photo_out(session: Session, p: Photo, viewer: Optional[User] = None) -> PhotoOut:
    author = session.get(User, p.owner_id)
    liked = False
    if viewer:
        liked = session.exec(
            select(Like).where(Like.user_id == viewer.id, Like.photo_id == p.id)
        ).first() is not None
    data = p.model_dump()
    data["tags"] = [t for t in (p.tags or "").split(",") if t]
    return PhotoOut(**data, author=user_out(author) if author else None, liked=liked)


# ---------- auth ----------
@router.post("/auth/register", response_model=AuthOut)
def register(body: RegisterIn, session: Session = Depends(get_session)):
    if get_user_by_email(session, body.email):
        raise HTTPException(409, "این ایمیل قبلاً ثبت شده است | Email already registered")
    user = User(
        name=body.name,
        email=body.email,
        password_hash=hash_password(body.password),
        role=body.role,
        avatar=f"https://i.pravatar.cc/160?u={body.email}",
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return AuthOut(token=create_token(user.id), user=user_out(user))


@router.post("/auth/login", response_model=AuthOut)
def login(body: LoginIn, session: Session = Depends(get_session)):
    user = get_user_by_email(session, body.email)
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(401, "ایمیل یا رمز عبور نادرست است | Wrong email or password")
    return AuthOut(token=create_token(user.id), user=user_out(user))


@router.get("/auth/me", response_model=UserOut)
def me(user: User = Depends(current_user)):
    return user_out(user)


# ---------- catalog ----------
@router.get("/categories")
def categories():
    return CATEGORIES


@router.get("/stats", response_model=Stats)
def stats(session: Session = Depends(get_session)):
    paid = session.exec(select(func.coalesce(func.sum(Purchase.creator_earning), 0))).one()
    return Stats(
        photos=session.exec(select(func.count(Photo.id))).one(),
        creators=session.exec(select(func.count(User.id))).one(),
        missions=session.exec(select(func.count(Mission.id))).one(),
        paid_out=int(paid) + 4_820_000_000,
    )


@router.get("/photos", response_model=List[PhotoOut])
def list_photos(
    q: str = "",
    category: str = "",
    sort: str = "trending",
    featured: Optional[bool] = None,
    owner_id: Optional[int] = None,
    limit: int = Query(24, le=100),
    offset: int = 0,
    session: Session = Depends(get_session),
    viewer: Optional[User] = Depends(optional_user),
):
    stmt = select(Photo)
    if q:
        like = f"%{q}%"
        stmt = stmt.where(
            (Photo.title.ilike(like)) | (Photo.title_fa.ilike(like)) | (Photo.tags.ilike(like))
        )
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
    rows = session.exec(stmt.order_by(order).offset(offset).limit(limit)).all()
    return [photo_out(session, p, viewer) for p in rows]


@router.get("/photos/{photo_id}", response_model=PhotoOut)
def get_photo(photo_id: int, session: Session = Depends(get_session),
              viewer: Optional[User] = Depends(optional_user)):
    photo = session.get(Photo, photo_id)
    if not photo:
        raise HTTPException(404, "عکس یافت نشد | Photo not found")
    return photo_out(session, photo, viewer)


@router.post("/photos", response_model=PhotoOut, status_code=201)
def create_photo(body: PhotoIn, session: Session = Depends(get_session),
                 user: User = Depends(current_user)):
    photo = Photo(
        owner_id=user.id,
        title=body.title,
        title_fa=body.title_fa,
        description=body.description,
        url=body.url,
        thumb=body.url,
        category=body.category,
        tags=",".join(body.tags),
        price=body.price,
        mission_id=body.mission_id,
    )
    session.add(photo)
    if body.mission_id:
        mission = session.get(Mission, body.mission_id)
        if mission:
            mission.submissions += 1
            session.add(mission)
    session.commit()
    session.refresh(photo)
    return photo_out(session, photo, user)


@router.post("/photos/{photo_id}/like")
def toggle_like(photo_id: int, session: Session = Depends(get_session),
                user: User = Depends(current_user)):
    photo = session.get(Photo, photo_id)
    if not photo:
        raise HTTPException(404, "عکس یافت نشد | Photo not found")
    existing = session.exec(
        select(Like).where(Like.user_id == user.id, Like.photo_id == photo_id)
    ).first()
    if existing:
        session.delete(existing)
        photo.likes = max(0, photo.likes - 1)
        liked = False
    else:
        session.add(Like(user_id=user.id, photo_id=photo_id))
        photo.likes += 1
        liked = True
    session.add(photo)
    session.commit()
    return {"liked": liked, "likes": photo.likes}


@router.post("/photos/{photo_id}/buy", response_model=PurchaseOut)
def buy_photo(photo_id: int, license: str = "standard",
              session: Session = Depends(get_session), user: User = Depends(current_user)):
    photo = session.get(Photo, photo_id)
    if not photo:
        raise HTTPException(404, "عکس یافت نشد | Photo not found")
    if photo.owner_id == user.id:
        raise HTTPException(400, "نمی‌توانید عکس خودتان را بخرید | You own this photo")
    amount = photo.price * (3 if license == "extended" else 1)
    earning = int(amount * CREATOR_SHARE)
    purchase = Purchase(buyer_id=user.id, photo_id=photo.id, amount=amount,
                        creator_earning=earning, license=license)
    photo.sales += 1
    owner = session.get(User, photo.owner_id)
    if owner:
        owner.balance += earning
        session.add(owner)
    session.add_all([purchase, photo])
    session.commit()
    session.refresh(purchase)
    return PurchaseOut(id=purchase.id, amount=purchase.amount, license=purchase.license,
                       created_at=purchase.created_at, photo=photo_out(session, photo, user))


@router.get("/purchases", response_model=List[PurchaseOut])
def my_purchases(session: Session = Depends(get_session), user: User = Depends(current_user)):
    rows = session.exec(
        select(Purchase).where(Purchase.buyer_id == user.id).order_by(Purchase.created_at.desc())
    ).all()
    out = []
    for p in rows:
        photo = session.get(Photo, p.photo_id)
        if photo:
            out.append(PurchaseOut(id=p.id, amount=p.amount, license=p.license,
                                   created_at=p.created_at, photo=photo_out(session, photo, user)))
    return out


@router.get("/me/earnings")
def earnings(session: Session = Depends(get_session), user: User = Depends(current_user)):
    photos = session.exec(select(Photo).where(Photo.owner_id == user.id)).all()
    ids = [p.id for p in photos]
    sold = session.exec(select(Purchase).where(Purchase.photo_id.in_(ids))).all() if ids else []
    return {
        "balance": user.balance,
        "photos": len(photos),
        "sales": len(sold),
        "likes": sum(p.likes for p in photos),
        "revenue": sum(s.creator_earning for s in sold),
    }


# ---------- missions ----------
@router.get("/missions", response_model=List[MissionOut])
def list_missions(open_only: bool = False, limit: int = Query(20, le=60),
                  session: Session = Depends(get_session)):
    stmt = select(Mission).order_by(Mission.deadline.asc()).limit(limit)
    if open_only:
        stmt = stmt.where(Mission.is_open == True)  # noqa: E712
    return session.exec(stmt).all()


@router.get("/missions/{mission_id}", response_model=MissionOut)
def get_mission(mission_id: int, session: Session = Depends(get_session)):
    mission = session.get(Mission, mission_id)
    if not mission:
        raise HTTPException(404, "مأموریت یافت نشد | Mission not found")
    return mission


@router.get("/missions/{mission_id}/photos", response_model=List[PhotoOut])
def mission_photos(mission_id: int, session: Session = Depends(get_session),
                   viewer: Optional[User] = Depends(optional_user)):
    rows = session.exec(
        select(Photo).where(Photo.mission_id == mission_id).order_by(Photo.likes.desc())
    ).all()
    return [photo_out(session, p, viewer) for p in rows]


# ---------- creators ----------
@router.get("/creators", response_model=List[UserOut])
def creators(limit: int = 8, session: Session = Depends(get_session)):
    rows = session.exec(select(User).where(User.role == "creator").limit(limit)).all()
    return [user_out(u) for u in rows]


@router.get("/creators/{user_id}")
def creator_profile(user_id: int, session: Session = Depends(get_session)):
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(404, "کاربر یافت نشد | User not found")
    photos = session.exec(select(Photo).where(Photo.owner_id == user_id)).all()
    return {"user": user_out(user), "photos": [photo_out(session, p) for p in photos]}


# ---------- upload ----------
@router.post("/upload")
def upload(file: UploadFile = File(...), user: User = Depends(current_user)):
    ext = (file.filename or "img.jpg").split(".")[-1].lower()[:5]
    name = f"{uuid.uuid4().hex}.{ext}"
    with open(MEDIA_DIR / name, "wb") as fh:
        shutil.copyfileobj(file.file, fh)
    return {"url": f"/media/{name}"}
