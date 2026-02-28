#!/usr/bin/env python3
"""
Network Discovery API

Lightweight discovery service used by:
- Enterprise dashboard (/enterprise)
- Config-backup discover-and-backup workflow
- Legacy discovery.html
"""

import ipaddress
import os
import platform
import socket
import subprocess
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any

from flask import Flask, jsonify, request
from flask_cors import CORS
from auth import require_role


MAX_HOSTS = int(os.environ.get("DISCOVERY_MAX_HOSTS", "1024"))
PING_TIMEOUT_MS = int(os.environ.get("DISCOVERY_PING_TIMEOUT_MS", "900"))
SCAN_WORKERS = int(os.environ.get("DISCOVERY_WORKERS", "64"))


app = Flask(__name__)
APP_ENV = os.environ.get("APP_ENV", "development").strip().lower()
cors_origins = os.environ.get("CORS_ORIGINS", "*")
if cors_origins.strip() == "*":
    origins = ["*"] if APP_ENV == "development" else []
else:
    origins = [origin.strip() for origin in cors_origins.split(",") if origin.strip()]
CORS(app, origins=origins or ["http://localhost:5173"])


def _build_targets(network_value: str) -> tuple[list[str], str]:
    """
    Build list of IPs to scan from CIDR or single IP.
    """
    raw = network_value.strip()
    if not raw:
        raise ValueError("Network value is required")

    if "/" in raw:
        net = ipaddress.ip_network(raw, strict=False)
    else:
        net = ipaddress.ip_network(f"{raw}/32", strict=False)

    if isinstance(net, ipaddress.IPv6Network):
        raise ValueError("IPv6 is not supported in this discovery service")

    hosts = [str(ip) for ip in net.hosts()] if net.prefixlen < 32 else [str(net.network_address)]
    if len(hosts) > MAX_HOSTS:
        raise ValueError(f"Subnet too large: {len(hosts)} hosts (max {MAX_HOSTS})")

    return hosts, str(net)


def _ping(ip: str) -> bool:
    system = platform.system().lower()
    if "windows" in system:
        cmd = ["ping", "-n", "1", "-w", str(PING_TIMEOUT_MS), ip]
    else:
        # -W timeout is in seconds on Linux/macOS for most ping versions.
        cmd = ["ping", "-c", "1", "-W", str(max(1, PING_TIMEOUT_MS // 1000)), ip]

    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=3)
        return result.returncode == 0
    except Exception:
        return False


def _resolve_hostname(ip: str) -> str:
    try:
        return socket.gethostbyaddr(ip)[0]
    except Exception:
        return ""


def _scan_host(ip: str) -> dict[str, Any] | None:
    if not _ping(ip):
        return None

    hostname = _resolve_hostname(ip)
    return {
        "ip": ip,
        "hostname": hostname or ip,
        "model": "Unknown",
        "uptime": "Unknown",
        "vendor": "Unknown",
    }


@app.route("/api/discover", methods=["POST"])
@require_role("operator")
def discover() -> Any:
    payload = request.get_json(silent=True) or {}
    network_value = str(payload.get("network", "")).strip()
    sync = bool(payload.get("sync", False))

    try:
        targets, normalized = _build_targets(network_value)
    except ValueError as exc:
        return jsonify({"success": False, "error": str(exc)}), 400

    started = time.time()
    devices: list[dict[str, Any]] = []

    with ThreadPoolExecutor(max_workers=SCAN_WORKERS) as executor:
        futures = {executor.submit(_scan_host, ip): ip for ip in targets}
        for future in as_completed(futures):
            device = future.result()
            if device:
                devices.append(device)

    devices.sort(key=lambda d: tuple(int(part) for part in d["ip"].split(".")))
    elapsed_ms = int((time.time() - started) * 1000)

    return jsonify(
        {
            "success": True,
            "sync": sync,
            "network": normalized,
            "total_scanned": len(targets),
            "devices_found": len(devices),
            "scan_time_ms": elapsed_ms,
            "devices": devices,
        }
    )


@app.route("/api/health", methods=["GET"])
@require_role("viewer")
def health() -> Any:
    return jsonify(
        {
            "success": True,
            "service": "discovery",
            "status": "healthy",
            "workers": SCAN_WORKERS,
            "max_hosts": MAX_HOSTS,
        }
    )


if __name__ == "__main__":
    port = int(os.environ.get("DISCOVERY_PORT", "5004"))
    debug_mode = APP_ENV == "development"
    app.run(host="0.0.0.0", port=port, debug=debug_mode)
