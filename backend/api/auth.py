"""Authentication and Rate-Limiting API router."""

import base64
import json
import logging
from typing import Optional
import httpx
from fastapi import APIRouter, Depends, Header, HTTPException, Request, status

from api.deps import get_client_ip, get_current_user, get_optional_current_user
from core.config import settings
from core.database import database
from core.security import create_access_token, verify_password
from schemas.auth import (
    AuthResponse,
    GoogleAuthRequest,
    LoginRequest,
    RateLimitStatusResponse,
    RegisterRequest,
    UserResponse,
)
from services.auth_store import auth_store

logger = logging.getLogger("promptgen.api.auth")

router = APIRouter(prefix="/api/v1/auth", tags=["Authentication"])


def _user_to_response(u: dict) -> UserResponse:
    return UserResponse(
        id=u["id"],
        name=u["name"],
        email=u["email"],
        avatar_url=u.get("avatar_url"),
        auth_provider=u.get("auth_provider", "local"),
        created_at=u.get("created_at"),
    )


@router.post(
    "/register",
    response_model=AuthResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new account",
)
async def register(request: RegisterRequest) -> AuthResponse:
    """Create a new user account with email and password."""
    existing = None
    if database.enabled:
        try:
            existing = await database.get_user_by_email(request.email)
        except Exception as e:
            logger.warning("Database lookup by email error: %s", e)

    if not existing:
        existing = auth_store.get_user_by_email(request.email)

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"An account with email '{request.email}' already exists. Please log in.",
        )

    try:
        user = auth_store.create_user(
            email=request.email,
            name=request.name,
            password=request.password,
            auth_provider="local",
        )
    except ValueError as err:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(err))

    # Persist user to PostgreSQL
    if database.enabled:
        try:
            db_user = await database.upsert_user(user)
            if db_user:
                user = db_user
        except Exception as e:
            logger.error("Failed to persist new user to PostgreSQL: %s", e)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Database user persistence error: {e}",
            )

    token = create_access_token(
        data={"sub": user["id"], "email": user["email"], "name": user["name"]}
    )

    return AuthResponse(token=token, user=_user_to_response(user))


@router.post(
    "/login",
    response_model=AuthResponse,
    status_code=status.HTTP_200_OK,
    summary="Log in with email & password",
)
async def login(request: LoginRequest) -> AuthResponse:
    """Authenticate existing user credentials."""
    user = auth_store.authenticate_local(request.email, request.password)

    # Check database if not in memory
    if not user and database.enabled:
        try:
            db_user = await database.get_user_by_email(request.email)
            if db_user and db_user.get("password_hash"):
                if verify_password(request.password, db_user["password_hash"]):
                    user = db_user
                    # Sync to auth_store cache
                    auth_store._users_by_id[user["id"]] = user
                    auth_store._users_by_email[user["email"]] = user
        except Exception as e:
            logger.warning("Database login lookup error: %s", e)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password. Please check your credentials.",
        )

    token = create_access_token(
        data={"sub": user["id"], "email": user["email"], "name": user["name"]}
    )

    return AuthResponse(token=token, user=_user_to_response(user))


