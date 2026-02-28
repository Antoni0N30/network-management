#!/usr/bin/env python3
"""Run discovery API service."""

import os

from app import app


if __name__ == "__main__":
    app_env = os.environ.get("APP_ENV", "development").strip().lower()
    app.run(host="0.0.0.0", port=5004, debug=(app_env == "development"))
