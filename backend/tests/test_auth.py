"""
認証関連のテスト
"""
import pytest
from fastapi import status


def test_create_user(client, db):
    """ユーザー作成のテスト"""
    response = client.post(
        "/api/v1/users/",
        json={
            "email": "newuser@example.com",
            "username": "newuser",
            "password": "newpass123",
            "full_name": "New User",
            "role": "team_member"
        }
    )
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["email"] == "newuser@example.com"
    assert data["username"] == "newuser"
    assert data["role"] == "team_member"
    assert "hashed_password" not in data


def test_login_success(client, test_user):
    """ログイン成功のテスト"""
    response = client.post(
        "/api/v1/users/login/simple",
        json={"username": "testuser", "password": "testpass123"}
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


def test_login_wrong_password(client, test_user):
    """パスワード間違いのテスト"""
    response = client.post(
        "/api/v1/users/login/simple",
        json={"username": "testuser", "password": "wrongpass"}
    )
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_login_nonexistent_user(client):
    """存在しないユーザーでのログインテスト"""
    response = client.post(
        "/api/v1/users/login/simple",
        json={"username": "nonexistent", "password": "anypass"}
    )
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_get_current_user(client, auth_headers):
    """現在のユーザー情報取得のテスト"""
    response = client.get("/api/v1/users/me", headers=auth_headers)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["email"] == "test@example.com"
    assert data["username"] == "testuser"


def test_get_current_user_no_auth(client):
    """認証なしでのユーザー情報取得テスト"""
    response = client.get("/api/v1/users/me")
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_update_user(client, auth_headers):
    """ユーザー情報更新のテスト"""
    response = client.put(
        "/api/v1/users/me",
        headers=auth_headers,
        json={"full_name": "Updated Name"}
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["full_name"] == "Updated Name"


def test_list_users_admin_only(client, admin_auth_headers, auth_headers):
    """ユーザー一覧取得のテスト（管理者のみ）"""
    # 管理者でアクセス
    response = client.get("/api/v1/users/", headers=admin_auth_headers)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert len(data) >= 1
    
    # 一般ユーザーでアクセス
    response = client.get("/api/v1/users/", headers=auth_headers)
    assert response.status_code == status.HTTP_403_FORBIDDEN