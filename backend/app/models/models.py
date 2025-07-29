from datetime import datetime
from typing import Optional
import enum
from sqlalchemy import (
    Column, Integer, String, Text, DateTime, Boolean, Float, ForeignKey,
    Enum, Table, UniqueConstraint, Index, CheckConstraint
)
from sqlalchemy.orm import relationship, backref
from sqlalchemy.sql import func
from ..database import Base


# Enum Definitions
class UserRole(str, enum.Enum):
    SYSTEM_ADMIN = "system_admin"
    PROJECT_OWNER = "project_owner"
    PROJECT_MANAGER = "project_manager"
    TEAM_MEMBER = "team_member"
    VIEWER = "viewer"


class ProjectStatus(str, enum.Enum):
    PLANNING = "planning"
    ACTIVE = "active"
    ON_HOLD = "on_hold"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class TaskType(str, enum.Enum):
    PHASE = "phase"
    TASK = "task"
    SUBTASK = "subtask"


class TaskStatus(str, enum.Enum):
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    REVIEW = "review"
    COMPLETED = "completed"
    ON_HOLD = "on_hold"


class DependencyType(str, enum.Enum):
    FINISH_TO_START = "fs"  # Finish to Start
    START_TO_START = "ss"   # Start to Start
    FINISH_TO_FINISH = "ff" # Finish to Finish
    START_TO_FINISH = "sf"  # Start to Finish


class ResourceType(str, enum.Enum):
    HUMAN = "human"
    EQUIPMENT = "equipment"
    MATERIAL = "material"
    SOFTWARE = "software"


class SkillLevel(str, enum.Enum):
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"
    EXPERT = "expert"


class Priority(int, enum.Enum):
    VERY_LOW = 1
    LOW = 2
    MEDIUM = 3
    HIGH = 4
    CRITICAL = 5


class TemplateType(str, enum.Enum):
    WEB_APPLICATION = "web_application"
    SYSTEM_MIGRATION = "system_migration"
    MOBILE_APP = "mobile_app"
    INFRASTRUCTURE = "infrastructure"
    CUSTOM = "custom"


class NotificationType(str, enum.Enum):
    TASK_ASSIGNED = "task_assigned"
    TASK_COMPLETED = "task_completed"
    TASK_OVERDUE = "task_overdue"
    PROJECT_MILESTONE = "project_milestone"
    RESOURCE_CONFLICT = "resource_conflict"


# Association table for many-to-many relationships
user_skills = Table(
    'user_skills',
    Base.metadata,
    Column('user_id', Integer, ForeignKey('users.id'), primary_key=True),
    Column('skill_name', String(100), primary_key=True),
    Column('skill_level', Enum(SkillLevel), nullable=False),
    Column('created_at', DateTime(timezone=True), server_default=func.now())
)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    full_name = Column(String(100), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    
    # User attributes
    role = Column(Enum(UserRole), nullable=False, default=UserRole.TEAM_MEMBER)
    is_active = Column(Boolean, default=True)
    job_title = Column(String(100))
    department = Column(String(100))
    hourly_rate = Column(Float, default=0.0)
    daily_capacity = Column(Float, default=8.0)  # hours per day
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    last_login = Column(DateTime(timezone=True))

    # Relationships
    project_memberships = relationship("ProjectMember", back_populates="user")
    task_assignments = relationship("TaskAssignment", back_populates="user")
    time_entries = relationship("TimeTracking", back_populates="user")
    task_comments = relationship("TaskComment", back_populates="user")
    created_projects = relationship("Project", back_populates="owner")

    def __repr__(self):
        return f"<User(username='{self.username}', email='{self.email}')>"


class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False, index=True)
    description = Column(Text)
    status = Column(Enum(ProjectStatus), nullable=False, default=ProjectStatus.PLANNING)
    
    # Project dates
    start_date = Column(DateTime(timezone=True))
    end_date = Column(DateTime(timezone=True))
    baseline_start_date = Column(DateTime(timezone=True))  # Original planned dates
    baseline_end_date = Column(DateTime(timezone=True))
    
    # Project attributes
    budget = Column(Float, default=0.0)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Settings
    is_template = Column(Boolean, default=False)
    template_type = Column(Enum(TemplateType))
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    owner = relationship("User", back_populates="created_projects")
    members = relationship("ProjectMember", back_populates="project")
    tasks = relationship("Task", back_populates="project")
    resources = relationship("Resource", back_populates="project")

    def __repr__(self):
        return f"<Project(name='{self.name}', status='{self.status}')>"


