from __future__ import annotations

import pytest  # type: ignore

# Ensure backend app can be imported when tests executed from project root
import os
import sys

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_APP_DIR = os.path.join(os.path.dirname(CURRENT_DIR), "backend", "app")
if BACKEND_APP_DIR not in sys.path:
    sys.path.append(BACKEND_APP_DIR)

from app.crud import user as crud_user  # type: ignore  # noqa: E402
from app.models import UserRole  # type: ignore  # noqa: E402
from app.schemas.user import UserCreate  # type: ignore  # noqa: E402


@pytest.mark.usefixtures("db_session")
def test_create_and_authenticate_user(db_session):
    """Create a user and verify authentication utilities."""
    user_in = UserCreate(
        username="johndoe",
        email="john@example.com",
        full_name="John Doe",
        password="secret123",
        role=UserRole.SYSTEM_ADMIN,
    )

    created = crud_user.create(db_session, obj_in=user_in)

    assert created.id is not None
    assert created.username == "johndoe"
    assert created.created_at is not None

    # Authentication should succeed with correct password
    authenticated = crud_user.authenticate(db_session, username="johndoe", password="secret123")
    assert authenticated is not None
    assert authenticated.id == created.id

    # Wrong password returns None
    assert crud_user.authenticate(db_session, username="johndoe", password="wrong") is None

    # Role helpers
    assert crud_user.is_active(created)
    assert crud_user.is_admin(created)