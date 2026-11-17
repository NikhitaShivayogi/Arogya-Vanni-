from datetime import datetime, timedelta, timezone

from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerifyMismatchError
from jose import JWTError, jwt

from app.config import settings

ALGORITHM = "HS256"
COOKIE_NAME = "arogya_session"
password_hasher = PasswordHasher()


def hash_password(password: str) -> str:
    return password_hasher.hash(password)


def verify_password(password: str, hashed: str) -> bool:
    try:
        return password_hasher.verify(hashed, password)
    except (VerifyMismatchError, InvalidHashError):
        return False


def create_session_token(user_id: str) -> str:
    expires = datetime.now(timezone.utc) + timedelta(hours=settings.session_hours)
    return jwt.encode({"sub": user_id, "exp": expires}, settings.jwt_secret, algorithm=ALGORITHM)


def decode_session_token(token: str) -> str | None:
    try:
        subject = jwt.decode(token, settings.jwt_secret, algorithms=[ALGORITHM]).get("sub")
        return subject if isinstance(subject, str) else None
    except JWTError:
        return None
