import base64
import hashlib
import hmac
import os
import secrets
from datetime import datetime, timedelta, timezone

from .settings import settings

def utc_now():
    return datetime.now(timezone.utc)

def hash_password(password: str) -> str:
    salt = os.urandom(16)
    derived = hashlib.scrypt(password.encode("utf-8"), salt=salt, n=2**14, r=8, p=1)
    return base64.b64encode(salt).decode("utf-8") + "$" + base64.b64encode(derived).decode("utf-8")

def verify_password(password: str, password_hash: str) -> bool:
    salt_b64, digest_b64 = password_hash.split("$", 1)
    salt = base64.b64decode(salt_b64.encode("utf-8"))
    expected = base64.b64decode(digest_b64.encode("utf-8"))
    candidate = hashlib.scrypt(password.encode("utf-8"), salt=salt, n=2**14, r=8, p=1)
    return hmac.compare_digest(candidate, expected)

def token_pair() -> tuple[str, str]:
    plain = secrets.token_urlsafe(32)
    digest = hashlib.sha256((plain + settings.session_secret).encode("utf-8")).hexdigest()
    return plain, digest

def session_expiry() -> datetime:
    return utc_now() + timedelta(hours=settings.session_ttl_hours)



