from datetime import datetime
from typing import Annotated, List, Optional

from pydantic import AfterValidator, BaseModel, ConfigDict, EmailStr, Field, StringConstraints

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
_SLUGS = {c["slug"] for c in CATEGORIES}


def _category(v: str) -> str:
    if v not in _SLUGS:
        raise ValueError("unknown category")
    return v


Email = Annotated[EmailStr, AfterValidator(str.lower)]
Text = Annotated[str, StringConstraints(strip_whitespace=True)]


class Strict(BaseModel):
    model_config = ConfigDict(extra="forbid")  # unknown fields (e.g. "role") are rejected, not ignored


class RegisterIn(Strict):
    name: Annotated[Text, Field(min_length=1, max_length=80)]
    email: Email
    password: str = Field(min_length=8, max_length=128)


class LoginIn(Strict):
    email: Email
    password: str = Field(min_length=1, max_length=128)


class PublicUserOut(BaseModel):
    id: int
    name: str
    avatar: str
    bio: str
    city: str
    role: str


class UserOut(PublicUserOut):
    """Private view: only ever returned to the account owner."""
    email: str
    balance: int


class AuthOut(BaseModel):
    token: Optional[str] = None  # only for non-browser API clients; the web app uses the httpOnly cookie
    user: UserOut


class PhotoOut(BaseModel):
    id: int
    title: str
    title_fa: str
    description: str
    url: str
    thumb: str
    category: str
    tags: List[str] = []
    price: int
    width: int
    height: int
    likes: int
    sales: int
    featured: bool
    created_at: datetime
    author: Optional[PublicUserOut] = None
    liked: bool = False
    can_download: bool = False
    licenses: List[str] = []  # licenses the viewer already owns (detail views only)


class PhotoIn(Strict):
    title: Annotated[Text, Field(min_length=1, max_length=120)]
    title_fa: Annotated[Text, Field(max_length=120)] = ""
    description: Annotated[Text, Field(max_length=2000)] = ""
    # Only the caller's own processed upload; external or scripted URLs are refused.
    url: str = Field(pattern=r"^/media/[0-9a-f]{32}\.jpg$")
    category: Annotated[str, AfterValidator(_category)] = "nature"
    tags: List[Annotated[Text, Field(min_length=1, max_length=30)]] = Field(default_factory=list, max_length=15)
    price: int = Field(190000, ge=10_000, le=500_000_000)
    mission_id: Optional[int] = None


class UploadOut(BaseModel):
    url: str
    thumb: str
    width: int
    height: int


class MissionOut(BaseModel):
    id: int
    brand: str
    brand_logo: str
    title: str
    title_fa: str
    brief: str
    brief_fa: str
    cover: str
    reward: int
    category: str
    deadline: datetime
    submissions: int
    is_open: bool


class PurchaseOut(BaseModel):
    id: int
    amount: int
    license: str
    created_at: datetime
    photo: PhotoOut


class Stats(BaseModel):
    photos: int
    creators: int
    missions: int
    paid_out: int
