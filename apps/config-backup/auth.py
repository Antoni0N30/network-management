"""Authentication, JWT-like tokens and role helpers for Config Backup API."""

from __future__ import annotations

import hashlib
import os
import time
import uuid
from functools import wraps
from typing import Any, Callable

from flask import current_app, g, jsonify, request
from itsdangerous import BadSignature, BadTimeSignature, URLSafeTimedSerializer

# Support both module and standalone execution
try:
    from . import database
except ImportError:
    import database


ROLE_LEVEL = {
    "viewer": 10,
    "operator": 20,
    "admin": 30,
}

ACCESS_TOKEN_TTL_SECONDS = int(os.environ.get("ACCESS_TOKEN_TTL_SECONDS", "900"))
REFRESH_TOKEN_TTL_SECONDS = int(os.environ.get("REFRESH_TOKEN_TTL_SECONDS", str(7 * 24 * 3600)))


def _parse_tokens(raw: str) -> dict[str, str]:
    """Parse static token map in format token:role,token:role."""
    result: dict[str, str] = {}
    for entry in raw.split(","):
        item = entry.strip()
        if not item or ":" not in item:
            continue
        token, role = item.split(":", 1)
        token = token.strip()
        role = role.strip().lower()
        if token and role in ROLE_LEVEL:
            result[token] = role
    return result


def auth_enabled() -> bool:
    return os.environ.get("API_AUTH_ENABLED", "false").strip().lower() in {"1", "true", "yes", "on"}


def token_role_map() -> dict[str, str]:
    return _parse_tokens(os.environ.get("API_AUTH_TOKENS", ""))


def _extract_bearer_token() -> str:
    header = request.headers.get("Authorization", "")
    if header.lower().startswith("bearer "):
        return header[7:].strip()
    return ""


def hash_password(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def verify_password(password: str, password_hash: str) -> bool:
    return hash_password(password) == (password_hash or "")


def _serializer() -> URLSafeTimedSerializer:
    secret = current_app.config.get("SECRET_KEY") or os.environ.get("SECRET_KEY", "config-backup-secret-key")
    return URLSafeTimedSerializer(secret_key=secret)


def _issue_token(username: str, role: str, token_type: str, ttl_seconds: int) -> dict[str, Any]:
    now = int(time.time())
    exp = now + ttl_seconds
    jti = uuid.uuid4().hex
    payload = {
        "sub": username,
        "role": role,
        "type": token_type,
        "iat": now,
        "exp": exp,
        "jti": jti,
    }
    token = _serializer().dumps(payload, salt=f"nms-{token_type}")
    return {
        "token": token,
        "jti": jti,
        "expires_at": exp,
        "expires_in": ttl_seconds,
    }


def issue_token_pair(username: str, role: str) -> dict[str, Any]:
    access = _issue_token(username=username, role=role, token_type="access", ttl_seconds=ACCESS_TOKEN_TTL_SECONDS)
    refresh = _issue_token(username=username, role=role, token_type="refresh", ttl_seconds=REFRESH_TOKEN_TTL_SECONDS)
    database.create_auth_session(username=username, refresh_jti=refresh["jti"], expires_at=refresh["expires_at"])
    return {
        "access_token": access["token"],
        "access_expires_in": access["expires_in"],
        "refresh_token": refresh["token"],
        "refresh_expires_in": refresh["expires_in"],
    }


def decode_token(token: str, token_type: str) -> dict[str, Any] | None:
    try:
        payload = _serializer().loads(token, salt=f"nms-{token_type}", max_age=REFRESH_TOKEN_TTL_SECONDS + 60)
    except (BadSignature, BadTimeSignature):
        return None
    except Exception:
        return None

    if payload.get("type") != token_type:
        return None

    exp = int(payload.get("exp", 0))
    if exp <= int(time.time()):
        return None

    jti = payload.get("jti")
    if not jti:
        return None

    if database.is_token_revoked(jti):
        return None

    return payload


def revoke_access_token(token: str) -> bool:
    payload = decode_token(token, "access")
    if not payload:
        return False
    database.add_revoked_token(payload["jti"], "access", int(payload["exp"]))
    return True


def rotate_refresh_token(refresh_token: str) -> dict[str, Any] | None:
    payload = decode_token(refresh_token, "refresh")
    if not payload:
        return None

    session = database.get_auth_session(payload["jti"])
    now_ts = int(time.time())
    if not session or session.get("revoked") or int(session.get("expires_at", 0)) <= now_ts:
        return None

    database.revoke_auth_session(payload["jti"])
    database.add_revoked_token(payload["jti"], "refresh", int(payload["exp"]))
    return issue_token_pair(username=payload["sub"], role=payload["role"])


def revoke_refresh_token(refresh_token: str) -> bool:
    payload = decode_token(refresh_token, "refresh")
    if not payload:
        return False
    database.revoke_auth_session(payload["jti"])
    database.add_revoked_token(payload["jti"], "refresh", int(payload["exp"]))
    return True


def get_request_identity() -> dict[str, Any]:
    identity = getattr(g, "auth_identity", None)
    if isinstance(identity, dict):
        return identity
    return {"username": None, "role": None, "auth_source": "none"}


def _role_ok(role: str, minimum: str) -> bool:
    return ROLE_LEVEL.get(role, -1) >= ROLE_LEVEL.get(minimum, 999)


def _resolve_request_identity() -> dict[str, Any] | None:
    return resolve_token_identity(_extract_bearer_token())


def resolve_token_identity(token: str) -> dict[str, Any] | None:
    """Resolve identity from access token or static API token."""
    if not token:
        return None

    decoded = decode_token(token, "access")
    if decoded and decoded.get("sub") and decoded.get("role") in ROLE_LEVEL:
        return {
            "username": decoded["sub"],
            "role": decoded["role"],
            "auth_source": "access_token",
            "token_jti": decoded.get("jti"),
            "exp": decoded.get("exp"),
        }

    role = token_role_map().get(token)
    if role:
        return {
            "username": "api-token",
            "role": role,
            "auth_source": "static_token",
            "token_jti": None,
            "exp": None,
        }

    return None


def require_role(minimum: str) -> Callable:
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            if not auth_enabled():
                g.auth_identity = {"username": "anonymous", "role": "admin", "auth_source": "auth_disabled"}
                return func(*args, **kwargs)

            identity = _resolve_request_identity()
            if not identity:
                return jsonify({"success": False, "error": "Unauthorized"}), 401

            if not _role_ok(identity.get("role", ""), minimum):
                return jsonify({"success": False, "error": "Forbidden"}), 403

            g.auth_identity = identity
            return func(*args, **kwargs)

        return wrapper

    return decorator
