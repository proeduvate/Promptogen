"""Schemas for authentication and rate limiting."""

from datetime import datetime
import re
from typing import Optional
from pydantic import BaseModel, Field, field_validator

EMAIL_REGEX = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100, description="Full name of user")
    email: str = Field(..., min_length=3, max_length=255, description="Valid email address")
    password: str = Field(..., min_length=6, max_length=128, description="Password (min 6 characters)")

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        clean = v.strip().lower()
        if not EMAIL_REGEX.match(clean):
            raise ValueError("Invalid email format.")
        return clean


class LoginRequest(BaseModel):
    email: str = Field(..., min_length=3, max_length=255, description="Registered email address")
    password: str = Field(..., min_length=1, description="Account password")

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        clean = v.strip().lower()
        if not EMAIL_REGEX.match(clean):
            raise ValueError("Invalid email format.")
        return clean


class GoogleAuthRequest(BaseModel):
    credential: Optional[str] = Field(None, description="Google OAuth ID Token from GIS")
    access_token: Optional[str] = Field(None, description="Google OAuth2 Access Token")
    code: Optional[str] = Field(None, description="Google OAuth2 Authorization Code")
    email: Optional[str] = Field(None, description="Google account email")
    name: Optional[str] = Field(None, description="Google account display name")
    picture: Optional[str] = Field(None, description="Google account avatar photo URL")
    google_id: Optional[str] = Field(None, description="Unique Google subject identifier")


class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    avatar_url: Optional[str] = None
    auth_provider: str = "local"
    created_at: Optional[datetime] = None


class AuthResponse(BaseModel):
    token: str
    user: UserResponse
    expires_in_days: int = 30


class RateLimitStatusResponse(BaseModel):
    is_authenticated: bool
    limit: Optional[int]
    used: int
    remaining: Optional[int]
    remaining_generations: Optional[int] = None
    locked: bool
    ip: str
    message: Optional[str] = None
