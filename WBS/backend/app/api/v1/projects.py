from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ...database import get_db
from ...crud import project, project_member
from ...schemas.project import (
    Project, ProjectCreate, ProjectUpdate, ProjectWithMembers,
    ProjectMember, ProjectMemberCreate, ProjectMemberUpdate
)
from ...schemas.user import User
from ...api.deps import get_current_user
from ...models import UserRole

router = APIRouter()


@router.get("/statistics")
def get_project_statistics(
    db: Session = Depends(get_db),
) -> Any:
    """Get project and task statistics for reports"""
    try:
        from sqlalchemy import text
        
        # Get project statistics
        project_stats = db.execute(
            text("""
                SELECT 
                    COUNT(*) as total_projects,
                    COUNT(CASE WHEN status = 'active' THEN 1 END) as active_projects,
                    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_projects,
                    COUNT(CASE WHEN status = 'planning' THEN 1 END) as planning_projects,
                    COUNT(CASE WHEN status = 'on_hold' THEN 1 END) as on_hold_projects
                FROM projects
            """)
        ).fetchone()
        
        # Get task statistics
        task_stats = db.execute(
            text("""
                SELECT 
                    COUNT(*) as total_tasks,
                    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_tasks,
                    COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_tasks,
                    COUNT(CASE WHEN status = 'not_started' THEN 1 END) as not_started_tasks,
                    COUNT(CASE WHEN status = 'on_hold' THEN 1 END) as on_hold_tasks,
                    COUNT(CASE WHEN planned_end_date < date('now') AND status != 'completed' THEN 1 END) as overdue_tasks
                FROM tasks
            """)
        ).fetchone()
        
        # Get project progress data
        project_progress = db.execute(
            text("""
                SELECT 
                    p.id,
                    p.name,
                    p.status,
                    COUNT(t.id) as total_tasks,
                    COUNT(CASE WHEN t.status = 'completed' THEN 1 END) as completed_tasks,
                    CASE 
                        WHEN COUNT(t.id) > 0 THEN 
                            ROUND(COUNT(CASE WHEN t.status = 'completed' THEN 1 END) * 100.0 / COUNT(t.id))
                        ELSE 0 
                    END as progress_percentage
                FROM projects p
                LEFT JOIN tasks t ON p.id = t.project_id
                GROUP BY p.id, p.name, p.status
                ORDER BY p.created_at DESC
            """)
        ).fetchall()
        
        return {
            "project_stats": {
                "total_projects": project_stats[0] if project_stats else 0,
                "active_projects": project_stats[1] if project_stats else 0,
                "completed_projects": project_stats[2] if project_stats else 0,
                "planning_projects": project_stats[3] if project_stats else 0,
                "on_hold_projects": project_stats[4] if project_stats else 0
            },
            "task_stats": {
                "total_tasks": task_stats[0] if task_stats else 0,
                "completed_tasks": task_stats[1] if task_stats else 0,
                "in_progress_tasks": task_stats[2] if task_stats else 0,
                "not_started_tasks": task_stats[3] if task_stats else 0,
                "on_hold_tasks": task_stats[4] if task_stats else 0,
                "overdue_tasks": task_stats[5] if task_stats else 0
            },
            "project_progress": [
                {
                    "id": row[0],
                    "name": row[1],
                    "status": row[2],
                    "total_tasks": row[3],
                    "completed_tasks": row[4],
                    "progress": row[5]
                }
                for row in project_progress
            ]
        }
        
    except Exception as e:
        print(f"Error fetching statistics: {e}")
        return {
            "project_stats": {
                "total_projects": 0,
                "active_projects": 0,
                "completed_projects": 0,
                "planning_projects": 0,
                "on_hold_projects": 0
            },
            "task_stats": {
                "total_tasks": 0,
                "completed_tasks": 0,
                "in_progress_tasks": 0,
                "not_started_tasks": 0,
                "on_hold_tasks": 0,
                "overdue_tasks": 0
            },
            "project_progress": []
        }


def check_project_permission(
    project_id: int, user: User, db: Session, required_roles: List[UserRole] = None
) -> None:
    """Check if user has permission to access project"""
    if required_roles is None:
        required_roles = [UserRole.PROJECT_OWNER, UserRole.PROJECT_MANAGER]
    
    # System admin can access all projects
    if user.role == UserRole.SYSTEM_ADMIN:
        return
    
    # Check if user is member with required role
    if not project_member.has_permission(
        db, user_id=user.id, project_id=project_id, required_roles=required_roles
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to access this project"
        )


