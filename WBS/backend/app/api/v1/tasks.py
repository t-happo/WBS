from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ...database import get_db
from ...crud import task, task_dependency, task_assignment, task_comment, time_tracking, project_member
from ...schemas.task import (
    Task, TaskCreate, TaskUpdate, TaskWithDetails, TaskHierarchy, GanttData,
    TaskDependency, TaskDependencyCreate,
    TaskAssignment, TaskAssignmentCreate, TaskAssignmentUpdate,
    TaskComment, TaskCommentCreate, TaskCommentUpdate,
    TimeTracking, TimeTrackingCreate, TimeTrackingUpdate
)
from ...schemas.user import User
from ...api.deps import get_current_user
from ...models import UserRole

router = APIRouter()


def check_task_permission(
    project_id: int, user: User, db: Session, required_roles: List[UserRole] = None
) -> None:
    """Check if user has permission to access tasks in project"""
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
            detail="Not enough permissions to access tasks in this project"
        )


# Task endpoints
@router.get("/project/{project_id}", response_model=List[Task])
def read_project_tasks(
    *,
    db: Session = Depends(get_db),
    project_id: int,
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
) -> Any:
    """Get tasks for project"""
    check_task_permission(
        project_id, current_user, db,
        required_roles=[UserRole.PROJECT_OWNER, UserRole.PROJECT_MANAGER, UserRole.TEAM_MEMBER, UserRole.VIEWER]
    )
    
    tasks = task.get_by_project(db, project_id=project_id, skip=skip, limit=limit)
    return tasks


@router.get("/project/{project_id}/gantt", response_model=GanttData)
def get_gantt_data(
    *,
    db: Session = Depends(get_db),
    project_id: int,
    current_user: User = Depends(get_current_user),
) -> Any:
    """Get Gantt chart data for project"""
    check_task_permission(
        project_id, current_user, db,
        required_roles=[UserRole.PROJECT_OWNER, UserRole.PROJECT_MANAGER, UserRole.TEAM_MEMBER, UserRole.VIEWER]
    )
    
    # Get task hierarchy
    tasks = task.get_hierarchy_by_project(db, project_id=project_id)
    
    # Get dependencies
    dependencies = task_dependency.get_by_project(db, project_id=project_id)
    
    return GanttData(tasks=tasks, dependencies=dependencies)


@router.get("/project/{project_id}/hierarchy", response_model=List[TaskHierarchy])
def get_task_hierarchy(
    *,
    db: Session = Depends(get_db),
    project_id: int,
    current_user: User = Depends(get_current_user),
) -> Any:
    """Get task hierarchy for project"""
    check_task_permission(
        project_id, current_user, db,
        required_roles=[UserRole.PROJECT_OWNER, UserRole.PROJECT_MANAGER, UserRole.TEAM_MEMBER, UserRole.VIEWER]
    )
    
    tasks = task.get_hierarchy_by_project(db, project_id=project_id)
    return tasks


@router.post("/", response_model=Task)
def create_task(
    *,
    db: Session = Depends(get_db),
    task_in: TaskCreate,
    current_user: User = Depends(get_current_user),
) -> Any:
    """Create new task"""
    check_task_permission(task_in.project_id, current_user, db)
    
    task_obj = task.create(db, obj_in=task_in)
    return task_obj


@router.get("/{task_id}", response_model=TaskWithDetails)
def read_task(
    *,
    db: Session = Depends(get_db),
    task_id: int,
    current_user: User = Depends(get_current_user),
) -> Any:
    """Get task by ID"""
    task_obj = task.get(db, id=task_id)
    if not task_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    
    check_task_permission(
        task_obj.project_id, current_user, db,
        required_roles=[UserRole.PROJECT_OWNER, UserRole.PROJECT_MANAGER, UserRole.TEAM_MEMBER, UserRole.VIEWER]
    )
    
    return task_obj


