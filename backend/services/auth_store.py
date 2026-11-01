"""Authentication user repository and IP-level daily rate limiter."""

from datetime import datetime, timezone
import logging
import threading
import uuid
from typing import Any, Dict, Optional, Tuple

from core.config import settings
from core.security import hash_password, verify_password

logger = logging.getLogger("promptgen.services.auth_store")


class AuthStore:
    """Thread-safe user store and IP rate limiter."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._users_by_id: Dict[str, dict] = {}
        self._users_by_email: Dict[str, dict] = {}
        # Mapping: "YYYY-MM-DD:ip" -> count
        self._ip_usage: Dict[str, int] = {}

        # Seed initial demo account
        self._seed_demo_account()

    def _seed_demo_account(self) -> None:
        demo_id = "00000000-0000-0000-0000-000000000001"
        demo_email = "dhanush@proeduvate.com"
        demo_user = {
            "id": demo_id,
            "email": demo_email,
            "name": "Dhanush C",
            "password_hash": hash_password("ProEduvate2026!"),
            "auth_provider": "local",
            "google_id": None,
            "avatar_url": None,
            "created_at": datetime.now(timezone.utc),
        }
        self._users_by_id[demo_id] = demo_user
        self._users_by_email[demo_email] = demo_user

        # Secondary demo alias
        demo2_id = "00000000-0000-0000-0000-000000000002"
        demo2_email = "demo@promptogen.ai"
        demo2_user = {
            "id": demo2_id,
            "email": demo2_email,
            "name": "Demo User",
            "password_hash": hash_password("Promptogen@2026"),
            "auth_provider": "local",
            "google_id": None,
            "avatar_url": None,
            "created_at": datetime.now(timezone.utc),
        }
        self._users_by_id[demo2_id] = demo2_user
        self._users_by_email[demo2_email] = demo2_user

    def _today_key(self, ip: str) -> str:
        date_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        # Sanitize IP string
        clean_ip = ip.strip() if ip else "127.0.0.1"
        return f"{date_str}:{clean_ip}"

    # ── User Management ───────────────────────────────────────────────────────

    def get_user_by_email(self, email: str) -> Optional[dict]:
        with self._lock:
            return self._users_by_email.get(email.strip().lower())

    def get_user_by_id(self, user_id: str) -> Optional[dict]:
        with self._lock:
            return self._users_by_id.get(user_id)

    def create_user(
        self,
        email: str,
        name: str,
        password: Optional[str] = None,
        auth_provider: str = "local",
        google_id: Optional[str] = None,
        avatar_url: Optional[str] = None,
    ) -> dict:
        email_clean = email.strip().lower()
        with self._lock:
            if email_clean in self._users_by_email:
                raise ValueError(f"User with email '{email_clean}' already exists.")

            user_id = str(uuid.uuid4())
            user = {
                "id": user_id,
                "email": email_clean,
                "name": name.strip(),
                "password_hash": hash_password(password) if password else None,
                "auth_provider": auth_provider,
                "google_id": google_id,
                "avatar_url": avatar_url,
                "created_at": datetime.now(timezone.utc),
            }
            self._users_by_id[user_id] = user
            self._users_by_email[email_clean] = user
            logger.info("Created new user: id=%s email=%s provider=%s", user_id, email_clean, auth_provider)
            return user

    def authenticate_local(self, email: str, password: str) -> Optional[dict]:
        user = self.get_user_by_email(email)
        if not user:
            return None
        if not user.get("password_hash"):
            return None
        if verify_password(password, user["password_hash"]):
            return user
        return None

    def authenticate_or_create_google(
        self,
        email: str,
        name: str,
        google_id: Optional[str] = None,
        avatar_url: Optional[str] = None,
    ) -> dict:
        email_clean = email.strip().lower()
        with self._lock:
            existing = self._users_by_email.get(email_clean)
            if existing:
                # Update existing user profile with Google metadata
                if google_id and not existing.get("google_id"):
                    existing["google_id"] = google_id
                if avatar_url and not existing.get("avatar_url"):
                    existing["avatar_url"] = avatar_url
                if not existing.get("name") or existing.get("name") == "Google User":
                    existing["name"] = name.strip()
                return existing

            # Create new user via Google
            user_id = str(uuid.uuid4())
            user = {
                "id": user_id,
                "email": email_clean,
                "name": name.strip(),
                "password_hash": None,
                "auth_provider": "google",
                "google_id": google_id,
                "avatar_url": avatar_url,
                "created_at": datetime.now(timezone.utc),
            }
            self._users_by_id[user_id] = user
            self._users_by_email[email_clean] = user
            logger.info("Created new Google user: id=%s email=%s", user_id, email_clean)
            return user

    # ── IP-level Rate Limiting ────────────────────────────────────────────────

    def get_ip_status(self, ip: str) -> Dict[str, Any]:
        """Returns rate limit status for guest IP: used, limit, remaining, locked."""
        limit = settings.guest_daily_limit
        key = self._today_key(ip)
        with self._lock:
            used = self._ip_usage.get(key, 0)
        remaining = max(0, limit - used)
        locked = used >= limit
        return {
            "used": used,
            "limit": limit,
            "remaining": remaining,
            "locked": locked,
            "ip": ip,
        }

    def record_guest_generation(self, ip: str) -> Tuple[int, bool]:
        """Increments prompt generation count for guest IP.
        
        Returns (new_used, is_locked).
        Raises ValueError if already locked.
        """
        limit = settings.guest_daily_limit
        key = self._today_key(ip)
        with self._lock:
            current_used = self._ip_usage.get(key, 0)
            if current_used >= limit:
                return current_used, True

            new_used = current_used + 1
            self._ip_usage[key] = new_used
            is_locked = new_used >= limit
            logger.info("Recorded guest generation: ip=%s used=%d/%d locked=%s", ip, new_used, limit, is_locked)
            return new_used, is_locked

    def reset_ip(self, ip: str) -> None:
        """Reset usage for an IP (used in unit tests)."""
        key = self._today_key(ip)
        with self._lock:
            self._ip_usage.pop(key, None)


auth_store = AuthStore()
