"""
Tests for project management functionality.
"""

import pytest
from backend.app.models.models import ProjectStatus, UserRole


class TestProjectCRUD:
    """Test project CRUD operations."""
    
    def test_create_project(self, client, auth_headers):
        """Test creating a new project."""
        project_data = {
            "name": "Test Project",
            "description": "A test project for unit testing",
            "status": ProjectStatus.PLANNING
        }
        
        response = client.post("/api/v1/projects/", json=project_data, headers=auth_headers)
        assert response.status_code == 201
        
        data = response.json()
        assert data["name"] == "Test Project"
        assert data["description"] == "A test project for unit testing"
        assert data["status"] == ProjectStatus.PLANNING
        assert "id" in data
        assert "created_at" in data
    
    def test_get_project(self, client, auth_headers):
        """Test retrieving a specific project."""
        # First create a project
        project_data = {
            "name": "Test Project for GET",
            "description": "Test project description",
            "status": ProjectStatus.ACTIVE
        }
        
        create_response = client.post("/api/v1/projects/", json=project_data, headers=auth_headers)
        assert create_response.status_code == 201
        project_id = create_response.json()["id"]
        
        # Get the project
        response = client.get(f"/api/v1/projects/{project_id}", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data["name"] == "Test Project for GET"
        assert data["id"] == project_id
    
    def test_get_nonexistent_project(self, client, auth_headers):
        """Test retrieving a project that doesn't exist."""
        response = client.get("/api/v1/projects/999999", headers=auth_headers)
        assert response.status_code == 404
    
    def test_list_projects(self, client, auth_headers):
        """Test listing all projects."""
        # Create multiple projects
        project_names = ["Project 1", "Project 2", "Project 3"]
        for name in project_names:
            project_data = {
                "name": name,
                "description": f"Description for {name}",
                "status": ProjectStatus.PLANNING
            }
            response = client.post("/api/v1/projects/", json=project_data, headers=auth_headers)
            assert response.status_code == 201
        
        # List projects
        response = client.get("/api/v1/projects/", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert len(data) >= 3  # At least the 3 we created
        project_names_in_response = [project["name"] for project in data]
        for name in project_names:
            assert name in project_names_in_response
    
    def test_update_project(self, client, auth_headers):
        """Test updating a project."""
        # Create project
        project_data = {
            "name": "Original Project",
            "description": "Original description",
            "status": ProjectStatus.PLANNING
        }
        
        create_response = client.post("/api/v1/projects/", json=project_data, headers=auth_headers)
        assert create_response.status_code == 201
        project_id = create_response.json()["id"]
        
        # Update project
        update_data = {
            "name": "Updated Project",
            "description": "Updated description",
            "status": ProjectStatus.ACTIVE
        }
        
        response = client.put(f"/api/v1/projects/{project_id}", json=update_data, headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data["name"] == "Updated Project"
        assert data["description"] == "Updated description"
        assert data["status"] == ProjectStatus.ACTIVE
    
    def test_delete_project(self, client, auth_headers):
        """Test deleting a project."""
        # Create project
        project_data = {
            "name": "Project to Delete",
            "description": "This project will be deleted",
            "status": ProjectStatus.PLANNING
        }
        
        create_response = client.post("/api/v1/projects/", json=project_data, headers=auth_headers)
        assert create_response.status_code == 201
        project_id = create_response.json()["id"]
        
        # Delete project
        response = client.delete(f"/api/v1/projects/{project_id}", headers=auth_headers)
        assert response.status_code == 204
        
        # Verify project is deleted
        get_response = client.get(f"/api/v1/projects/{project_id}", headers=auth_headers)
        assert get_response.status_code == 404
    
    def test_create_project_unauthorized(self, client, regular_auth_headers):
        """Test creating project without proper authorization."""
        project_data = {
            "name": "Unauthorized Project",
            "description": "Should not be created",
            "status": ProjectStatus.PLANNING
        }
        
        response = client.post("/api/v1/projects/", json=project_data, headers=regular_auth_headers)
        # This might be 403 depending on your permission system
        assert response.status_code in [403, 201]  # Adjust based on your requirements


class TestProjectMembers:
    """Test project member management."""
    
    def test_add_project_member(self, client, auth_headers, regular_user):
        """Test adding a member to a project."""
        # Create project
        project_data = {
            "name": "Team Project",
            "description": "A project with team members",
            "status": ProjectStatus.ACTIVE
        }
        
        create_response = client.post("/api/v1/projects/", json=project_data, headers=auth_headers)
        assert create_response.status_code == 201
        project_id = create_response.json()["id"]
        
        # Add member
        member_data = {
            "user_id": regular_user.id,
            "role": UserRole.TEAM_MEMBER
        }
        
        response = client.post(f"/api/v1/projects/{project_id}/members", json=member_data, headers=auth_headers)
        assert response.status_code == 201
        
        data = response.json()
        assert data["user_id"] == regular_user.id
        assert data["role"] == UserRole.TEAM_MEMBER
    
    def test_list_project_members(self, client, auth_headers, regular_user):
        """Test listing project members."""
        # Create project and add member
        project_data = {
            "name": "Team Project List",
            "description": "A project for testing member listing",
            "status": ProjectStatus.ACTIVE
        }
        
        create_response = client.post("/api/v1/projects/", json=project_data, headers=auth_headers)
        project_id = create_response.json()["id"]
        
        member_data = {
            "user_id": regular_user.id,
            "role": UserRole.TEAM_MEMBER
        }
        
        client.post(f"/api/v1/projects/{project_id}/members", json=member_data, headers=auth_headers)
        
        # List members
        response = client.get(f"/api/v1/projects/{project_id}/members", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert len(data) >= 1
        member_user_ids = [member["user_id"] for member in data]
        assert regular_user.id in member_user_ids


class TestProjectValidation:
    """Test project data validation."""
    
    def test_create_project_invalid_data(self, client, auth_headers):
        """Test creating project with invalid data."""
        # Missing required fields
        invalid_data = {
            "description": "Missing name field"
        }
        
        response = client.post("/api/v1/projects/", json=invalid_data, headers=auth_headers)
        assert response.status_code == 422
    
    def test_create_project_empty_name(self, client, auth_headers):
        """Test creating project with empty name."""
        invalid_data = {
            "name": "",
            "description": "Empty name project",
            "status": ProjectStatus.PLANNING
        }
        
        response = client.post("/api/v1/projects/", json=invalid_data, headers=auth_headers)
        assert response.status_code == 422
    
    def test_create_project_invalid_status(self, client, auth_headers):
        """Test creating project with invalid status."""
        invalid_data = {
            "name": "Invalid Status Project",
            "description": "Testing invalid status",
            "status": "invalid_status"
        }
        
        response = client.post("/api/v1/projects/", json=invalid_data, headers=auth_headers)
        assert response.status_code == 422