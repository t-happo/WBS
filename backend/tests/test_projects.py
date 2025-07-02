"""
プロジェクト関連のテスト
"""
import pytest
from fastapi import status
from datetime import datetime, timedelta


@pytest.fixture
def test_project(client, admin_auth_headers):
    """テスト用プロジェクト"""
    response = client.post(
        "/api/v1/projects/",
        headers=admin_auth_headers,
        json={
            "name": "Test Project",
            "description": "Test project description",
            "status": "planning",
            "start_date": datetime.now().isoformat(),
            "end_date": (datetime.now() + timedelta(days=30)).isoformat()
        }
    )
    return response.json()


def test_create_project(client, admin_auth_headers):
    """プロジェクト作成のテスト"""
    response = client.post(
        "/api/v1/projects/",
        headers=admin_auth_headers,
        json={
            "name": "New Project",
            "description": "New project description",
            "status": "planning"
        }
    )
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["name"] == "New Project"
    assert data["description"] == "New project description"
    assert data["status"] == "planning"


def test_create_project_no_auth(client):
    """認証なしでのプロジェクト作成テスト"""
    response = client.post(
        "/api/v1/projects/",
        json={
            "name": "Unauthorized Project",
            "description": "Should fail",
            "status": "planning"
        }
    )
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_list_projects(client, auth_headers, test_project):
    """プロジェクト一覧取得のテスト"""
    response = client.get("/api/v1/projects/", headers=auth_headers)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert len(data) >= 1
    assert any(p["name"] == "Test Project" for p in data)


def test_get_project(client, auth_headers, test_project):
    """プロジェクト詳細取得のテスト"""
    project_id = test_project["id"]
    response = client.get(f"/api/v1/projects/{project_id}", headers=auth_headers)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["id"] == project_id
    assert data["name"] == "Test Project"


def test_update_project(client, admin_auth_headers, test_project):
    """プロジェクト更新のテスト"""
    project_id = test_project["id"]
    response = client.put(
        f"/api/v1/projects/{project_id}",
        headers=admin_auth_headers,
        json={
            "name": "Updated Project",
            "status": "active"
        }
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["name"] == "Updated Project"
    assert data["status"] == "active"


def test_delete_project(client, admin_auth_headers, test_project):
    """プロジェクト削除のテスト"""
    project_id = test_project["id"]
    response = client.delete(
        f"/api/v1/projects/{project_id}",
        headers=admin_auth_headers
    )
    assert response.status_code == status.HTTP_204_NO_CONTENT
    
    # 削除確認
    response = client.get(
        f"/api/v1/projects/{project_id}",
        headers=admin_auth_headers
    )
    assert response.status_code == status.HTTP_404_NOT_FOUND


def test_add_project_member(client, admin_auth_headers, test_project, test_user):
    """プロジェクトメンバー追加のテスト"""
    project_id = test_project["id"]
    response = client.post(
        f"/api/v1/projects/{project_id}/members/{test_user.id}",
        headers=admin_auth_headers,
        json={"role": "developer"}
    )
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["user_id"] == test_user.id
    assert data["project_id"] == project_id
    assert data["role"] == "developer"


def test_list_project_members(client, auth_headers, test_project):
    """プロジェクトメンバー一覧取得のテスト"""
    project_id = test_project["id"]
    response = client.get(
        f"/api/v1/projects/{project_id}/members",
        headers=auth_headers
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert isinstance(data, list)