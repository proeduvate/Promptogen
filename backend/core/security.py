"""Security and cryptographic helpers for Promptogen.

Provides:
- PBKDF2-HMAC-SHA256 password hashing with random salt (NIST compliant, zero dependencies).
- Constant-time password verification to prevent timing attacks.
- URL-safe HMAC-SHA256 signed access tokens with expiration.
"""

import base64
from datetime import datetime, timedelta, timezone
import hashlib
import hmac
import json
import logging
import secrets
from typing import Any, Dict, Optional

from core.config import settings

logger = logging.getLogger("promptgen.core.security")

_PBKDF2_ITERATIONS = 100_000


def hash_password(password: str) -> str:
    """Hash a plaintext password using PBKDF2-HMAC-SHA256 with a unique salt."""
    salt = secrets.token_hex(16)
    key = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        _PBKDF2_ITERATIONS,
    ).hex()
    return f"{salt}${key}"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Constant-time comparison between plain password and stored salt$hash."""
    if not hashed_password or "$" not in hashed_password:
        return False
    try:
        salt, expected_key = hashed_password.split("$", 1)
        actual_key = hashlib.pbkdf2_hmac(
            "sha256",
            plain_password.encode("utf-8"),
            salt.encode("utf-8"),
            _PBKDF2_ITERATIONS,
        ).hex()
        return hmac.compare_digest(actual_key, expected_key)
    except Exception as exc:
        logger.warning("Error verifying password: %s", exc)
        return False


def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _b64url_decode(s: str) -> bytes:
    padding = 4 - (len(s) % 4)
    if padding != 4:
        s += "=" * padding
    return base64.urlsafe_b64decode(s.encode("ascii"))


def create_access_token(
    data: Dict[str, Any],
    expires_delta: Optional[timedelta] = None,
) -> str:
    """Create a URL-safe signed HMAC-SHA256 session token."""
    header = {"alg": "HS256", "typ": "JWT"}
    now = datetime.now(timezone.utc)

    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(days=settings.jwt_expire_days)

    payload = dict(data)
    payload["iat"] = int(now.timestamp())
    payload["exp"] = int(expire.timestamp())

    header_json = json.dumps(header, separators=(",", ":")).encode("utf-8")
    payload_json = json.dumps(payload, separators=(",", ":")).encode("utf-8")

    h_b64 = _b64url_encode(header_json)
    p_b64 = _b64url_encode(payload_json)

    signing_input = f"{h_b64}.{p_b64}".encode("ascii")
    secret_bytes = settings.jwt_secret_key.encode("utf-8")
    sig = hmac.new(secret_bytes, signing_input, hashlib.sha256).digest()
    sig_b64 = _b64url_encode(sig)

    return f"{h_b64}.{p_b64}.{sig_b64}"


def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """Decode and verify an HMAC-SHA256 session token.
    
    Returns payload dict if signature is valid and not expired, else None.
    """
    if not token or token.count(".") != 2:
        return None

    try:
        parts = token.strip().split(".")
        if len(parts) != 3:
            return None

        h_b64, p_b64, sig_b64 = parts
        signing_input = f"{h_b64}.{p_b64}".encode("ascii")
        secret_bytes = settings.jwt_secret_key.encode("utf-8")
        expected_sig = _b64url_encode(
            hmac.new(secret_bytes, signing_input, hashlib.sha256).digest()
        )

        if not hmac.compare_digest(sig_b64, expected_sig):
            logger.debug("Token signature verification failed")
            return None

        payload_bytes = _b64url_decode(p_b64)
        payload = json.loads(payload_bytes.decode("utf-8"))

        # Verify expiration
        exp = payload.get("exp")
        if exp is not None:
            now_ts = int(datetime.now(timezone.utc).timestamp())
            if now_ts > exp:
                logger.debug("Token expired: %s < %s", exp, now_ts)
                return None

        return payload
    except Exception as exc:
        logger.debug("Failed to decode access token: %s", exc)
        return None
