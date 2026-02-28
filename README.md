# NetCore

Unified network operations platform for sysadmin, system engineering, and network architecture workflows.

## Overview

NetCore provides a single UI at `http://localhost:5173` with integrated services for:

- device inventory and operational dashboard
- SSH terminal service integration
- network discovery
- backup and configuration workflows
- monitoring and runtime action visibility
- authentication, roles, and audit capabilities

The project is designed to run with a single command in local enterprise mode.

## Current Architecture

- `apps/ssh-terminal/frontend`: React/Vite unified dashboard (single view)
- `apps/ssh-terminal/backend`: Node.js SSH websocket backend
- `apps/config-backup`: Flask API for backups, auth, and audit
- `apps/discovery`: Flask discovery API
- `run-enterprise.py`: one-command bootstrap and service orchestrator

Default local ports:

- `5173`: unified web UI
- `3000`: SSH backend
- `5003`: config-backup API (includes auth endpoints)
- `5004`: discovery API

## Core Capabilities

- single in-app navigation without legacy page switching
- first-run setup and login UI
- role model: `admin`, `operator`, `viewer`
- access/refresh token flow with revocation support
- centralized token introspection for cross-service auth checks
- audit log persistence for security-sensitive actions
- one-command startup with dependency bootstrap

## Requirements

- Python `3.10+`
- Node.js `18+`
- npm available in `PATH`
- Windows, Linux, or macOS

## Quick Start

From repository root:

```bash
python run-enterprise.py
```

What it does:

- creates `.venv` if missing
- installs Python dependencies from `requirements-enterprise.txt`
- installs Node dependencies for `apps/ssh-terminal`
- starts all services

Open:

- `http://localhost:5173`

## Authentication Model

Primary auth is handled by `apps/config-backup`:

- `POST /api/auth/bootstrap`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/auth/audit`
- `POST /api/auth/introspect`

Discovery and SSH backend validate bearer tokens through centralized introspection, with optional static-token fallback for compatibility.

## Configuration

Copy and edit environment file:

```bash
cp .env.example .env
```

Relevant variables:

- `APP_ENV`
- `SECRET_KEY`
- `SESSION_SECRET`
- `API_AUTH_ENABLED`
- `API_AUTH_TOKENS`
- `ACCESS_TOKEN_TTL_SECONDS`
- `REFRESH_TOKEN_TTL_SECONDS`
- `AUTH_INTROSPECT_URL`
- `CORS_ORIGINS`

## Repository Structure

- `apps/config-backup`
- `apps/discovery`
- `apps/ssh-terminal/backend`
- `apps/ssh-terminal/frontend`
- `scripts`
- `.env.example`
- `requirements-enterprise.txt`
- `run-enterprise.py`

## Security Notes

- set strong production secrets (`SECRET_KEY`, `SESSION_SECRET`)
- do not commit `.env` files with real credentials
- prefer HTTPS and a reverse proxy in production environments
- review audit logs regularly

## Roadmap

- full user and role management UI
- advanced policy/compliance engine
- scheduled jobs and orchestration improvements
- CI/CD, test coverage, and release pipeline hardening

## License

See [LICENSE](LICENSE).
