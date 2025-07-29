from typing import List, Optional
from sqlalchemy.orm import Session, joinedload
from ..crud.base import CRUDBase
from ..models import (
    Task, TaskDependency, TaskAssignment, TaskComment, TimeTracking
)
from ..schemas.task import (
    TaskCreate, TaskUpdate, TaskDependencyCreate, TaskAssignmentCreate, 
    TaskAssignmentUpdate, TaskCommentCreate, TaskCommentUpdate,
    TimeTrackingCreate, TimeTrackingUpdate
)


class CRUDTask(CRUDBase[Task, TaskCreate, TaskUpdate]):
    def get_by_project(
        self, db: Session, *, project_id: int, skip: int = 0, limit: int = 100
    ) -> List[Task]:
        """Get tasks by project"""
        return (
            db.query(Task)
            .filter(Task.project_id == project_id)
            .offset(skip)
            .limit(limit)
            .all()
        )

    def get_hierarchy_by_project(self, db: Session, *, project_id: int) -> List[Task]:
        """Get task hierarchy for project (for Gantt chart)"""
        return (
            db.query(Task)
            .options(
                joinedload(Task.assignments).joinedload(TaskAssignment.user),
                joinedload(Task.children)
            )
            .filter(Task.project_id == project_id)
            .order_by(Task.wbs_code, Task.id)
            .all()
        )

    def get_by_parent(
        self, db: Session, *, parent_id: int, skip: int = 0, limit: int = 100
    ) -> List[Task]:
        """Get child tasks"""
        return (
            db.query(Task)
            .filter(Task.parent_id == parent_id)
            .offset(skip)
            .limit(limit)
            .all()
        )

    def get_root_tasks(
        self, db: Session, *, project_id: int, skip: int = 0, limit: int = 100
    ) -> List[Task]:
        """Get root level tasks (no parent)"""
        return (
            db.query(Task)
            .filter(Task.project_id == project_id)
            .filter(Task.parent_id.is_(None))
            .offset(skip)
            .limit(limit)
            .all()
        )

    def get_by_assignee(
        self, db: Session, *, user_id: int, skip: int = 0, limit: int = 100
    ) -> List[Task]:
        """Get tasks assigned to user"""
        return (
            db.query(Task)
            .join(TaskAssignment)
            .filter(TaskAssignment.user_id == user_id)
            .filter(TaskAssignment.unassigned_at.is_(None))
            .offset(skip)
            .limit(limit)
            .all()
        )

    def get_by_status(
        self, db: Session, *, project_id: int, status: str, skip: int = 0, limit: int = 100
    ) -> List[Task]:
        """Get tasks by status within project"""
        return (
            db.query(Task)
            .filter(Task.project_id == project_id)
            .filter(Task.status == status)
            .offset(skip)
            .limit(limit)
            .all()
        )

    def get_critical_path_tasks(self, db: Session, *, project_id: int) -> List[Task]:
        """Get critical path tasks"""
        return (
            db.query(Task)
            .filter(Task.project_id == project_id)
            .filter(Task.is_critical_path == True)
            .all()
        )

    def get_milestones(self, db: Session, *, project_id: int) -> List[Task]:
        """Get milestone tasks"""
        return (
            db.query(Task)
            .filter(Task.project_id == project_id)
            .filter(Task.is_milestone == True)
            .all()
        )

    def search_tasks(
        self, db: Session, *, project_id: int, search_term: str, skip: int = 0, limit: int = 100
    ) -> List[Task]:
        """Search tasks by name or description"""
        return (
            db.query(Task)
            .filter(Task.project_id == project_id)
            .filter(
                (Task.name.contains(search_term)) |
                (Task.description.contains(search_term))
            )
            .offset(skip)
            .limit(limit)
            .all()
        )


class CRUDTaskDependency(CRUDBase[TaskDependency, TaskDependencyCreate, TaskDependencyCreate]):
    def get_by_project(self, db: Session, *, project_id: int) -> List[TaskDependency]:
        """Get all dependencies for project tasks"""
        return (
            db.query(TaskDependency)
            .join(Task, TaskDependency.predecessor_id == Task.id)
            .filter(Task.project_id == project_id)
            .all()
        )

    def get_predecessors(self, db: Session, *, task_id: int) -> List[TaskDependency]:
        """Get dependencies where task is successor"""
        return (
            db.query(TaskDependency)
            .filter(TaskDependency.successor_id == task_id)
            .all()
        )

    def get_successors(self, db: Session, *, task_id: int) -> List[TaskDependency]:
        """Get dependencies where task is predecessor"""
        return (
            db.query(TaskDependency)
            .filter(TaskDependency.predecessor_id == task_id)
            .all()
        )

    def has_circular_dependency(
        self, db: Session, *, predecessor_id: int, successor_id: int
    ) -> bool:
        """Check for circular dependencies"""
        # Simple check: if successor is already a predecessor of predecessor
        existing = (
            db.query(TaskDependency)
            .filter(TaskDependency.predecessor_id == successor_id)
            .filter(TaskDependency.successor_id == predecessor_id)
            .first()
        )
        return existing is not None


