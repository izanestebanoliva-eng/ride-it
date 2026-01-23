# security.py
import os
import uuid
from datetime import datetime, timedelta
from uuid import UUID

from jose import jwt, JWTError
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

SECRET_KEY = os.getenv("SECRET_KEY", "DEV_SECRET_CHANGE_ME")
ALGORITHM = "HS256"
ACCESS_TOKEN_MINUTES = int(os.getenv("ACCESS_TOKEN_MINUTES", "30"))


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return pwd_context.verify(password, password_hash)
    except Exception:
        # Si el hash es de otro esquema / está corrupto / etc., NO petes el login.
        return False


def create_access_token(user_id: UUID) -> str:
    """
    Guarda el id del usuario en 'sub' como string UUID.
    """
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_MINUTES)
    payload = {"sub": str(user_id), "exp": expire}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> UUID:
    """
    Devuelve el user_id como UUID.
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        sub = payload.get("sub")
        if not sub:
            raise ValueError("Token sin sub")

        return uuid.UUID(sub)
    except (JWTError, ValueError):
        raise ValueError("Token inválido")



