"""Authentication dependencies and request helpers."""

from typing import Optional
from fastapi import Header, HTTPException, Request, status

from core.security import decode_access_token
from services.auth_store import auth_store


def get_client_ip(request: Request) -> str:
    """Extract client IP address accounting for proxies and direct connections."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        # First IP in comma-separated list is client IP
        return forwarded.split(",")[0].strip()

    real_ip = request.headers.get("x-real-ip")
    if real_ip:
        return real_ip.strip()

    if request.client and request.client.host:
        return request.client.host

    return "127.0.0.1"


async def get_optional_current_user(
    authorization: Optional[str] = Header(None),
) -> Optional[dict]:
    """Resolves authenticated user from Bearer token if provided, otherwise returns None."""
    if not authorization or not authorization.startswith("Bearer "):
        return None

    token = authorization[7:].strip()
    payload = decode_access_token(token)
    if not payload:
        return None

    user_id = payload.get("sub")
    if not user_id:
        return None

    user = auth_store.get_user_by_id(user_id)
    return user


async def get_current_user(
    authorization: Optional[str] = Header(None),
) -> dict:
    """Enforces authentication; raises 401 if token is missing or invalid."""
    user = await get_optional_current_user(authorization)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please log in to proceed.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user
