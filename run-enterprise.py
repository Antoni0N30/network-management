#!/usr/bin/env python3
"""
Enterprise one-command launcher.

What it does:
1. Ensures pip availability (ensurepip fallback).
2. Creates/uses local .venv.
3. Installs Python deps for backend services.
4. Installs Node deps for ssh-terminal workspace.
5. Starts all services and streams logs with prefixes.
"""

from __future__ import annotations

import asyncio
import os
import signal
import shutil
import socket
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Sequence


ROOT = Path(__file__).resolve().parent
VENV_DIR = ROOT / ".venv"
PY_REQ = ROOT / "requirements-enterprise.txt"


@dataclass
class Service:
  name: str
  cmd: Sequence[str]
  cwd: Path
  env: dict[str, str] | None = None
  port: int | None = None


def resolve_npm_cmd() -> str:
  candidates = [
    shutil.which("npm"),
    shutil.which("npm.cmd"),
    r"C:\Program Files\nodejs\npm.cmd",
  ]
  for candidate in candidates:
    if candidate and Path(candidate).exists():
      return candidate
  raise FileNotFoundError(
    "npm non trovato. Installa Node.js oppure aggiungi npm al PATH "
    "(esempio: C:\\Program Files\\nodejs)."
  )


def run_step(cmd: Sequence[str], cwd: Path | None = None) -> None:
  print(f"[setup] {' '.join(cmd)}")
  subprocess.run(cmd, cwd=str(cwd) if cwd else None, check=True)


def is_port_in_use(port: int) -> bool:
  with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
    s.settimeout(0.4)
    return s.connect_ex(("127.0.0.1", port)) == 0


def ensure_pip() -> None:
  try:
    subprocess.run([sys.executable, "-m", "pip", "--version"], check=True, capture_output=True)
  except subprocess.CalledProcessError:
    print("[setup] pip non trovato, avvio ensurepip...")
    run_step([sys.executable, "-m", "ensurepip", "--upgrade"])


def venv_python() -> Path:
  if os.name == "nt":
    return VENV_DIR / "Scripts" / "python.exe"
  return VENV_DIR / "bin" / "python"


def ensure_venv_and_python_deps() -> Path:
  ensure_pip()

  if not VENV_DIR.exists():
    run_step([sys.executable, "-m", "venv", str(VENV_DIR)], cwd=ROOT)

  py = venv_python()
  if not py.exists():
    raise RuntimeError(f"Python virtualenv non trovato: {py}")

  run_step([str(py), "-m", "pip", "install", "--upgrade", "pip"], cwd=ROOT)
  run_step([str(py), "-m", "pip", "install", "-r", str(PY_REQ)], cwd=ROOT)
  return py


def ensure_node_deps() -> None:
  ssh_root = ROOT / "apps" / "ssh-terminal"
  npm_cmd = resolve_npm_cmd()
  run_step([npm_cmd, "install"], cwd=ssh_root)


async def stream_output(name: str, stream: asyncio.StreamReader) -> None:
  while True:
    line = await stream.readline()
    if not line:
      break
    text = line.decode(errors="replace").rstrip()
    if text:
      print(f"[{name}] {text}")