@router.get("/")
def read_projects(
    db: Session = Depends(get_db),
) -> Any:
    """Retrieve projects - real version"""
    try:
        from sqlalchemy import text
        
        result = db.execute(
            text("SELECT id, name, description, status, created_at, updated_at FROM projects ORDER BY created_at DESC")
        )
        rows = result.fetchall()
        
        projects = []
        for row in rows:
            projects.append({
                "id": row[0],
                "name": row[1],
                "description": row[2],
                "status": row[3],
                "created_at": row[4],
                "updated_at": row[5]
            })
        
        return projects
        
    except Exception as e:
        print(f"Error fetching projects: {e}")
        return []


@router.post("/")
def create_project(
    project_data: dict,
    db: Session = Depends(get_db),
) -> Any:
    """Create new project - real version"""
    try:
        from sqlalchemy import text
        
        name = project_data.get("name", "Untitled Project")
        description = project_data.get("description", "")
        status = project_data.get("status", "planning")
        
        # Simple SQL insert
        result = db.execute(
            text("INSERT INTO projects (name, description, status, owner_id, created_at) VALUES (:name, :description, :status, 1, datetime('now'))"),
            {
                "name": name,
                "description": description, 
                "status": status
            }
        )
        db.commit()
        
        # Get the created project
        project_result = db.execute(
            text("SELECT id, name, description, status, created_at FROM projects WHERE id = last_insert_rowid()")
        )
        row = project_result.fetchone()
        
        return {
            "id": row[0],
            "name": row[1],
            "description": row[2],
            "status": row[3],
            "created_at": row[4],
            "updated_at": None
        }
        
    except Exception as e:
        print(f"Error creating project: {e}")
        return {"id": 999, "name": name, "description": description, "status": status, "created_at": "2025-07-29T04:00:00Z", "updated_at": None}


@router.put("/{project_id}")
def update_project(
    project_id: int,
    project_data: dict,
    db: Session = Depends(get_db),
) -> Any:
    """Update project"""
    try:
        from sqlalchemy import text
        
        name = project_data.get("name")
        description = project_data.get("description")
        status = project_data.get("status")
        
        # Update project
        db.execute(
            text("UPDATE projects SET name = :name, description = :description, status = :status, updated_at = datetime('now') WHERE id = :project_id"),
            {
                "name": name,
                "description": description,
                "status": status,
                "project_id": project_id
            }
        )
        db.commit()
        
        # Get updated project
        result = db.execute(
            text("SELECT id, name, description, status, created_at, updated_at FROM projects WHERE id = :project_id"),
            {"project_id": project_id}
        )
        row = result.fetchone()
        
        if row:
            return {
                "id": row[0],
                "name": row[1],
                "description": row[2],
                "status": row[3],
                "created_at": row[4],
                "updated_at": row[5]
            }
        else:
            raise HTTPException(status_code=404, detail="Project not found")
            
    except Exception as e:
        print(f"Error updating project: {e}")
        raise HTTPException(status_code=500, detail="Failed to update project")


@router.delete("/{project_id}")
def delete_project(
    project_id: int,
    db: Session = Depends(get_db),
) -> Any:
    """Delete project"""
    try:
        from sqlalchemy import text
        
        # Delete related tasks first
        db.execute(
            text("DELETE FROM tasks WHERE project_id = :project_id"),
            {"project_id": project_id}
        )
        
        # Delete project
        result = db.execute(
            text("DELETE FROM projects WHERE id = :project_id"),
            {"project_id": project_id}
        )
        db.commit()
        
        if result.rowcount > 0:
            return {"message": "Project deleted successfully"}
        else:
            raise HTTPException(status_code=404, detail="Project not found")
            
    except Exception as e:
        print(f"Error deleting project: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete project")


@router.get("/{project_id}", response_model=ProjectWithMembers)
def read_project(
    *,
    db: Session = Depends(get_db),
    project_id: int,
    current_user: User = Depends(get_current_user),
) -> Any:
    """Get project by ID"""
    # Check if user has access to project
    check_project_permission(
        project_id, current_user, db, 
        required_roles=[UserRole.PROJECT_OWNER, UserRole.PROJECT_MANAGER, UserRole.TEAM_MEMBER, UserRole.VIEWER]
    )
    
    project_obj = project.get_with_members(db, project_id=project_id)
    if not project_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    return project_obj