@router.put("/{task_id}", response_model=Task)
def update_task(
    *,
    db: Session = Depends(get_db),
    task_id: int,
    task_in: TaskUpdate,
    current_user: User = Depends(get_current_user),
) -> Any:
    """Update task"""
    task_obj = task.get(db, id=task_id)
    if not task_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    
    check_task_permission(task_obj.project_id, current_user, db)
    
    task_obj = task.update(db, db_obj=task_obj, obj_in=task_in)
    return task_obj


@router.delete("/{task_id}")
def delete_task(
    *,
    db: Session = Depends(get_db),
    task_id: int,
    current_user: User = Depends(get_current_user),
) -> Any:
    """Delete task"""
    task_obj = task.get(db, id=task_id)
    if not task_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    
    check_task_permission(task_obj.project_id, current_user, db)
    
    task.remove(db, id=task_id)
    return {"message": "Task deleted successfully"}


# Task Dependencies
@router.post("/{task_id}/dependencies", response_model=TaskDependency)
def create_task_dependency(
    *,
    db: Session = Depends(get_db),
    task_id: int,
    dependency_in: TaskDependencyCreate,
    current_user: User = Depends(get_current_user),
) -> Any:
    """Create task dependency"""
    task_obj = task.get(db, id=task_id)
    if not task_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    
    check_task_permission(task_obj.project_id, current_user, db)
    
    # Check for circular dependencies
    if task_dependency.has_circular_dependency(
        db, predecessor_id=dependency_in.predecessor_id, successor_id=dependency_in.successor_id
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Circular dependency detected"
        )
    
    dependency_obj = task_dependency.create(db, obj_in=dependency_in)
    return dependency_obj


@router.get("/{task_id}/dependencies", response_model=List[TaskDependency])
def get_task_dependencies(
    *,
    db: Session = Depends(get_db),
    task_id: int,
    current_user: User = Depends(get_current_user),
) -> Any:
    """Get task dependencies"""
    task_obj = task.get(db, id=task_id)
    if not task_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    
    check_task_permission(
        task_obj.project_id, current_user, db,
        required_roles=[UserRole.PROJECT_OWNER, UserRole.PROJECT_MANAGER, UserRole.TEAM_MEMBER, UserRole.VIEWER]
    )
    
    predecessors = task_dependency.get_predecessors(db, task_id=task_id)
    successors = task_dependency.get_successors(db, task_id=task_id)
    
    return predecessors + successors


# Task Assignments
@router.post("/{task_id}/assignments", response_model=TaskAssignment)
def assign_task(
    *,
    db: Session = Depends(get_db),
    task_id: int,
    assignment_in: TaskAssignmentCreate,
    current_user: User = Depends(get_current_user),
) -> Any:
    """Assign user to task"""
    task_obj = task.get(db, id=task_id)
    if not task_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    
    check_task_permission(task_obj.project_id, current_user, db)
    
    assignment_in.task_id = task_id
    assignment_obj = task_assignment.create(db, obj_in=assignment_in)
    return assignment_obj


@router.get("/{task_id}/assignments", response_model=List[TaskAssignment])
def get_task_assignments(
    *,
    db: Session = Depends(get_db),
    task_id: int,
    current_user: User = Depends(get_current_user),
) -> Any:
    """Get task assignments"""
    task_obj = task.get(db, id=task_id)
    if not task_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    
    check_task_permission(
        task_obj.project_id, current_user, db,
        required_roles=[UserRole.PROJECT_OWNER, UserRole.PROJECT_MANAGER, UserRole.TEAM_MEMBER, UserRole.VIEWER]
    )
    
    assignments = task_assignment.get_by_task(db, task_id=task_id)
    return assignments


