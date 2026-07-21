import os
from unittest.mock import MagicMock

import pymysql

# app.py connects to MySQL at import time (module-level `db = Database()`) and
# reads these env vars, so both must be satisfied before importing app.
os.environ.setdefault("FLASK_KEY", "test-key")
os.environ.setdefault("EXPRESS_SECRET", "test-secret")
os.environ.setdefault("PUSH_PUBLIC_KEY", "test-public")
os.environ.setdefault("PUSH_PRIVATE_KEY", "test-private")
os.environ.setdefault("MYSQL_HOST", "localhost")
os.environ.setdefault("MYSQL_USER", "test")
os.environ.setdefault("MYSQL_PASSWORD", "test")
os.environ.setdefault("MYSQL_DATABASE", "test")

pymysql.connect = MagicMock()  # type: ignore[assignment]
