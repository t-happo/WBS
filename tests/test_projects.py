from __future__ import annotations

import os
import sys

import pytest  # type: ignore

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_APP_DIR = os.path.join(os.path.dirname(CURRENT_DIR), "backend", "app")
if BACKEND_APP_DIR not in sys.path:
    sys.path.append(BACKEND_APP_DIR)

from app.crud import user as crud_user  # type: ignore  # noqa: E402
from app.crud import project as crud_project  # type: ignore  # noqa: E402
from app.models import UserRole  # type: ignore  # noqa: E402
from app.schemas.user import UserCreate  # type: ignore  # noqa: E402
from app.schemas.project import ProjectCreate, ProjectUpdate  # type: ignore  # noqa: E402


@pytest.mark.usefixtures("db_session")
def test_project_lifecycle(db_session):
    """Create, read, update, and delete a project."""
    # 1. Create an owner user
    owner_in = UserCreate(
        username="owner",
        email="owner@example.com",
        full_name="Owner User",
        password="ownerpw",
        role=UserRole.PROJECT_OWNER,
    )
    owner = crud_user.create(db_session, obj_in=owner_in)

    # 2. Create project
    proj_in = ProjectCreate(name="New Project", description="Initial Desc")
    project = crud_project.create_with_owner(db_session, obj_in=proj_in, owner_id=owner.id)

    assert project.id is not None
    assert project.owner_id == owner.id
    assert project.name == "New Project"

    # 3. Fetch project
    fetched = crud_project.get(db_session, id=project.id)
    assert fetched is not None
    assert fetched.description == "Initial Desc"

    # 4. Update project
    upd_in = ProjectUpdate(description="Updated Desc")
    updated = crud_project.update(db_session, db_obj=fetched, obj_in=upd_in)
    assert updated.description == "Updated Desc"

    # 5. Delete project
    crud_project.remove(db_session, id=project.id)
    assert crud_project.get(db_session, id=project.id) is None