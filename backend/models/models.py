"""SQLAlchemy 2.0 Declarative Models for PromptoGen."""

from datetime import date, datetime
from typing import Any, List, Optional
import uuid

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    """Base declarative class for PromptoGen database models."""
    pass


class User(Base):
    """User account entity for authentication and data ownership."""

    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    email: Mapped[str] = mapped_column(
        String(255), unique=True, nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    password_hash: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    auth_provider: Mapped[str] = mapped_column(
        String(32), default="local", server_default=text("'local'"), nullable=False
    )
    google_id: Mapped[Optional[str]] = mapped_column(
        String(128), nullable=True, index=True
    )
    avatar_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(
        Boolean, default=True, server_default=text("true"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Relationships
    prompts: Mapped[List["SavedPrompt"]] = relationship(
        "SavedPrompt", back_populates="user", cascade="all, delete-orphan"
    )
    creations: Mapped[List["PromptCreation"]] = relationship(
        "PromptCreation", back_populates="user"
    )
    assessments: Mapped[List["PromptAssessment"]] = relationship(
        "PromptAssessment", back_populates="user"
    )


class LibraryFolder(Base):
    """Folder categorization for prompt library organization."""

    __tablename__ = "library_folders"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    label: Mapped[str] = mapped_column(String(128), nullable=False)
    icon: Mapped[str] = mapped_column(String(64), nullable=False)
    tone: Mapped[str] = mapped_column(String(64), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    prompts: Mapped[List["SavedPrompt"]] = relationship(
        "SavedPrompt", back_populates="folder"
    )


class SavedPrompt(Base):
    """Saved prompt in user's library with version history and strength metrics."""

    __tablename__ = "saved_prompts"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    created_by: Mapped[str] = mapped_column(
        String(64), default="you", server_default=text("'you'"), nullable=False
    )
    model: Mapped[str] = mapped_column(
        String(64), default="GPT-4o", server_default=text("'GPT-4o'"), nullable=False
    )
    folder_id: Mapped[Optional[str]] = mapped_column(
        String(64),
        ForeignKey("library_folders.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    tags: Mapped[Any] = mapped_column(
        JSONB, default=list, server_default=text("'[]'::jsonb"), nullable=False
    )
    score: Mapped[int] = mapped_column(
        Integer, default=85, server_default=text("85"), nullable=False
    )
    favorite: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default=text("false"), nullable=False
    )
    archived: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default=text("false"), nullable=False
    )
    prompt_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    sections: Mapped[Any] = mapped_column(
        JSONB, default=list, server_default=text("'[]'::jsonb"), nullable=False
    )
    current_version: Mapped[Optional[str]] = mapped_column(
        String(32), default="v1", server_default=text("'v1'"), nullable=True
    )
    versions: Mapped[Any] = mapped_column(
        JSONB, default=list, server_default=text("'[]'::jsonb"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    user: Mapped[Optional["User"]] = relationship("User", back_populates="prompts")
    folder: Mapped[Optional["LibraryFolder"]] = relationship(
        "LibraryFolder", back_populates="prompts"
    )


class PromptCreation(Base):
    """Interactive multi-turn clarification and generation workflow sessions."""

    __tablename__ = "prompt_creations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    original_query: Mapped[str] = mapped_column(Text, nullable=False)
    questions: Mapped[Any] = mapped_column(
        JSONB, default=list, server_default=text("'[]'::jsonb"), nullable=False
    )
    answers: Mapped[Any] = mapped_column(
        JSONB, default=list, server_default=text("'[]'::jsonb"), nullable=False
    )
    prompt_title: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    optimized_prompt: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    overall_score: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    clarity: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    specificity: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    context: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    structure: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    actionability: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    suggestions: Mapped[Any] = mapped_column(
        JSONB, default=list, server_default=text("'[]'::jsonb"), nullable=False
    )
    status: Mapped[str] = mapped_column(
        String(64),
        default="awaiting_answers",
        server_default=text("'awaiting_answers'"),
        nullable=False,
    )
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    completed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    user: Mapped[Optional["User"]] = relationship("User", back_populates="creations")


class PromptAssessment(Base):
    """Deterministic prompt quality evaluation scores and recommendations."""

    __tablename__ = "prompt_assessments"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    prompt_text: Mapped[str] = mapped_column(Text, nullable=False)
    overall_score: Mapped[int] = mapped_column(Integer, nullable=False)
    clarity: Mapped[int] = mapped_column(Integer, nullable=False)
    specificity: Mapped[int] = mapped_column(Integer, nullable=False)
    context: Mapped[int] = mapped_column(Integer, nullable=False)
    structure: Mapped[int] = mapped_column(Integer, nullable=False)
    actionability: Mapped[int] = mapped_column(Integer, nullable=False)
    suggestions: Mapped[Any] = mapped_column(
        JSONB, default=list, server_default=text("'[]'::jsonb"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    user: Mapped[Optional["User"]] = relationship("User", back_populates="assessments")


class GuestRateLimit(Base):
    """IP-level rate limit tracker for guest users in production."""

    __tablename__ = "guest_rate_limits"

    ip_address: Mapped[str] = mapped_column(String(64), primary_key=True)
    usage_date: Mapped[date] = mapped_column(Date, primary_key=True)
    count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
