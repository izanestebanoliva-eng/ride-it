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
    try:
        Base.metadata.create_all(bind=engine)
        print("DB init OK")
    except Exception as e:
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
        user_id=user.id,
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

# ------------------------
# Users search
# ------------------------
@app.get("/users/search", response_model=list[schemas.UserSearchOut])
def search_users(
    q: str,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    query = q.strip().lower()
    if len(query) < 2:
        return []

    users = (
        db.query(models.User)
        .filter(models.User.name.ilike(f"%{query}%"))
        .order_by(models.User.name.asc())
        .limit(20)
        .all()
    )
    return users

# ------------------------
# Friend Requests
# ------------------------

@app.post("/friend-requests", response_model=schemas.FriendRequestOut)
def send_friend_request(
    data: schemas.FriendRequestCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    to_name = data.to_name.strip().lower()
    if len(to_name) < 2:
        raise HTTPException(status_code=400, detail="BAD_TO_NAME")

    if to_name == user.name.strip().lower():
        raise HTTPException(status_code=400, detail="CANNOT_REQUEST_SELF")

    to_user = db.query(models.User).filter(models.User.name == to_name).first()
    if not to_user:
        raise HTTPException(status_code=404, detail="USER_NOT_FOUND")

    # ¿ya sois amigos?
    existing_friend = (
        db.query(models.Friend)
        .filter(models.Friend.user_id == user.id, models.Friend.friend_id == to_user.id)
        .first()
    )
    if existing_friend:
        raise HTTPException(status_code=409, detail="ALREADY_FRIENDS")

    # ¿ya hay solicitud pendiente en cualquier dirección?
    pending_same = (
        db.query(models.FriendRequest)
        .filter(
            models.FriendRequest.from_user_id == user.id,
            models.FriendRequest.to_user_id == to_user.id,
        )
        .first()
    )
    if pending_same:
        raise HTTPException(status_code=409, detail="REQUEST_ALREADY_SENT")

    pending_reverse = (
        db.query(models.FriendRequest)
        .filter(
            models.FriendRequest.from_user_id == to_user.id,
            models.FriendRequest.to_user_id == user.id,
        )
        .first()
    )
    if pending_reverse:
        raise HTTPException(status_code=409, detail="REQUEST_ALREADY_RECEIVED")

    fr = models.FriendRequest(from_user_id=user.id, to_user_id=to_user.id)
    try:
        db.add(fr)
        db.commit()
        db.refresh(fr)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="REQUEST_ALREADY_EXISTS")

    return fr


@app.get("/friend-requests/incoming", response_model=list[schemas.FriendRequestOut])
def list_incoming_requests(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    reqs = (
        db.query(models.FriendRequest)
        .filter(models.FriendRequest.to_user_id == user.id)
        .order_by(models.FriendRequest.created_at.desc())
        .all()
    )
    return reqs


@app.get("/friend-requests/outgoing", response_model=list[schemas.FriendRequestOut])
def list_outgoing_requests(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    reqs = (
        db.query(models.FriendRequest)
        .filter(models.FriendRequest.from_user_id == user.id)
        .order_by(models.FriendRequest.created_at.desc())
        .all()
    )
    return reqs


@app.post("/friend-requests/{request_id}/accept")
def accept_friend_request(
    request_id: str,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    fr = db.query(models.FriendRequest).filter(models.FriendRequest.id == request_id).first()
    if not fr:
        raise HTTPException(status_code=404, detail="REQUEST_NOT_FOUND")

    if fr.to_user_id != user.id:
        raise HTTPException(status_code=403, detail="NOT_YOUR_REQUEST")

    # Crea amistad en ambos sentidos
    a_to_b = models.Friend(user_id=fr.from_user_id, friend_id=fr.to_user_id)
    b_to_a = models.Friend(user_id=fr.to_user_id, friend_id=fr.from_user_id)

    try:
        db.add(a_to_b)
        db.add(b_to_a)
        # elimina la solicitud (como decidiste: solicitudes solo pendientes)
        db.delete(fr)
        db.commit()
    except IntegrityError:
        db.rollback()
        # si ya existía amistad por algún motivo
        raise HTTPException(status_code=409, detail="ALREADY_FRIENDS")

    return {"status": "accepted"}


@app.post("/friend-requests/{request_id}/reject")
def reject_friend_request(
    request_id: str,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    fr = db.query(models.FriendRequest).filter(models.FriendRequest.id == request_id).first()
    if not fr:
        raise HTTPException(status_code=404, detail="REQUEST_NOT_FOUND")

    if fr.to_user_id != user.id:
        raise HTTPException(status_code=403, detail="NOT_YOUR_REQUEST")

    db.delete(fr)
    db.commit()
    return {"status": "rejected"}