class CRUDTaskAssignment(CRUDBase[TaskAssignment, TaskAssignmentCreate, TaskAssignmentUpdate]):
    def get_by_task(self, db: Session, *, task_id: int) -> List[TaskAssignment]:
        """Get all assignments for a task"""
        return (
            db.query(TaskAssignment)
            .options(joinedload(TaskAssignment.user))
            .filter(TaskAssignment.task_id == task_id)
            .filter(TaskAssignment.unassigned_at.is_(None))
            .all()
        )

    def get_by_user(
        self, db: Session, *, user_id: int, skip: int = 0, limit: int = 100
    ) -> List[TaskAssignment]:
        """Get all assignments for a user"""
        return (
            db.query(TaskAssignment)
            .options(joinedload(TaskAssignment.task))
            .filter(TaskAssignment.user_id == user_id)
            .filter(TaskAssignment.unassigned_at.is_(None))
            .offset(skip)
            .limit(limit)
            .all()
        )

    def get_by_user_and_task(
        self, db: Session, *, user_id: int, task_id: int
    ) -> Optional[TaskAssignment]:
        """Get specific assignment"""
        return (
            db.query(TaskAssignment)
            .filter(TaskAssignment.user_id == user_id)
            .filter(TaskAssignment.task_id == task_id)
            .filter(TaskAssignment.unassigned_at.is_(None))
            .first()
        )

    def unassign_user(
        self, db: Session, *, user_id: int, task_id: int
    ) -> Optional[TaskAssignment]:
        """Unassign user from task (soft delete)"""
        from datetime import datetime
        
        assignment = self.get_by_user_and_task(db, user_id=user_id, task_id=task_id)
        if assignment:
            assignment.unassigned_at = datetime.utcnow()
            db.commit()
            db.refresh(assignment)
        return assignment


class CRUDTaskComment(CRUDBase[TaskComment, TaskCommentCreate, TaskCommentUpdate]):
    def get_by_task(
        self, db: Session, *, task_id: int, skip: int = 0, limit: int = 100
    ) -> List[TaskComment]:
        """Get comments for a task"""
        return (
            db.query(TaskComment)
            .options(joinedload(TaskComment.user))
            .filter(TaskComment.task_id == task_id)
            .order_by(TaskComment.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

    def get_by_user(
        self, db: Session, *, user_id: int, skip: int = 0, limit: int = 100
    ) -> List[TaskComment]:
        """Get comments by user"""
        return (
            db.query(TaskComment)
            .options(joinedload(TaskComment.task))
            .filter(TaskComment.user_id == user_id)
            .order_by(TaskComment.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )


class CRUDTimeTracking(CRUDBase[TimeTracking, TimeTrackingCreate, TimeTrackingUpdate]):
    def get_by_task(
        self, db: Session, *, task_id: int, skip: int = 0, limit: int = 100
    ) -> List[TimeTracking]:
        """Get time entries for a task"""
        return (
            db.query(TimeTracking)
            .options(joinedload(TimeTracking.user))
            .filter(TimeTracking.task_id == task_id)
            .order_by(TimeTracking.date.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

    def get_by_user(
        self, db: Session, *, user_id: int, skip: int = 0, limit: int = 100
    ) -> List[TimeTracking]:
        """Get time entries by user"""
        return (
            db.query(TimeTracking)
            .options(joinedload(TimeTracking.task))
            .filter(TimeTracking.user_id == user_id)
            .order_by(TimeTracking.date.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

    def get_by_user_and_date_range(
        self, db: Session, *, user_id: int, start_date, end_date
    ) -> List[TimeTracking]:
        """Get time entries by user within date range"""
        return (
            db.query(TimeTracking)
            .filter(TimeTracking.user_id == user_id)
            .filter(TimeTracking.date >= start_date)
            .filter(TimeTracking.date <= end_date)
            .order_by(TimeTracking.date.desc())
            .all()
        )

    def get_total_hours_by_task(self, db: Session, *, task_id: int) -> float:
        """Get total hours logged for a task"""
        from sqlalchemy import func
        result = (
            db.query(func.sum(TimeTracking.hours))
            .filter(TimeTracking.task_id == task_id)
            .scalar()
        )
        return result or 0.0

    def get_total_hours_by_user_and_date_range(
        self, db: Session, *, user_id: int, start_date, end_date
    ) -> float:
        """Get total hours by user within date range"""
        from sqlalchemy import func
        result = (
            db.query(func.sum(TimeTracking.hours))
            .filter(TimeTracking.user_id == user_id)
            .filter(TimeTracking.date >= start_date)
            .filter(TimeTracking.date <= end_date)
            .scalar()
        )
        return result or 0.0


task = CRUDTask(Task)
task_dependency = CRUDTaskDependency(TaskDependency)
task_assignment = CRUDTaskAssignment(TaskAssignment)
task_comment = CRUDTaskComment(TaskComment)
time_tracking = CRUDTimeTracking(TimeTracking)