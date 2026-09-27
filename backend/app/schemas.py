from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, EmailStr


class RegisterIn(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: str = "creator"


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    name: str
    email: str
    avatar: str
    bio: str
    city: str
    role: str
    balance: int


class AuthOut(BaseModel):
    token: str
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
    author: Optional[UserOut] = None
    liked: bool = False


class PhotoIn(BaseModel):
    title: str
    title_fa: str = ""
    description: str = ""
    url: str
    category: str = "nature"
    tags: List[str] = []
    price: int = 190000
    mission_id: Optional[int] = None


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
