from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict
from ..models import TaskType, TaskStatus, Priority, DependencyType
from .user import User


# Task schemas
class TaskBase(BaseModel):
    name: str
    description: Optional[str] = None
    task_type: TaskType = TaskType.TASK
    status: TaskStatus = TaskStatus.NOT_STARTED
    priority: Priority = Priority.MEDIUM
    planned_start_date: Optional[datetime] = None
    planned_end_date: Optional[datetime] = None
    estimated_hours: float = 0.0
    remaining_hours: float = 0.0
    progress_percentage: float = 0.0
    wbs_code: Optional[str] = None
    external_link: Optional[str] = None
    is_milestone: bool = False
    must_start_on: Optional[datetime] = None
    must_finish_on: Optional[datetime] = None


class TaskCreate(TaskBase):
    project_id: int
    parent_id: Optional[int] = None


class TaskUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    task_type: Optional[TaskType] = None
    status: Optional[TaskStatus] = None
    priority: Optional[Priority] = None
    planned_start_date: Optional[datetime] = None
    planned_end_date: Optional[datetime] = None
    actual_start_date: Optional[datetime] = None
    actual_end_date: Optional[datetime] = None
    baseline_start_date: Optional[datetime] = None
    baseline_end_date: Optional[datetime] = None
    estimated_hours: Optional[float] = None
    actual_hours: Optional[float] = None
    remaining_hours: Optional[float] = None
    progress_percentage: Optional[float] = None
    wbs_code: Optional[str] = None
    external_link: Optional[str] = None
    is_milestone: Optional[bool] = None
    is_critical_path: Optional[bool] = None
    must_start_on: Optional[datetime] = None
    must_finish_on: Optional[datetime] = None
    parent_id: Optional[int] = None


class TaskInDB(TaskBase):
    id: int
    project_id: int
    parent_id: Optional[int] = None
    actual_start_date: Optional[datetime] = None
    actual_end_date: Optional[datetime] = None
    baseline_start_date: Optional[datetime] = None
    baseline_end_date: Optional[datetime] = None
    actual_hours: float = 0.0
    is_critical_path: bool = False
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)


class Task(TaskBase):
    id: int
    project_id: int
    parent_id: Optional[int] = None
    actual_start_date: Optional[datetime] = None
    actual_end_date: Optional[datetime] = None
    baseline_start_date: Optional[datetime] = None
    baseline_end_date: Optional[datetime] = None
    actual_hours: float = 0.0
    is_critical_path: bool = False
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)


# Task Dependency schemas
class TaskDependencyBase(BaseModel):
    predecessor_id: int
    successor_id: int
    dependency_type: DependencyType = DependencyType.FINISH_TO_START
    lag_days: int = 0


class TaskDependencyCreate(TaskDependencyBase):
    pass


class TaskDependencyInDB(TaskDependencyBase):
    id: int
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class TaskDependency(TaskDependencyBase):
    id: int
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


# Task Assignment schemas
class TaskAssignmentBase(BaseModel):
    user_id: int
    allocation_percentage: float = 100.0
    hourly_rate: Optional[float] = None


class TaskAssignmentCreate(TaskAssignmentBase):
    task_id: int


class TaskAssignmentUpdate(BaseModel):
    allocation_percentage: Optional[float] = None
    hourly_rate: Optional[float] = None


class TaskAssignmentInDB(TaskAssignmentBase):
    id: int
    task_id: int
    assigned_at: datetime
    unassigned_at: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)


class TaskAssignment(TaskAssignmentBase):
    id: int
    task_id: int
    assigned_at: datetime
    unassigned_at: Optional[datetime] = None
    user: User
    
    model_config = ConfigDict(from_attributes=True)


# Task Comment schemas
class TaskCommentBase(BaseModel):
    content: str


class TaskCommentCreate(TaskCommentBase):
    task_id: int


class TaskCommentUpdate(TaskCommentBase):
    pass


class TaskCommentInDB(TaskCommentBase):
    id: int
    task_id: int
    user_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)


class TaskComment(TaskCommentBase):
    id: int
    task_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    user: User
    
    model_config = ConfigDict(from_attributes=True)


# Time Tracking schemas
class TimeTrackingBase(BaseModel):
    date: datetime
    hours: float
    description: Optional[str] = None
    billable: bool = True
    hourly_rate: Optional[float] = None


class TimeTrackingCreate(TimeTrackingBase):
    task_id: int


class TimeTrackingUpdate(BaseModel):
    date: Optional[datetime] = None
    hours: Optional[float] = None
    description: Optional[str] = None
    billable: Optional[bool] = None
    hourly_rate: Optional[float] = None


class TimeTrackingInDB(TimeTrackingBase):
    id: int
    task_id: int
    user_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)


class TimeTracking(TimeTrackingBase):
    id: int
    task_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    user: User
    
    model_config = ConfigDict(from_attributes=True)


# Task with relationships
class TaskWithDetails(Task):
    assignments: List[TaskAssignment] = []
    comments: List[TaskComment] = []
    children: List["TaskWithDetails"] = []
    dependencies_as_predecessor: List[TaskDependency] = []
    dependencies_as_successor: List[TaskDependency] = []


# Task hierarchy for Gantt chart
class TaskHierarchy(BaseModel):
    id: int
    name: str
    task_type: TaskType
    status: TaskStatus
    priority: Priority
    planned_start_date: Optional[datetime] = None
    planned_end_date: Optional[datetime] = None
    progress_percentage: float = 0.0
    is_milestone: bool = False
    is_critical_path: bool = False
    parent_id: Optional[int] = None
    children: List["TaskHierarchy"] = []
    assignments: List[TaskAssignment] = []
    
    model_config = ConfigDict(from_attributes=True)


# Gantt chart data
class GanttData(BaseModel):
    tasks: List[TaskHierarchy]
    dependencies: List[TaskDependency]