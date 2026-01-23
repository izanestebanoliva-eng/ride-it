from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy import text
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
    # crea tablas si no existen (en Postgres/Supabase, esto intentará crear/ajustar lo básico)
    try:
        Base.metadata.create_all(bind=engine)
        print("DB init OK")
    except Exception as e:
        print("DB init ERROR:", repr(e))

@app.get("/")
def root():
    return {"status": "backend funcionando"}

# ------------------------
# DEBUG (temporal)
# ------------------------
@app.get("/debug/db")
def debug_db(db: Session = Depends(get_db)):
    info = db.execute(text("""
        select
          current_database() as db,
          current_user as usr,
          current_schema() as schema,
          inet_server_addr()::text as server_ip,
          inet_server_port() as server_port,
          current_setting('search_path') as search_path
    """)).mappings().first()

    count = db.execute(text("select count(*) as n from public.users")).mappings().first()
    sample = db.execute(text("""
        select id, email, name, created_at
        from public.users
        order by created_at desc
        limit 5
    """)).mappings().all()

    return {
        "conn": dict(info) if info else None,
        "users_count": int(count["n"]) if count else None,
        "sample": [dict(r) for r in sample],
    }

@app.get("/debug/check-email")
def debug_check_email(email: str, db: Session = Depends(get_db)):
    email_norm = email.lower().strip()

    orm = db.query(models.User).filter(models.User.email == email_norm).first()
    sql = db.execute(
        text("select id, email, name, created_at from public.users where email = :e limit 1"),
        {"e": email_norm},
    ).mappings().first()

    return {
        "email_norm": email_norm,
        "orm_found": bool(orm),
        "sql_found": bool(sql),
        "sql_row": dict(sql) if sql else None,
    }

# ------------------------
# Auth
# ------------------------
@app.post("/auth/register", response_model=schemas.UserOut)
def register(data: schemas.RegisterIn, db: Session = Depends(get_db)):
    email = data.email.lower().strip()
    name = data.name.strip()
    password = data.password

    # check rápido
    existing = db.query(models.User).filter(models.User.email == email).first()
    if existing:
        raise HTTPException(status_code=409, detail="EMAIL_EXISTS")

    # OJO: con el models.py nuevo, id se genera como UUID (default=uuid.uuid4)
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

        # 23502, etc.
        raise HTTPException(status_code=400, detail=f"REGISTER_INTEGRITY_ERROR:{pgcode}")

    except Exception as e:
        db.rollback()
        print("REGISTER ERROR:", repr(e))
        raise HTTPException(status_code=500, detail="REGISTER_FAILED")

    # schemas.UserOut ya soporta from_attributes, pero devolvemos explícito igualmente
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