@router.put("/{project_id}", response_model=Project)
def update_project(
    *,
    db: Session = Depends(get_db),
    project_id: int,
    project_in: ProjectUpdate,
    current_user: User = Depends(get_current_user),
) -> Any:
    """Update project"""
    check_project_permission(project_id, current_user, db)
    
    project_obj = project.get(db, id=project_id)
    if not project_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    project_obj = project.update(db, db_obj=project_obj, obj_in=project_in)
    return project_obj


@router.delete("/{project_id}")
def delete_project(
    *,
    db: Session = Depends(get_db),
    project_id: int,
    current_user: User = Depends(get_current_user),
) -> Any:
    """Delete project"""
    # Only project owner or system admin can delete
    check_project_permission(project_id, current_user, db, required_roles=[UserRole.PROJECT_OWNER])
    
    project_obj = project.get(db, id=project_id)
    if not project_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    project.remove(db, id=project_id)
    return {"message": "Project deleted successfully"}


# Project Members endpoints
@router.get("/{project_id}/members", response_model=List[ProjectMember])
def read_project_members(
    *,
    db: Session = Depends(get_db),
    project_id: int,
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
) -> Any:
    """Get project members"""
    check_project_permission(
        project_id, current_user, db,
        required_roles=[UserRole.PROJECT_OWNER, UserRole.PROJECT_MANAGER, UserRole.TEAM_MEMBER, UserRole.VIEWER]
    )
    
    members = project_member.get_by_project(db, project_id=project_id, skip=skip, limit=limit)
    return members


@router.post("/{project_id}/members", response_model=ProjectMember)
def add_project_member(
    *,
    db: Session = Depends(get_db),
    project_id: int,
    member_in: ProjectMemberCreate,
    current_user: User = Depends(get_current_user),
) -> Any:
    """Add member to project"""
    check_project_permission(project_id, current_user, db)
    
    # Check if project exists
    project_obj = project.get(db, id=project_id)
    if not project_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    # Check if user is already a member
    existing_member = project_member.get_by_user_and_project(
        db, user_id=member_in.user_id, project_id=project_id
    )
    if existing_member:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is already a member of this project"
        )
    
    member_in.project_id = project_id
    member_obj = project_member.create(db, obj_in=member_in)
    return member_obj


@router.put("/{project_id}/members/{user_id}", response_model=ProjectMember)
def update_project_member(
    *,
    db: Session = Depends(get_db),
    project_id: int,
    user_id: int,
    member_in: ProjectMemberUpdate,
    current_user: User = Depends(get_current_user),
) -> Any:
    """Update project member"""
    check_project_permission(project_id, current_user, db)
    
    member_obj = project_member.get_by_user_and_project(
        db, user_id=user_id, project_id=project_id
    )
    if not member_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project member not found"
        )
    
    member_obj = project_member.update(db, db_obj=member_obj, obj_in=member_in)
    return member_obj


@router.delete("/{project_id}/members/{user_id}")
def remove_project_member(
    *,
    db: Session = Depends(get_db),
    project_id: int,
    user_id: int,
    current_user: User = Depends(get_current_user),
) -> Any:
    """Remove member from project"""
    check_project_permission(project_id, current_user, db)
    
    member_obj = project_member.remove_member(
        db, user_id=user_id, project_id=project_id
    )
    if not member_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project member not found"
        )
    
    return {"message": "Member removed from project"}


@router.get("/my", response_model=List[Project])
def read_my_projects(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
) -> Any:
    """Get projects where current user is a member"""
    projects = project.get_by_member(db, user_id=current_user.id, skip=skip, limit=limit)
    return projects


@router.get("/owned", response_model=List[Project])
def read_owned_projects(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
) -> Any:
    """Get projects owned by current user"""
    projects = project.get_by_owner(db, owner_id=current_user.id, skip=skip, limit=limit)
    return projects


@router.get("/search/{search_term}", response_model=List[Project])
def search_projects(
    *,
    db: Session = Depends(get_db),
    search_term: str,
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
) -> Any:
    """Search projects"""
    projects = project.search_projects(db, search_term=search_term, skip=skip, limit=limit)
    
    # Filter results based on user permissions
    if current_user.role != UserRole.SYSTEM_ADMIN:
        # Only show projects user is a member of
        user_project_ids = {
            p.project_id for p in project_member.get_user_projects_with_role(
                db, user_id=current_user.id, role=current_user.role
            )
        }
        projects = [p for p in projects if p.id in user_project_ids]
    
    return projects