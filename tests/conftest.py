"""
Test configuration and fixtures for pytest.
"""

import pytest
import os
import tempfile
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.app.main import app
from backend.app.database import get_db, Base
from backend.app.models.models import User, UserRole
from backend.app.core.security import get_password_hash


@pytest.fixture
def test_db():
    """Create a temporary test database for each test."""
    # Create temporary database
    db_fd, db_path = tempfile.mkstemp(suffix=".db")
    os.close(db_fd)
    
    # Create test engine
    engine = create_engine(f"sqlite:///{db_path}", connect_args={"check_same_thread": False})
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    
    # Create all tables
    Base.metadata.create_all(bind=engine)
    
    yield TestingSessionLocal, engine
    
    # Cleanup
    try:
        os.unlink(db_path)
    except FileNotFoundError:
        pass


@pytest.fixture
def db_session(test_db):
    """Create a fresh database session for each test."""
    TestingSessionLocal, engine = test_db
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def client(test_db):
    """Create a test client with test database."""
    TestingSessionLocal, engine = test_db
    
    def override_get_db():
        session = TestingSessionLocal()
        try:
            yield session
        finally:
            session.close()
    
    app.dependency_overrides[get_db] = override_get_db
    
    with TestClient(app) as test_client:
        yield test_client
    
    app.dependency_overrides.clear()


@pytest.fixture
def system_admin_user(db_session):
    """Create a system admin user for testing."""
    admin_user = User(
        username="testadmin",
        email="testadmin@example.com",
        full_name="Test Administrator",
        hashed_password=get_password_hash("testpass123"),
        role=UserRole.SYSTEM_ADMIN,
        is_active=True
    )
    db_session.add(admin_user)
    db_session.commit()
    db_session.refresh(admin_user)
    return admin_user


@pytest.fixture
def regular_user(db_session):
    """Create a regular user for testing."""
    user = User(
        username="testuser",
        email="testuser@example.com",
        full_name="Test User",
        hashed_password=get_password_hash("testpass123"),
        role=UserRole.TEAM_MEMBER,
        is_active=True
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def auth_headers(client, system_admin_user):
    """Get authentication headers for system admin."""
    response = client.post("/api/v1/users/login/simple", json={
        "username": "testadmin",
        "password": "testpass123"
    })
    assert response.status_code == 200
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def regular_auth_headers(client, regular_user):
    """Get authentication headers for regular user."""
    response = client.post("/api/v1/users/login/simple", json={
        "username": "testuser",
        "password": "testpass123"
    })
    assert response.status_code == 200
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}