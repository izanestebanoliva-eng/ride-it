from pydantic import BaseModel, EmailStr
from uuid import UUID
from typing import List, Literal, Any
from datetime import datetime


# ------------------------
# Auth (NO TOCAR)
# ------------------------

class RegisterIn(BaseModel):
    email: EmailStr
    name: str
    password: str


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: UUID
    email: EmailStr
    name: str

    class Config:
        from_attributes = True


# ------------------------
# Routes
# ------------------------

class RouteCreate(BaseModel):
    name: str
    distance_m: int
    duration_s: int
    path: List[Any]
    visibility: Literal["private", "friends", "public"] = "private"


class RouteOut(BaseModel):
    id: UUID
    name: str
    distance_m: int
    duration_s: int
    visibility: str
    created_at: datetime

    class Config:
        from_attributes = True


# ------------------------
# Users search
# ------------------------

class UserSearchOut(BaseModel):
    id: UUID
    name: str

    class Config:
        from_attributes = True