@router.delete("/{task_id}/assignments/{user_id}")
def unassign_task(
    *,
    db: Session = Depends(get_db),
    task_id: int,
    user_id: int,
    current_user: User = Depends(get_current_user),
) -> Any:
    """Unassign user from task"""
    task_obj = task.get(db, id=task_id)
    if not task_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    
    check_task_permission(task_obj.project_id, current_user, db)
    
    assignment_obj = task_assignment.unassign_user(db, user_id=user_id, task_id=task_id)
    if not assignment_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task assignment not found"
        )
    
    return {"message": "User unassigned from task"}


# Task Comments
@router.post("/{task_id}/comments", response_model=TaskComment)
def create_task_comment(
    *,
    db: Session = Depends(get_db),
    task_id: int,
    comment_in: TaskCommentCreate,
    current_user: User = Depends(get_current_user),
) -> Any:
    """Create task comment"""
    task_obj = task.get(db, id=task_id)
    if not task_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    
    check_task_permission(
        task_obj.project_id, current_user, db,
        required_roles=[UserRole.PROJECT_OWNER, UserRole.PROJECT_MANAGER, UserRole.TEAM_MEMBER]
    )
    
    comment_in.task_id = task_id
    comment_obj = task_comment.create(db, obj_in=comment_in)
    comment_obj.user_id = current_user.id
    db.commit()
    db.refresh(comment_obj)
    
    return comment_obj


@router.get("/{task_id}/comments", response_model=List[TaskComment])
def get_task_comments(
    *,
    db: Session = Depends(get_db),
    task_id: int,
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
) -> Any:
    """Get task comments"""
    task_obj = task.get(db, id=task_id)
    if not task_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    
    check_task_permission(
        task_obj.project_id, current_user, db,
        required_roles=[UserRole.PROJECT_OWNER, UserRole.PROJECT_MANAGER, UserRole.TEAM_MEMBER, UserRole.VIEWER]
    )
    
    comments = task_comment.get_by_task(db, task_id=task_id, skip=skip, limit=limit)
    return comments


# Time Tracking
@router.post("/{task_id}/time", response_model=TimeTracking)
def log_time(
    *,
    db: Session = Depends(get_db),
    task_id: int,
    time_in: TimeTrackingCreate,
    current_user: User = Depends(get_current_user),
) -> Any:
    """Log time for task"""
    task_obj = task.get(db, id=task_id)
    if not task_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    
    check_task_permission(
        task_obj.project_id, current_user, db,
        required_roles=[UserRole.PROJECT_OWNER, UserRole.PROJECT_MANAGER, UserRole.TEAM_MEMBER]
    )
    
    time_in.task_id = task_id
    time_obj = time_tracking.create(db, obj_in=time_in)
    time_obj.user_id = current_user.id
    db.commit()
    db.refresh(time_obj)
    
    return time_obj


@router.get("/{task_id}/time", response_model=List[TimeTracking])
def get_task_time_entries(
    *,
    db: Session = Depends(get_db),
    task_id: int,
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
) -> Any:
    """Get time entries for task"""
    task_obj = task.get(db, id=task_id)
    if not task_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    
    check_task_permission(
        task_obj.project_id, current_user, db,
        required_roles=[UserRole.PROJECT_OWNER, UserRole.PROJECT_MANAGER, UserRole.TEAM_MEMBER, UserRole.VIEWER]
    )
    
    time_entries = time_tracking.get_by_task(db, task_id=task_id, skip=skip, limit=limit)
    return time_entries


# User-specific endpoints
@router.get("/assigned/me", response_model=List[Task])
def get_my_tasks(
    *,
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
) -> Any:
    """Get tasks assigned to current user"""
    tasks = task.get_by_assignee(db, user_id=current_user.id, skip=skip, limit=limit)
    return tasks


@router.get("/time/me", response_model=List[TimeTracking])
def get_my_time_entries(
    *,
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
) -> Any:
    """Get time entries by current user"""
    time_entries = time_tracking.get_by_user(db, user_id=current_user.id, skip=skip, limit=limit)
    return time_entries