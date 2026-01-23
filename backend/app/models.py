import uuid
from sqlalchemy import Column, String, DateTime, func, Integer, Enum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB

from .db import Base


class User(Base):
    __tablename__ = "users"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True,
    )
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    password_hash = Column(String, nullable=False)
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )


class Route(Base):
    __tablename__ = "routes"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    name = Column(String, nullable=False)

    distance_m = Column(Integer, nullable=False)
    duration_s = Column(Integer, nullable=False)

    # Lista de puntos / geojson / lo que uses (se guarda tal cual en JSONB)
    path = Column(JSONB, nullable=False)

    visibility = Column(
        Enum("private", "friends", "public", name="route_visibility"),
        nullable=False,
        server_default="private",
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
