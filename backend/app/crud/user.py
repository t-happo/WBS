from typing import Any, Dict, Optional, Union
from sqlalchemy.orm import Session
from ..core.security import get_password_hash, verify_password
from ..crud.base import CRUDBase
from ..models import User
from ..schemas.user import UserCreate, UserUpdate


class CRUDUser(CRUDBase[User, UserCreate, UserUpdate]):
    def get_by_email(self, db: Session, *, email: str) -> Optional[User]:
        """Get user by email"""
        return db.query(User).filter(User.email == email).first()

    def get_by_username(self, db: Session, *, username: str) -> Optional[User]:
        """Get user by username"""
        return db.query(User).filter(User.username == username).first()

    def create(self, db: Session, *, obj_in: UserCreate) -> User:
        """Create user with hashed password"""
        db_obj = User(
            username=obj_in.username,
            email=obj_in.email,
            full_name=obj_in.full_name,
            hashed_password=get_password_hash(obj_in.password),
            role=obj_in.role,
            is_active=obj_in.is_active,
            job_title=obj_in.job_title,
            department=obj_in.department,
            hourly_rate=obj_in.hourly_rate,
            daily_capacity=obj_in.daily_capacity,
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def update(
        self, db: Session, *, db_obj: User, obj_in: Union[UserUpdate, Dict[str, Any]]
    ) -> User:
        """Update user with password hashing if password is provided"""
        if isinstance(obj_in, dict):
            update_data = obj_in
        else:
            update_data = obj_in.dict(exclude_unset=True)
        
        # Hash password if provided
        if "password" in update_data:
            hashed_password = get_password_hash(update_data["password"])
            del update_data["password"]
            update_data["hashed_password"] = hashed_password
        
        return super().update(db, db_obj=db_obj, obj_in=update_data)

    def authenticate(self, db: Session, *, username: str, password: str) -> Optional[User]:
        """Authenticate user"""
        user = self.get_by_username(db, username=username)
        if not user:
            return None
        if not verify_password(password, user.hashed_password):
            return None
        return user

    def is_active(self, user: User) -> bool:
        """Check if user is active"""
        return user.is_active

    def is_admin(self, user: User) -> bool:
        """Check if user is admin"""
        from ..models import UserRole
        return user.role in [UserRole.SYSTEM_ADMIN, UserRole.PROJECT_OWNER]

    def get_multi_by_role(
        self, db: Session, *, role: str, skip: int = 0, limit: int = 100
    ) -> list[User]:
        """Get users by role"""
        return (
            db.query(User)
            .filter(User.role == role)
            .offset(skip)
            .limit(limit)
            .all()
        )

    def search_users(
        self, db: Session, *, search_term: str, skip: int = 0, limit: int = 100
    ) -> list[User]:
        """Search users by username, email, or full name"""
        return (
            db.query(User)
            .filter(
                (User.username.contains(search_term)) |
                (User.email.contains(search_term)) |
                (User.full_name.contains(search_term))
            )
            .offset(skip)
            .limit(limit)
            .all()
        )


user = CRUDUser(User)