class ProjectMember(Base):
    __tablename__ = "project_members"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    role = Column(Enum(UserRole), nullable=False, default=UserRole.TEAM_MEMBER)
    
    # Member attributes
    hourly_rate = Column(Float)  # Project-specific rate override
    allocation_percentage = Column(Float, default=100.0)  # % of time allocated to project
    
    # Timestamps
    joined_at = Column(DateTime(timezone=True), server_default=func.now())
    left_at = Column(DateTime(timezone=True))

    # Relationships
    project = relationship("Project", back_populates="members")
    user = relationship("User", back_populates="project_memberships")

    # Constraints
    __table_args__ = (
        UniqueConstraint('project_id', 'user_id', name='unique_project_member'),
        CheckConstraint('allocation_percentage >= 0 AND allocation_percentage <= 100'),
    )

    def __repr__(self):
        return f"<ProjectMember(project_id={self.project_id}, user_id={self.user_id}, role='{self.role}')>"


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    parent_id = Column(Integer, ForeignKey("tasks.id"))  # Self-referencing for hierarchy
    
    # Task basic info
    name = Column(String(200), nullable=False)
    description = Column(Text)
    task_type = Column(Enum(TaskType), nullable=False, default=TaskType.TASK)
    status = Column(Enum(TaskStatus), nullable=False, default=TaskStatus.NOT_STARTED)
    priority = Column(Enum(Priority), default=Priority.MEDIUM)
    
    # Task scheduling
    planned_start_date = Column(DateTime(timezone=True))
    planned_end_date = Column(DateTime(timezone=True))
    actual_start_date = Column(DateTime(timezone=True))
    actual_end_date = Column(DateTime(timezone=True))
    baseline_start_date = Column(DateTime(timezone=True))
    baseline_end_date = Column(DateTime(timezone=True))
    
    # Effort estimation
    estimated_hours = Column(Float, default=0.0)
    actual_hours = Column(Float, default=0.0)
    remaining_hours = Column(Float, default=0.0)
    progress_percentage = Column(Float, default=0.0)
    
    # Task attributes
    wbs_code = Column(String(50))  # Work Breakdown Structure code
    external_link = Column(String(500))  # Link to deliverables
    is_milestone = Column(Boolean, default=False)
    is_critical_path = Column(Boolean, default=False)
    
    # Constraints
    must_start_on = Column(DateTime(timezone=True))
    must_finish_on = Column(DateTime(timezone=True))
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    project = relationship("Project", back_populates="tasks")
    parent = relationship("Task", remote_side=[id], backref="children")
    assignments = relationship("TaskAssignment", back_populates="task")
    dependencies_as_predecessor = relationship("TaskDependency", foreign_keys="TaskDependency.predecessor_id", back_populates="predecessor")
    dependencies_as_successor = relationship("TaskDependency", foreign_keys="TaskDependency.successor_id", back_populates="successor")
    time_entries = relationship("TimeTracking", back_populates="task")
    comments = relationship("TaskComment", back_populates="task")
    history = relationship("TaskHistory", back_populates="task")
    resource_assignments = relationship("ResourceAssignment", back_populates="task")

    # Constraints
    __table_args__ = (
        CheckConstraint('progress_percentage >= 0 AND progress_percentage <= 100'),
        CheckConstraint('estimated_hours >= 0'),
        CheckConstraint('actual_hours >= 0'),
        CheckConstraint('remaining_hours >= 0'),
        Index('idx_task_project_status', 'project_id', 'status'),
        Index('idx_task_dates', 'planned_start_date', 'planned_end_date'),
    )

    def __repr__(self):
        return f"<Task(name='{self.name}', status='{self.status}', type='{self.task_type}')>"


class TaskDependency(Base):
    __tablename__ = "task_dependencies"

    id = Column(Integer, primary_key=True, index=True)
    predecessor_id = Column(Integer, ForeignKey("tasks.id"), nullable=False)
    successor_id = Column(Integer, ForeignKey("tasks.id"), nullable=False)
    dependency_type = Column(Enum(DependencyType), nullable=False, default=DependencyType.FINISH_TO_START)
    lag_days = Column(Integer, default=0)  # Delay in days
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    predecessor = relationship("Task", foreign_keys=[predecessor_id], back_populates="dependencies_as_predecessor")
    successor = relationship("Task", foreign_keys=[successor_id], back_populates="dependencies_as_successor")

    # Constraints
    __table_args__ = (
        UniqueConstraint('predecessor_id', 'successor_id', name='unique_task_dependency'),
        CheckConstraint('predecessor_id != successor_id'),
    )

    def __repr__(self):
        return f"<TaskDependency(predecessor_id={self.predecessor_id}, successor_id={self.successor_id}, type='{self.dependency_type}')>"


