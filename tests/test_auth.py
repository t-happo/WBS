"""
Tests for authentication functionality.
"""

import pytest
from backend.app.models.models import UserRole


class TestAuthentication:
    """Test authentication endpoints."""
    
    def test_login_success(self, client, system_admin_user):
        """Test successful login."""
        response = client.post("/api/v1/users/login/simple", json={
            "username": "testadmin",
            "password": "testpass123"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert data["user"]["username"] == "testadmin"
        assert data["user"]["role"] == UserRole.SYSTEM_ADMIN
    
    def test_login_invalid_username(self, client, system_admin_user):
        """Test login with invalid username."""
        response = client.post("/api/v1/users/login/simple", json={
            "username": "wronguser",
            "password": "testpass123"
        })
        
        assert response.status_code == 401
        assert "Incorrect username or password" in response.json()["detail"]
    
    def test_login_invalid_password(self, client, system_admin_user):
        """Test login with invalid password."""
        response = client.post("/api/v1/users/login/simple", json={
            "username": "testadmin",
            "password": "wrongpassword"
        })
        
        assert response.status_code == 401
        assert "Incorrect username or password" in response.json()["detail"]
    
    def test_login_inactive_user(self, client, db_session):
        """Test login with inactive user."""
        from backend.app.models.models import User
        from backend.app.core.security import get_password_hash
        
        # Create inactive user
        inactive_user = User(
            username="inactive",
            email="inactive@example.com",
            full_name="Inactive User",
            hashed_password=get_password_hash("testpass123"),
            role=UserRole.TEAM_MEMBER,
            is_active=False
        )
        db_session.add(inactive_user)
        db_session.commit()
        
        response = client.post("/api/v1/users/login/simple", json={
            "username": "inactive",
            "password": "testpass123"
        })
        
        assert response.status_code == 400
        assert "Inactive user" in response.json()["detail"]
    
    def test_protected_endpoint_without_token(self, client):
        """Test accessing protected endpoint without token."""
        response = client.get("/api/v1/users/me")
        assert response.status_code == 403
    
    def test_protected_endpoint_with_token(self, client, auth_headers):
        """Test accessing protected endpoint with valid token."""
        response = client.get("/api/v1/users/me", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["username"] == "testadmin"
        assert data["role"] == UserRole.SYSTEM_ADMIN
    
    def test_protected_endpoint_invalid_token(self, client):
        """Test accessing protected endpoint with invalid token."""
        headers = {"Authorization": "Bearer invalid_token"}
        response = client.get("/api/v1/users/me", headers=headers)
        assert response.status_code == 401


class TestUserRegistration:
    """Test user registration functionality."""
    
    def test_create_user_as_admin(self, client, auth_headers):
        """Test creating a new user as admin."""
        user_data = {
            "username": "newuser",
            "email": "newuser@example.com",
            "full_name": "New User",
            "password": "newpass123",
            "role": UserRole.TEAM_MEMBER
        }
        
        response = client.post("/api/v1/users/", json=user_data, headers=auth_headers)
        assert response.status_code == 201
        
        data = response.json()
        assert data["username"] == "newuser"
        assert data["email"] == "newuser@example.com"
        assert data["role"] == UserRole.TEAM_MEMBER
        assert "password" not in data  # Password should not be returned
    
    def test_create_user_duplicate_username(self, client, auth_headers, system_admin_user):
        """Test creating user with duplicate username."""
        user_data = {
            "username": "testadmin",  # Same as existing user
            "email": "another@example.com",
            "full_name": "Another User",
            "password": "pass123",
            "role": UserRole.TEAM_MEMBER
        }
        
        response = client.post("/api/v1/users/", json=user_data, headers=auth_headers)
        assert response.status_code == 400
    
    def test_create_user_duplicate_email(self, client, auth_headers, system_admin_user):
        """Test creating user with duplicate email."""
        user_data = {
            "username": "anotheruser",
            "email": "testadmin@example.com",  # Same as existing user
            "full_name": "Another User",
            "password": "pass123",
            "role": UserRole.TEAM_MEMBER
        }
        
        response = client.post("/api/v1/users/", json=user_data, headers=auth_headers)
        assert response.status_code == 400
    
    def test_create_user_unauthorized(self, client, regular_auth_headers):
        """Test creating user without admin privileges."""
        user_data = {
            "username": "newuser",
            "email": "newuser@example.com",
            "full_name": "New User",
            "password": "newpass123",
            "role": UserRole.TEAM_MEMBER
        }
        
        response = client.post("/api/v1/users/", json=user_data, headers=regular_auth_headers)
        assert response.status_code == 403