async def run_services(py: Path) -> int:
  ssh_root = ROOT / "apps" / "ssh-terminal"
  npm_cmd = resolve_npm_cmd()
  app_env = os.environ.get("APP_ENV", "production").strip().lower()
  api_auth_enabled = os.environ.get("API_AUTH_ENABLED", "true")
  api_auth_tokens = os.environ.get(
    "API_AUTH_TOKENS",
    "admin-token:admin,operator-token:operator,viewer-token:viewer",
  )
  cors_origins = os.environ.get("CORS_ORIGINS", "http://localhost:5173")
  session_secret = os.environ.get("SESSION_SECRET", "enterprise-local-session-secret-2026")
  flask_secret = os.environ.get("SECRET_KEY", "enterprise-local-flask-secret-2026")
  auth_introspect_url = os.environ.get("AUTH_INTROSPECT_URL", "http://localhost:5003/api/auth/introspect")

  all_services = [
    Service(
      name="discovery",
      cmd=[str(py), "apps/discovery/run.py"],
      cwd=ROOT,
      env={
        "APP_ENV": app_env,
        "API_AUTH_ENABLED": api_auth_enabled,
        "API_AUTH_TOKENS": api_auth_tokens,
        "AUTH_INTROSPECT_URL": auth_introspect_url,
        "CORS_ORIGINS": cors_origins,
      },
      port=5004,
    ),
    Service(
      name="config-backup",
      cmd=[str(py), "apps/config-backup/app.py"],
      cwd=ROOT,
      env={
        "APP_ENV": app_env,
        "SECRET_KEY": flask_secret,
        "DISCOVERY_API_URL": "http://localhost:5004/api/discover",
        "API_AUTH_ENABLED": api_auth_enabled,
        "API_AUTH_TOKENS": api_auth_tokens,
        "CORS_ORIGINS": cors_origins,
      },
      port=5003,
    ),
    Service(
      name="ssh-backend",
      cmd=[npm_cmd, "run", "dev:backend"],
      cwd=ssh_root,
      env={
        "NODE_ENV": "production" if app_env == "production" else "development",
        "SESSION_SECRET": session_secret,
        "FRONTEND_URL": "http://localhost:5173",
        "API_AUTH_ENABLED": api_auth_enabled,
        "API_AUTH_TOKENS": api_auth_tokens,
        "AUTH_INTROSPECT_URL": auth_introspect_url,
      },
      port=3000,
    ),
    Service(
      name="ssh-frontend",
      cmd=[npm_cmd, "run", "dev:frontend"],
      cwd=ssh_root,
      port=5173,
    ),
  ]

  services: list[Service] = []
  for svc in all_services:
    if svc.port and is_port_in_use(svc.port):
      print(f"[info] Porta {svc.port} già in uso, uso servizio esistente: {svc.name}")
      continue
    services.append(svc)

  processes: list[tuple[Service, asyncio.subprocess.Process]] = []
  readers: list[asyncio.Task[None]] = []

  print("\n[info] Avvio servizi enterprise...")
  print("[info] UI Unified:      http://localhost:5173")
  print("[info] Config Backup:   http://localhost:5003")
  print("[info] Discovery API:   http://localhost:5004/api/health\n")

  if not services:
    print("[info] Tutti i servizi risultano già attivi sulle porte standard.")
    print("[info] Premi CTRL+C per uscire.")
    stop_event = asyncio.Event()

    def _handle_stop(*_: object) -> None:
      stop_event.set()

    loop = asyncio.get_running_loop()
    for sig in (signal.SIGINT, signal.SIGTERM):
      try:
        loop.add_signal_handler(sig, _handle_stop)
      except NotImplementedError:
        pass
    await stop_event.wait()
    return 0

  for s in services:
    env = os.environ.copy()
    if s.env:
      env.update(s.env)
    proc = await asyncio.create_subprocess_exec(
      *s.cmd,
      cwd=str(s.cwd),
      env=env,
      stdout=asyncio.subprocess.PIPE,
      stderr=asyncio.subprocess.STDOUT,
    )
    processes.append((s, proc))
    assert proc.stdout is not None
    readers.append(asyncio.create_task(stream_output(s.name, proc.stdout)))

  stop_event = asyncio.Event()

  def _handle_stop(*_: object) -> None:
    stop_event.set()

  loop = asyncio.get_running_loop()
  for sig in (signal.SIGINT, signal.SIGTERM):
    try:
      loop.add_signal_handler(sig, _handle_stop)
    except NotImplementedError:
      pass

  waiter_tasks = [asyncio.create_task(proc.wait()) for _, proc in processes]
  stop_task = asyncio.create_task(stop_event.wait())
  done, _ = await asyncio.wait(
    waiter_tasks + [stop_task],
    return_when=asyncio.FIRST_COMPLETED,
  )

  exit_code = 0
  if stop_task not in done:
    for i, task in enumerate(waiter_tasks):
      if task in done and task.result() != 0:
        exit_code = task.result()
        print(f"[error] Servizio terminato con codice {exit_code}: {services[i].name}")
        break

  print("\n[info] Arresto servizi...")
  for _, proc in processes:
    if proc.returncode is None:
      proc.terminate()

  await asyncio.sleep(1.2)
  for _, proc in processes:
    if proc.returncode is None:
      proc.kill()

  for task in readers:
    task.cancel()
  await asyncio.gather(*readers, return_exceptions=True)
  return exit_code


def main() -> int:
  try:
    py = ensure_venv_and_python_deps()
    ensure_node_deps()
    return asyncio.run(run_services(py))
  except subprocess.CalledProcessError as exc:
    print(f"[fatal] Comando fallito (exit {exc.returncode}): {exc.cmd}")
    return exc.returncode
  except Exception as exc:
    print(f"[fatal] {exc}")
    return 1


if __name__ == "__main__":
  raise SystemExit(main())
