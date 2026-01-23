from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from .db import Base, engine, get_db
from . import models, schemas, security

app = FastAPI()

# Bearer token
security_scheme = HTTPBearer()

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    # crea tablas si no existen (en Postgres/Supabase)
    try:
        Base.metadata.create_all(bind=engine)
        print("DB init OK")
    except Exception as e:
        # No mates el server si la BD tarda / falla temporalmente
        print("DB init ERROR:", repr(e))

@app.get("/")
def root():
    return {"status": "backend funcionando"}

# ------------------------
# Auth
# ------------------------
@app.post("/auth/register", response_model=schemas.UserOut)
def register(data: schemas.RegisterIn, db: Session = Depends(get_db)):
    email = data.email.lower().strip()
    name = data.name.strip()
    password = data.password

    existing = db.query(models.User).filter(models.User.email == email).first()
    if existing:
        raise HTTPException(status_code=409, detail="EMAIL_EXISTS")

    user = models.User(
        email=email,
        name=name,
        password_hash=security.hash_password(password),
    )

    try:
        db.add(user)
        db.commit()
        db.refresh(user)
    except IntegrityError as e:
        db.rollback()

        pgcode = getattr(getattr(e, "orig", None), "pgcode", None)
        msg = str(getattr(e, "orig", e))
        print("REGISTER IntegrityError pgcode=", pgcode, "msg=", msg)

        # Postgres unique_violation = 23505
        if pgcode == "23505" or "duplicate key" in msg.lower() or "unique" in msg.lower():
            raise HTTPException(status_code=409, detail="EMAIL_EXISTS")

        raise HTTPException(status_code=400, detail=f"REGISTER_INTEGRITY_ERROR:{pgcode}")

    except Exception as e:
        db.rollback()
        print("REGISTER ERROR:", repr(e))
        raise HTTPException(status_code=500, detail="REGISTER_FAILED")

    return schemas.UserOut(id=user.id, email=user.email, name=user.name)

@app.post("/auth/login")
def login(data: schemas.LoginIn, db: Session = Depends(get_db)):
    email = data.email.lower().strip()

    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="NOT_FOUND")

    try:
        ok = security.verify_password(data.password, user.password_hash)
    except Exception:
        ok = False

    if not ok:
        raise HTTPException(status_code=401, detail="BAD_PASSWORD")

    access_token = security.create_access_token(user.id)
    return {"access_token": access_token, "token_type": "bearer"}

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme),
    db: Session = Depends(get_db),
):
    token = credentials.credentials
    try:
        user_id = security.decode_access_token(token)  # devuelve UUID
    except Exception:
        raise HTTPException(status_code=401, detail="Token inválido")

    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="Usuario no existe")

    return user

@app.get("/me", response_model=schemas.UserOut)
def me(user: models.User = Depends(get_current_user)):
    return schemas.UserOut(id=user.id, email=user.email, name=user.name)

# ------------------------
# Routes
# ------------------------
@app.post("/routes", response_model=schemas.RouteOut)
def create_route(
    data: schemas.RouteCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    route = models.Route(
        user_id=user.id,              # ✅ sale del JWT
        name=data.name.strip(),
        distance_m=data.distance_m,
        duration_s=data.duration_s,
        path=data.path,
        visibility=data.visibility,
    )

    db.add(route)
    db.commit()
    db.refresh(route)
    return route


@app.get("/routes/mine", response_model=list[schemas.RouteOut])
def list_my_routes(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    rutas = (
        db.query(models.Route)
        .filter(models.Route.user_id == user.id)
        .order_by(models.Route.created_at.desc())
        .all()
    )
    return rutas
