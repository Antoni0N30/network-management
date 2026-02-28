"""Authentication and audit endpoints for enterprise mode."""

from __future__ import annotations

import time
from flask import Blueprint, jsonify, request

# Support both module and standalone execution
try:
    from . import database
    from .auth import (
        auth_enabled,
        hash_password,
        issue_token_pair,
        require_role,
        revoke_access_token,
        revoke_refresh_token,
        rotate_refresh_token,
        verify_password,
        get_request_identity,
        resolve_token_identity,
    )
except ImportError:
    import database
    from auth import (
        auth_enabled,
        hash_password,
        issue_token_pair,
        require_role,
        revoke_access_token,
        revoke_refresh_token,
        rotate_refresh_token,
        verify_password,
        get_request_identity,
        resolve_token_identity,
    )


bp = Blueprint("auth_api", __name__, url_prefix="/api/auth")


def _client_ip() -> str:
    return request.headers.get("X-Forwarded-For", "").split(",")[0].strip() or request.remote_addr or ""


def _audit(action: str, outcome: str, username: str | None = None, role: str | None = None, details: dict | None = None) -> None:
    database.add_audit_log(
        action=action,
        outcome=outcome,
        username=username,
        role=role,
        resource="auth",
        ip_address=_client_ip(),
        details=details or {},
    )


@bp.route("/bootstrap", methods=["POST"])
def bootstrap():
    """Create initial admin user once."""
    payload = request.get_json(silent=True) or {}
    username = str(payload.get("username", "")).strip()
    password = str(payload.get("password", ""))
    role = str(payload.get("role", "admin")).strip().lower() or "admin"

    if auth_enabled() and database.count_users() > 0:
        return jsonify({"success": False, "error": "Bootstrap already completed"}), 409

    if not username:
        return jsonify({"success": False, "error": "Username is required"}), 400
    if len(password) < 8:
        return jsonify({"success": False, "error": "Password must be at least 8 characters"}), 400
    if role not in {"admin", "operator", "viewer"}:
        return jsonify({"success": False, "error": "Invalid role"}), 400

    if database.get_user_by_username(username):
        return jsonify({"success": False, "error": "User already exists"}), 409

    database.create_user(username=username, password_hash=hash_password(password), role=role)
    _audit("auth.bootstrap", "success", username=username, role=role)
    return jsonify({"success": True, "username": username, "role": role})


@bp.route("/login", methods=["POST"])
def login():
    payload = request.get_json(silent=True) or {}
    username = str(payload.get("username", "")).strip()
    password = str(payload.get("password", ""))

    user = database.get_user_by_username(username)
    if not user or not int(user.get("is_active", 0)):
        _audit("auth.login", "failed", username=username, details={"reason": "user_not_found_or_inactive"})
        return jsonify({"success": False, "error": "Invalid credentials"}), 401

    if not verify_password(password, user.get("password_hash", "")):
        _audit("auth.login", "failed", username=username, role=user.get("role"), details={"reason": "bad_password"})
        return jsonify({"success": False, "error": "Invalid credentials"}), 401

    tokens = issue_token_pair(username=user["username"], role=user["role"])
    _audit("auth.login", "success", username=user["username"], role=user["role"])
    return jsonify(
        {
            "success": True,
            "user": {"username": user["username"], "role": user["role"]},
            **tokens,
        }
    )


@bp.route("/refresh", methods=["POST"])
def refresh():
    payload = request.get_json(silent=True) or {}
    refresh_token = str(payload.get("refresh_token", "")).strip()
    if not refresh_token:
        return jsonify({"success": False, "error": "refresh_token is required"}), 400

    tokens = rotate_refresh_token(refresh_token)
    if not tokens:
        _audit("auth.refresh", "failed", details={"reason": "invalid_refresh"})
        return jsonify({"success": False, "error": "Invalid refresh token"}), 401

    _audit("auth.refresh", "success")
    return jsonify({"success": True, **tokens})


@bp.route("/me", methods=["GET"])
@require_role("viewer")
def me():
    identity = get_request_identity()
    database.purge_expired_auth_rows(now_ts=int(time.time()))
    return jsonify(
        {
            "success": True,
            "user": {
                "username": identity.get("username"),
                "role": identity.get("role"),
                "auth_source": identity.get("auth_source"),
            },
        }
    )


@bp.route("/logout", methods=["POST"])
@require_role("viewer")
def logout():
    payload = request.get_json(silent=True) or {}
    refresh_token = str(payload.get("refresh_token", "")).strip()

    access_ok = revoke_access_token(request.headers.get("Authorization", "").replace("Bearer ", "").strip())
    refresh_ok = revoke_refresh_token(refresh_token) if refresh_token else False

    identity = get_request_identity()
    _audit("auth.logout", "success", username=identity.get("username"), role=identity.get("role"))
    return jsonify({"success": True, "revoked": {"access": access_ok, "refresh": refresh_ok}})


@bp.route("/audit", methods=["GET"])
@require_role("viewer")
def audit_logs():
    limit = int(request.args.get("limit", 100))
    offset = int(request.args.get("offset", 0))
    username = request.args.get("username")
    action = request.args.get("action")

    logs = database.get_audit_logs(limit=max(1, min(limit, 500)), offset=max(0, offset), username=username, action=action)
    return jsonify({"success": True, "logs": logs, "count": len(logs)})


@bp.route("/introspect", methods=["POST"])
def introspect():
    """
    Validate token and return resolved role.
    Accepts bearer token or JSON body {token}.
    """
    payload = request.get_json(silent=True) or {}
    token = str(payload.get("token", "")).strip()
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.lower().startswith("bearer "):
            token = auth_header[7:].strip()

    identity = resolve_token_identity(token)
    if not identity:
        return jsonify({"success": False, "active": False}), 401

    return jsonify(
        {
            "success": True,
            "active": True,
            "username": identity.get("username"),
            "role": identity.get("role"),
            "auth_source": identity.get("auth_source"),
            "exp": identity.get("exp"),
        }
    )
