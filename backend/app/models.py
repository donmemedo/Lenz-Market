from datetime import datetime, timezone
from typing import Optional

from sqlmodel import Field, SQLModel


def now() -> datetime:
    return datetime.now(timezone.utc)


class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(index=True, unique=True)
    name: str
    password_hash: str
    avatar: str = ""
    bio: str = ""
    city: str = ""
    role: str = "creator"  # creator | brand | admin — never client-settable
    balance: int = 0       # تومان
    token_version: int = 0  # bump to revoke every issued session
    created_at: datetime = Field(default_factory=now)


class Photo(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    owner_id: int = Field(foreign_key="user.id", index=True)
    title: str
    title_fa: str = ""
    description: str = ""
    url: str
    thumb: str = ""
    category: str = Field(default="nature", index=True)
    tags: str = ""
    price: int = 190000          # تومان
    width: int = 1600
    height: int = 1100
    likes: int = 0
    sales: int = 0
    featured: bool = False
    mission_id: Optional[int] = Field(default=None, foreign_key="mission.id", index=True)
    created_at: datetime = Field(default_factory=now)


class Upload(SQLModel, table=True):
    """A processed image owned by one user; a Photo may only be created from its own Upload."""
    id: Optional[int] = Field(default=None, primary_key=True)
    owner_id: int = Field(foreign_key="user.id", index=True)
    key: str = Field(index=True, unique=True)  # random hex naming /media/<key>.jpg and <key>_t.jpg
    width: int
    height: int
    created_at: datetime = Field(default_factory=now)


class Mission(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    brand: str
    brand_logo: str = ""
    title: str
    title_fa: str = ""
    brief: str = ""
    brief_fa: str = ""
    cover: str = ""
    reward: int = 12000000
    category: str = "lifestyle"
    deadline: datetime = Field(default_factory=now)
    submissions: int = 0
    is_open: bool = True
    created_at: datetime = Field(default_factory=now)


class Purchase(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    buyer_id: int = Field(foreign_key="user.id", index=True)
    photo_id: int = Field(foreign_key="photo.id", index=True)
    amount: int
    creator_earning: int = 0
    license: str = "standard"
    created_at: datetime = Field(default_factory=now)


class Like(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    photo_id: int = Field(foreign_key="photo.id", index=True)
