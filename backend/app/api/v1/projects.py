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


@router.get("/", response_model=List[Project])
def read_projects(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
) -> Any:
    """Retrieve projects accessible to current user"""
    if current_user.role == UserRole.SYSTEM_ADMIN:
        # Admin can see all projects
        projects = project.get_multi(db, skip=skip, limit=limit)
    else:
        # Regular users see only projects they're members of
        projects = project.get_by_member(db, user_id=current_user.id, skip=skip, limit=limit)
    
    return projects


@router.post("/", response_model=Project)
def create_project(
    *,
    db: Session = Depends(get_db),
    project_in: ProjectCreate,
    current_user: User = Depends(get_current_user),
) -> Any:
    """Create new project"""
    # Only project owners and system admins can create projects
    if current_user.role not in [UserRole.SYSTEM_ADMIN, UserRole.PROJECT_OWNER]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to create project"
        )
    
    project_obj = project.create_with_owner(db, obj_in=project_in, owner_id=current_user.id)
    return project_obj


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