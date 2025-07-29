from typing import List, Optional
from sqlalchemy.orm import Session, joinedload
from ..crud.base import CRUDBase
from ..models import Project, ProjectMember, User, Task
from ..schemas.project import ProjectCreate, ProjectUpdate, ProjectMemberCreate, ProjectMemberUpdate


class CRUDProject(CRUDBase[Project, ProjectCreate, ProjectUpdate]):
    def get_by_owner(
        self, db: Session, *, owner_id: int, skip: int = 0, limit: int = 100
    ) -> List[Project]:
        """Get projects by owner"""
        return (
            db.query(Project)
            .filter(Project.owner_id == owner_id)
            .offset(skip)
            .limit(limit)
            .all()
        )

    def get_by_member(
        self, db: Session, *, user_id: int, skip: int = 0, limit: int = 100
    ) -> List[Project]:
        """Get projects where user is a member"""
        return (
            db.query(Project)
            .join(ProjectMember)
            .filter(ProjectMember.user_id == user_id)
            .filter(ProjectMember.left_at.is_(None))
            .offset(skip)
            .limit(limit)
            .all()
        )

    def get_with_members(self, db: Session, *, project_id: int) -> Optional[Project]:
        """Get project with all members"""
        return (
            db.query(Project)
            .options(
                joinedload(Project.members).joinedload(ProjectMember.user),
                joinedload(Project.owner)
            )
            .filter(Project.id == project_id)
            .first()
        )

    def search_projects(
        self, db: Session, *, search_term: str, skip: int = 0, limit: int = 100
    ) -> List[Project]:
        """Search projects by name or description"""
        return (
            db.query(Project)
            .filter(
                (Project.name.contains(search_term)) |
                (Project.description.contains(search_term))
            )
            .offset(skip)
            .limit(limit)
            .all()
        )

    def get_by_status(
        self, db: Session, *, status: str, skip: int = 0, limit: int = 100
    ) -> List[Project]:
        """Get projects by status"""
        return (
            db.query(Project)
            .filter(Project.status == status)
            .offset(skip)
            .limit(limit)
            .all()
        )

    def create_with_owner(self, db: Session, *, obj_in: ProjectCreate, owner_id: int) -> Project:
        """Create project and automatically add owner as member"""
        from ..models import UserRole
        
        # Create project
        project_data = obj_in.model_dump()  # Use model_dump() for Pydantic v2
        project_data["owner_id"] = owner_id
        db_obj = Project(**project_data)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        
        # Add owner as project member
        member_data = ProjectMemberCreate(
            project_id=db_obj.id,
            user_id=owner_id,
            role=UserRole.PROJECT_OWNER
        )
        project_member.create(db, obj_in=member_data)
        
        return db_obj


class CRUDProjectMember(CRUDBase[ProjectMember, ProjectMemberCreate, ProjectMemberUpdate]):
    def get_by_project(
        self, db: Session, *, project_id: int, skip: int = 0, limit: int = 100
    ) -> List[ProjectMember]:
        """Get all members of a project"""
        return (
            db.query(ProjectMember)
            .options(joinedload(ProjectMember.user))
            .filter(ProjectMember.project_id == project_id)
            .filter(ProjectMember.left_at.is_(None))
            .offset(skip)
            .limit(limit)
            .all()
        )

    def get_by_user_and_project(
        self, db: Session, *, user_id: int, project_id: int
    ) -> Optional[ProjectMember]:
        """Get specific project membership"""
        return (
            db.query(ProjectMember)
            .filter(ProjectMember.user_id == user_id)
            .filter(ProjectMember.project_id == project_id)
            .filter(ProjectMember.left_at.is_(None))
            .first()
        )

    def is_member(self, db: Session, *, user_id: int, project_id: int) -> bool:
        """Check if user is a member of project"""
        member = self.get_by_user_and_project(db, user_id=user_id, project_id=project_id)
        return member is not None

    def has_permission(
        self, db: Session, *, user_id: int, project_id: int, required_roles: List[str]
    ) -> bool:
        """Check if user has required role in project"""
        member = self.get_by_user_and_project(db, user_id=user_id, project_id=project_id)
        if not member:
            return False
        return member.role in required_roles

    def remove_member(self, db: Session, *, user_id: int, project_id: int) -> Optional[ProjectMember]:
        """Remove member from project (soft delete)"""
        from datetime import datetime
        
        member = self.get_by_user_and_project(db, user_id=user_id, project_id=project_id)
        if member:
            member.left_at = datetime.utcnow()
            db.commit()
            db.refresh(member)
        return member

    def get_user_projects_with_role(
        self, db: Session, *, user_id: int, role: str
    ) -> List[ProjectMember]:
        """Get all projects where user has specific role"""
        return (
            db.query(ProjectMember)
            .options(joinedload(ProjectMember.project))
            .filter(ProjectMember.user_id == user_id)
            .filter(ProjectMember.role == role)
            .filter(ProjectMember.left_at.is_(None))
            .all()
        )


project = CRUDProject(Project)
project_member = CRUDProjectMember(ProjectMember)