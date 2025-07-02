# ruff/mypy may not find these third-party modules in static analysis environments.
import os
import sys
import pytest  # type: ignore

# Ensure backend/app is importable when tests run from project root
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(os.path.dirname(CURRENT_DIR), "backend")
APP_DIR = os.path.join(BACKEND_DIR, "app")
if APP_DIR not in sys.path:
    sys.path.append(APP_DIR)

# Local application imports – ignore resolution errors during linting
from app.database import create_tables, drop_tables, SessionLocal  # type: ignore # noqa: E402


@pytest.fixture(scope="function", autouse=True)
def db_session():
    """Provide a transactional database session for a test and ensure clean slate."""
    # Recreate tables for each test function to guarantee isolation
    drop_tables()
    create_tables()

    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()