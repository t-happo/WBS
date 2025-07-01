from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict
from ..models import ProjectStatus, UserRole, TemplateType
from .user import User


# Project schemas
class ProjectBase(BaseModel):
    name: str
    description: Optional[str] = None
    status: ProjectStatus = ProjectStatus.PLANNING
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    budget: float = 0.0
    is_template: bool = False
    template_type: Optional[TemplateType] = None


class ProjectCreate(ProjectBase):
    owner_id: Optional[int] = None  # Will be set to current user if not provided


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[ProjectStatus] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    baseline_start_date: Optional[datetime] = None
    baseline_end_date: Optional[datetime] = None
    budget: Optional[float] = None
    is_template: Optional[bool] = None
    template_type: Optional[TemplateType] = None


class ProjectInDB(ProjectBase):
    id: int
    owner_id: int
    baseline_start_date: Optional[datetime] = None
    baseline_end_date: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)


class Project(ProjectBase):
    id: int
    owner_id: int
    baseline_start_date: Optional[datetime] = None
    baseline_end_date: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    owner: User
    
    model_config = ConfigDict(from_attributes=True)


# Project Member schemas
class ProjectMemberBase(BaseModel):
    user_id: int
    role: UserRole = UserRole.TEAM_MEMBER
    hourly_rate: Optional[float] = None
    allocation_percentage: float = 100.0


class ProjectMemberCreate(ProjectMemberBase):
    project_id: int


class ProjectMemberUpdate(BaseModel):
    role: Optional[UserRole] = None
    hourly_rate: Optional[float] = None
    allocation_percentage: Optional[float] = None


class ProjectMemberInDB(ProjectMemberBase):
    id: int
    project_id: int
    joined_at: datetime
    left_at: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)


class ProjectMember(ProjectMemberBase):
    id: int
    project_id: int
    joined_at: datetime
    left_at: Optional[datetime] = None
    user: User
    
    model_config = ConfigDict(from_attributes=True)


# Project with members
class ProjectWithMembers(Project):
    members: List[ProjectMember] = []


# Project summary for listings
class ProjectSummary(BaseModel):
    id: int
    name: str
    status: ProjectStatus
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    owner: User
    member_count: int
    task_count: int
    progress_percentage: float
    
    model_config = ConfigDict(from_attributes=True)