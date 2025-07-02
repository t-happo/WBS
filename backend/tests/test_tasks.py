"""
タスク関連のテスト
"""
import pytest
from fastapi import status
from datetime import datetime, timedelta


@pytest.fixture
def test_project_with_member(client, admin_auth_headers, test_user):
    """メンバーを含むテスト用プロジェクト"""
    # プロジェクト作成
    response = client.post(
        "/api/v1/projects/",
        headers=admin_auth_headers,
        json={
            "name": "Task Test Project",
            "description": "Project for task testing",
            "status": "active"
        }
    )
    project = response.json()
    
    # メンバー追加
    client.post(
        f"/api/v1/projects/{project['id']}/members/{test_user.id}",
        headers=admin_auth_headers,
        json={"role": "developer"}
    )
    
    return project


@pytest.fixture
def test_task(client, auth_headers, test_project_with_member):
    """テスト用タスク"""
    response = client.post(
        "/api/v1/tasks/",
        headers=auth_headers,
        json={
            "name": "Test Task",
            "description": "Test task description",
            "project_id": test_project_with_member["id"],
            "task_type": "task",
            "estimated_hours": 8.0,
            "start_date": datetime.now().isoformat(),
            "end_date": (datetime.now() + timedelta(days=3)).isoformat()
        }
    )
    return response.json()


def test_create_task(client, auth_headers, test_project_with_member):
    """タスク作成のテスト"""
    response = client.post(
        "/api/v1/tasks/",
        headers=auth_headers,
        json={
            "name": "New Task",
            "description": "New task description",
            "project_id": test_project_with_member["id"],
            "task_type": "phase",
            "estimated_hours": 40.0
        }
    )
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["name"] == "New Task"
    assert data["task_type"] == "phase"
    assert data["estimated_hours"] == 40.0


def test_create_subtask(client, auth_headers, test_task):
    """サブタスク作成のテスト"""
    response = client.post(
        "/api/v1/tasks/",
        headers=auth_headers,
        json={
            "name": "Subtask",
            "description": "Subtask description",
            "project_id": test_task["project_id"],
            "parent_task_id": test_task["id"],
            "task_type": "detail",
            "estimated_hours": 4.0
        }
    )
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["parent_task_id"] == test_task["id"]
    assert data["task_type"] == "detail"


def test_list_project_tasks(client, auth_headers, test_project_with_member, test_task):
    """プロジェクトのタスク一覧取得のテスト"""
    project_id = test_project_with_member["id"]
    response = client.get(
        f"/api/v1/tasks/project/{project_id}",
        headers=auth_headers
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert len(data) >= 1
    assert any(t["name"] == "Test Task" for t in data)


def test_get_task(client, auth_headers, test_task):
    """タスク詳細取得のテスト"""
    task_id = test_task["id"]
    response = client.get(f"/api/v1/tasks/{task_id}", headers=auth_headers)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["id"] == task_id
    assert data["name"] == "Test Task"


def test_update_task(client, auth_headers, test_task):
    """タスク更新のテスト"""
    task_id = test_task["id"]
    response = client.put(
        f"/api/v1/tasks/{task_id}",
        headers=auth_headers,
        json={
            "name": "Updated Task",
            "status": "in_progress",
            "progress": 50
        }
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["name"] == "Updated Task"
    assert data["status"] == "in_progress"
    assert data["progress"] == 50


def test_assign_task(client, auth_headers, test_task, test_user):
    """タスク担当者割り当てのテスト"""
    task_id = test_task["id"]
    response = client.post(
        f"/api/v1/tasks/{task_id}/assignments",
        headers=auth_headers,
        json={
            "user_id": test_user.id,
            "role": "primary"
        }
    )
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["task_id"] == task_id
    assert data["user_id"] == test_user.id


def test_add_task_comment(client, auth_headers, test_task):
    """タスクコメント追加のテスト"""
    task_id = test_task["id"]
    response = client.post(
        f"/api/v1/tasks/{task_id}/comments",
        headers=auth_headers,
        json={
            "content": "This is a test comment"
        }
    )
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["content"] == "This is a test comment"
    assert data["task_id"] == task_id


def test_record_time(client, auth_headers, test_task):
    """作業時間記録のテスト"""
    task_id = test_task["id"]
    response = client.post(
        f"/api/v1/tasks/{task_id}/time-tracking",
        headers=auth_headers,
        json={
            "hours": 2.5,
            "date": datetime.now().date().isoformat(),
            "description": "Worked on implementation"
        }
    )
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["hours"] == 2.5
    assert data["task_id"] == task_id


def test_gantt_chart_data(client, auth_headers, test_project_with_member, test_task):
    """ガントチャートデータ取得のテスト"""
    project_id = test_project_with_member["id"]
    response = client.get(
        f"/api/v1/tasks/project/{project_id}/gantt",
        headers=auth_headers
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "tasks" in data
    assert len(data["tasks"]) >= 1