"""Authentication and role helpers for Discovery API."""

from __future__ import annotations

import os
from functools import wraps
from typing import Callable

from flask import jsonify, request
import requests


ROLE_LEVEL = {
    "viewer": 10,
    "operator": 20,
    "admin": 30,
}


def _parse_tokens(raw: str) -> dict[str, str]:
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


def auth_introspect_url() -> str:
    return os.environ.get("AUTH_INTROSPECT_URL", "http://localhost:5003/api/auth/introspect").strip()


def _extract_bearer_token() -> str:
    header = request.headers.get("Authorization", "")
    if header.lower().startswith("bearer "):
        return header[7:].strip()
    return ""


def _resolve_request_role() -> str | None:
    token = _extract_bearer_token()
    if not token:
        return None
    # 1) Central auth introspection (preferred)
    try:
        response = requests.post(
            auth_introspect_url(),
            json={"token": token},
            timeout=float(os.environ.get("AUTH_INTROSPECT_TIMEOUT", "3")),
        )
        if response.status_code == 200:
            payload = response.json()
            role = str(payload.get("role", "")).strip().lower()
            if role in ROLE_LEVEL:
                return role
    except Exception:
        pass

    # 2) Static token fallback
    return token_role_map().get(token)


def _role_ok(role: str, minimum: str) -> bool:
    return ROLE_LEVEL.get(role, -1) >= ROLE_LEVEL.get(minimum, 999)


def require_role(minimum: str) -> Callable:
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            if not auth_enabled():
                return func(*args, **kwargs)

            role = _resolve_request_role()
            if not role:
                return jsonify({"success": False, "error": "Unauthorized"}), 401

            if not _role_ok(role, minimum):
                return jsonify({"success": False, "error": "Forbidden"}), 403

            return func(*args, **kwargs)

        return wrapper

    return decorator