@router.post(
    "/google",
    response_model=AuthResponse,
    status_code=status.HTTP_200_OK,
    summary="Google Sign-In / OAuth",
)
async def google_auth(request: GoogleAuthRequest) -> AuthResponse:
    """Authenticate or register user via Google identity token or verified profile."""
    email = request.email
    name = request.name or "Google User"
    picture = request.picture
    google_id = request.google_id

    # If an access token was provided from Google OAuth2 flow, fetch verified profile
    if request.access_token:
        try:
            async with httpx.AsyncClient(timeout=8.0) as http_client:
                headers = {"Authorization": f"Bearer {request.access_token}"}
                userinfo_resp = await http_client.get(
                    "https://www.googleapis.com/oauth2/v3/userinfo",
                    headers=headers,
                )
                if userinfo_resp.status_code == 200:
                    uinfo = userinfo_resp.json()
                    email = uinfo.get("email", email)
                    name = uinfo.get("name", name)
                    picture = uinfo.get("picture", picture)
                    google_id = uinfo.get("sub", google_id)

                    # Audience check in production if Client ID configured
                    if settings.google_client_id:
                        tokeninfo_resp = await http_client.get(
                            "https://oauth2.googleapis.com/tokeninfo",
                            params={"access_token": request.access_token},
                        )
                        if tokeninfo_resp.status_code == 200:
                            tinfo = tokeninfo_resp.json()
                            aud = tinfo.get("aud") or tinfo.get("azp")
                            if aud and aud != settings.google_client_id:
                                raise HTTPException(
                                    status_code=status.HTTP_401_UNAUTHORIZED,
                                    detail="Google OAuth token audience does not match configured Client ID.",
                                )
                elif userinfo_resp.status_code == 401 and settings.google_client_id:
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="Invalid or expired Google OAuth access token.",
                    )
        except HTTPException:
            raise
        except Exception as exc:
            logger.warning("Google userinfo check skipped/offline (%s). Using fallback fields.", exc)

    # If an auth code was provided and client secret is configured, exchange for token
    elif request.code and settings.google_client_id and settings.google_client_secret:
        try:
            async with httpx.AsyncClient(timeout=8.0) as http_client:
                token_resp = await http_client.post(
                    "https://oauth2.googleapis.com/token",
                    data={
                        "client_id": settings.google_client_id,
                        "client_secret": settings.google_client_secret,
                        "code": request.code,
                        "grant_type": "authorization_code",
                        "redirect_uri": "postmessage",
                    },
                )
                if token_resp.status_code == 200:
                    token_data = token_resp.json()
                    access_tok = token_data.get("access_token")
                    if access_tok:
                        headers = {"Authorization": f"Bearer {access_tok}"}
                        userinfo_resp = await http_client.get(
                            "https://www.googleapis.com/oauth2/v3/userinfo",
                            headers=headers,
                        )
                        if userinfo_resp.status_code == 200:
                            uinfo = userinfo_resp.json()
                            email = uinfo.get("email", email)
                            name = uinfo.get("name", name)
                            picture = uinfo.get("picture", picture)
                            google_id = uinfo.get("sub", google_id)
        except HTTPException:
            raise
        except Exception as exc:
            logger.warning("Google code exchange skipped/offline (%s).", exc)

    # If an ID token / credential was provided, verify with Google in production
    elif request.credential:
        verified_with_google = False
        try:
            async with httpx.AsyncClient(timeout=8.0) as http_client:
                google_resp = await http_client.get(
                    "https://oauth2.googleapis.com/tokeninfo",
                    params={"id_token": request.credential},
                )
                if google_resp.status_code == 200:
                    token_info = google_resp.json()
                    email = token_info.get("email", email)
                    name = token_info.get("name", name)
                    picture = token_info.get("picture", picture)
                    google_id = token_info.get("sub", google_id)

                    # Audience check in production
                    if settings.google_client_id and token_info.get("aud") != settings.google_client_id:
                        raise HTTPException(
                            status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="Google OAuth token audience does not match configured Client ID.",
                        )
                    verified_with_google = True
                elif google_resp.status_code == 400 and settings.google_client_id:
                    logger.warning("Google rejected credential: %s", google_resp.text)
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="Invalid or expired Google OAuth credential token.",
                    )
        except HTTPException:
            raise
        except Exception as exc:
            logger.warning("Google tokeninfo check skipped/offline (%s). Using fallback decode.", exc)

        # Fallback decode if offline test or custom format
        if not verified_with_google:
            try:
                parts = request.credential.split(".")
                if len(parts) >= 2:
                    payload_b64 = parts[1]
                    padding = 4 - (len(payload_b64) % 4)
                    if padding != 4:
                        payload_b64 += "=" * padding
                    payload_bytes = base64.urlsafe_b64decode(payload_b64)
                    id_data = json.loads(payload_bytes.decode("utf-8"))
                    email = id_data.get("email", email)
                    name = id_data.get("name", name)
                    picture = id_data.get("picture", picture)
                    google_id = id_data.get("sub", google_id)
            except Exception as exc:
                logger.warning("Could not decode Google credential JWT: %s. Using direct fields.", exc)

    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google authentication failed: Email address was not provided.",
        )

    user = auth_store.authenticate_or_create_google(
        email=email,
        name=name,
        google_id=google_id,
        avatar_url=picture,
    )

    # Persist Google user to PostgreSQL
    if database.enabled:
        try:
            db_user = await database.upsert_user(user)
            if db_user:
                user = db_user
        except Exception as e:
            logger.error("Failed to persist Google user to PostgreSQL: %s", e)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Database user persistence error: {e}",
            )

    token = create_access_token(
        data={"sub": user["id"], "email": user["email"], "name": user["name"]}
    )

    return AuthResponse(token=token, user=_user_to_response(user))


