from pydantic import BaseModel, EmailStr
from uuid import UUID

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
