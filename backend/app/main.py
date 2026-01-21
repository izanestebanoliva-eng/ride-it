from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from .db import Base, engine, get_db
from . import models, schemas, security

# Crear tablas en SQLite
Base.metadata.create_all(bind=engine)

app = FastAPI()

# OAuth2 (para usar Bearer token)
security_scheme = HTTPBearer()

# CORS (para que la app Expo pueda llamar)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # en local está bien
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ------------------------
# Root
# ------------------------
@app.get("/")
def root():
    return {"status": "backend funcionando"}

# ------------------------
# Register
# ------------------------
@app.post("/auth/register", response_model=schemas.UserOut)
def register(data: schemas.RegisterIn, db: Session = Depends(get_db)):
    email = data.email.lower().strip()

    existing = db.query(models.User).filter(models.User.email == email).first()
    if existing:
        raise HTTPException(status_code=409, detail="EMAIL_EXISTS")

    user = models.User(
        email=email,
        name=data.name.strip(),
        password_hash=security.hash_password(data.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return schemas.UserOut(
        id=user.id,
        email=user.email,
        name=user.name,
    )

# ------------------------
# Login (DEVUELVE TOKEN)
# ------------------------
@app.post("/auth/login")
def login(data: schemas.LoginIn, db: Session = Depends(get_db)):
    email = data.email.lower().strip()

    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="NOT_FOUND")

    if not security.verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="BAD_PASSWORD")

    access_token = security.create_access_token(user.id)

    return {
        "access_token": access_token,
        "token_type": "bearer",
    }

# ------------------------
# Obtener usuario actual desde token
# ------------------------
def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme),
    db: Session = Depends(get_db),
):
    token = credentials.credentials

    try:
        user_id = security.decode_access_token(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Token inválido")

    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="Usuario no existe")

    return user

# ------------------------
# /me
# ------------------------
@app.get("/me", response_model=schemas.UserOut)
def me(user: models.User = Depends(get_current_user)):
    return schemas.UserOut(
        id=user.id,
        email=user.email,
        name=user.name,
    )