@router.get(
    "/me",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary="Get current user profile",
)
async def get_me(user: dict = Depends(get_current_user)) -> UserResponse:
    """Return currently authenticated user profile."""
    return _user_to_response(user)


@router.get(
    "/rate-limit-status",
    response_model=RateLimitStatusResponse,
    status_code=status.HTTP_200_OK,
    summary="Check prompt generation rate limit status",
)
async def rate_limit_status(
    raw_request: Request,
    current_user: Optional[dict] = Depends(get_optional_current_user),
) -> RateLimitStatusResponse:
    """Returns guest generation allowance or unlimited status for authenticated users."""
    client_ip = get_client_ip(raw_request)

    if current_user:
        return RateLimitStatusResponse(
            is_authenticated=True,
            limit=None,
            used=0,
            remaining=None,
            locked=False,
            ip=client_ip,
            message="Authenticated user: Unlimited prompt generations active.",
        )

    if database.enabled:
        used = await database.get_guest_rate_limit(client_ip)
        limit = settings.guest_daily_limit
        remaining = max(0, limit - used)
        locked = remaining == 0
        ip_status = {
            "used": used,
            "limit": limit,
            "remaining": remaining,
            "locked": locked,
        }
    else:
        ip_status = auth_store.get_ip_status(client_ip)

    message = (
        "Daily guest generation limit reached (2/2). Log in for unlimited generations."
        if ip_status["locked"]
        else f"Guest session: {ip_status['used']}/{ip_status['limit']} generations used today."
    )

    return RateLimitStatusResponse(
        is_authenticated=False,
        limit=ip_status["limit"],
        used=ip_status["used"],
        remaining=ip_status["remaining"],
        remaining_generations=ip_status["remaining"],
        locked=ip_status["locked"],
        ip=client_ip,
        message=message,
    )


@router.post(
    "/logout",
    status_code=status.HTTP_200_OK,
    summary="Log out current session",
)
async def logout() -> dict:
    return {"status": "ok", "message": "Successfully logged out."}


@router.post(
    "/reset-rate-limit",
    status_code=status.HTTP_200_OK,
    summary="Reset prompt generation rate limit for the requesting machine/IP",
)
async def reset_rate_limit(raw_request: Request) -> dict:
    """Clears the daily prompt generation counter for the caller's IP."""
    client_ip = get_client_ip(raw_request)
    if database.enabled:
        await database.reset_guest_rate_limit(client_ip)
        for alias in ("127.0.0.1", "::1", "localhost", "testclient"):
            await database.reset_guest_rate_limit(alias)
    auth_store.reset_ip(client_ip)
    # Also reset common loopback aliases for local dev
    for alias in ("127.0.0.1", "::1", "localhost", "testclient"):
        auth_store.reset_ip(alias)
    return {
        "status": "ok",
        "message": f"Rate limit counter reset to 0 for IP {client_ip}.",
        "ip": client_ip,
    }
