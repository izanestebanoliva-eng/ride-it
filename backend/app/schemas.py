from pydantic import BaseModel, EmailStr

class RegisterIn(BaseModel):
    email: EmailStr
    name: str
    password: str

class UserOut(BaseModel):
    id: int
    email: EmailStr
    name: str

class LoginIn(BaseModel):
    email: EmailStr
    password: str