class TaskAssignment(Base):
    __tablename__ = "task_assignments"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Assignment attributes
    allocation_percentage = Column(Float, default=100.0)  # % of user's time for this task
    hourly_rate = Column(Float)  # Task-specific rate override
    
    # Timestamps
    assigned_at = Column(DateTime(timezone=True), server_default=func.now())
    unassigned_at = Column(DateTime(timezone=True))

    # Relationships
    task = relationship("Task", back_populates="assignments")
    user = relationship("User", back_populates="task_assignments")

    # Constraints
    __table_args__ = (
        UniqueConstraint('task_id', 'user_id', name='unique_task_assignment'),
        CheckConstraint('allocation_percentage >= 0 AND allocation_percentage <= 100'),
    )

    def __repr__(self):
        return f"<TaskAssignment(task_id={self.task_id}, user_id={self.user_id})>"


class Resource(Base):
    __tablename__ = "resources"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    
    # Resource info
    name = Column(String(200), nullable=False)
    description = Column(Text)
    resource_type = Column(Enum(ResourceType), nullable=False)
    
    # Resource attributes
    cost_per_hour = Column(Float, default=0.0)
    cost_per_use = Column(Float, default=0.0)
    max_units = Column(Float, default=1.0)  # Maximum available units
    
    # Availability
    is_active = Column(Boolean, default=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    project = relationship("Project", back_populates="resources")
    assignments = relationship("ResourceAssignment", back_populates="resource")

    def __repr__(self):
        return f"<Resource(name='{self.name}', type='{self.resource_type}')>"


class ResourceAssignment(Base):
    __tablename__ = "resource_assignments"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=False)
    resource_id = Column(Integer, ForeignKey("resources.id"), nullable=False)
    
    # Assignment attributes
    units_assigned = Column(Float, default=1.0)
    cost_override = Column(Float)  # Override default resource cost
    
    # Timestamps
    assigned_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    task = relationship("Task", back_populates="resource_assignments")
    resource = relationship("Resource", back_populates="assignments")

    # Constraints
    __table_args__ = (
        UniqueConstraint('task_id', 'resource_id', name='unique_resource_assignment'),
        CheckConstraint('units_assigned > 0'),
    )

    def __repr__(self):
        return f"<ResourceAssignment(task_id={self.task_id}, resource_id={self.resource_id})>"


class TimeTracking(Base):
    __tablename__ = "time_tracking"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Time entry
    date = Column(DateTime(timezone=True), nullable=False)
    hours = Column(Float, nullable=False)
    description = Column(Text)
    
    # Billing
    billable = Column(Boolean, default=True)
    hourly_rate = Column(Float)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    task = relationship("Task", back_populates="time_entries")
    user = relationship("User", back_populates="time_entries")

    # Constraints
    __table_args__ = (
        CheckConstraint('hours > 0'),
        Index('idx_time_tracking_date', 'date'),
        Index('idx_time_tracking_user_date', 'user_id', 'date'),
    )

    def __repr__(self):
        return f"<TimeTracking(task_id={self.task_id}, user_id={self.user_id}, hours={self.hours}, date={self.date})>"


class TaskComment(Base):
    __tablename__ = "task_comments"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Comment content
    content = Column(Text, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    task = relationship("Task", back_populates="comments")
    user = relationship("User", back_populates="task_comments")

    def __repr__(self):
        return f"<TaskComment(task_id={self.task_id}, user_id={self.user_id})>"


class TaskHistory(Base):
    __tablename__ = "task_history"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Change tracking
    field_name = Column(String(100), nullable=False)
    old_value = Column(Text)
    new_value = Column(Text)
    change_description = Column(String(500))
    
    # Timestamp
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    task = relationship("Task", back_populates="history")
    user = relationship("User")

    # Constraints
    __table_args__ = (
        Index('idx_task_history_task_date', 'task_id', 'created_at'),
    )

    def __repr__(self):
        return f"<TaskHistory(task_id={self.task_id}, field='{self.field_name}')>"


class Template(Base):
    __tablename__ = "templates"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    description = Column(Text)
    template_type = Column(Enum(TemplateType), nullable=False)
    
    # Template content (JSON)
    template_data = Column(Text, nullable=False)  # JSON structure of tasks
    
    # Metadata
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    is_public = Column(Boolean, default=False)
    usage_count = Column(Integer, default=0)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    creator = relationship("User")

    def __repr__(self):
        return f"<Template(name='{self.name}', type='{self.template_type}')>"