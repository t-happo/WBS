from datetime import timedelta
from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from ...database import get_db
from ...core.config import settings
from ...core.security import create_access_token
from ...crud import user
from ...schemas.user import User, UserCreate, UserUpdate, Token, UserLogin
from ...api.deps import get_current_user, get_current_admin_user, get_optional_current_user
from ...models import UserRole, User as UserModel  # ローカル importで循環参照回避

router = APIRouter()


@router.post("/login", response_model=Token)
def login(
    db: Session = Depends(get_db),
    form_data: OAuth2PasswordRequestForm = Depends()
) -> Any:
    """OAuth2 compatible token login"""
    user_obj = user.authenticate(
        db, username=form_data.username, password=form_data.password
    )
    if not user_obj:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    elif not user.is_active(user_obj):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return Token(
        access_token=create_access_token(
            user_obj.username, expires_delta=access_token_expires
        ),
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=User.model_validate(user_obj)
    )


@router.post("/login/simple", response_model=Token)
def login_simple(
    user_data: UserLogin,
    db: Session = Depends(get_db)
) -> Any:
    """Simple login with username/password"""
    user_obj = user.authenticate(
        db, username=user_data.username, password=user_data.password
    )
    if not user_obj:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )
    elif not user.is_active(user_obj):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return Token(
        access_token=create_access_token(
            user_obj.username, expires_delta=access_token_expires
        ),
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=User.model_validate(user_obj)
    )


@router.get("/me", response_model=User)
def read_user_me(
    current_user: User = Depends(get_current_user),
) -> Any:
    """Get current user"""
    return current_user


@router.put("/me", response_model=User)
def update_user_me(
    *,
    db: Session = Depends(get_db),
    user_in: UserUpdate,
    current_user: User = Depends(get_current_user),
) -> Any:
    """Update current user"""
    user_obj = user.update(db, db_obj=current_user, obj_in=user_in)
    return user_obj


@router.get("/", response_model=List[User])
def read_users(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
) -> Any:
    """Retrieve users"""
    users = user.get_multi(db, skip=skip, limit=limit)
    return users


@router.post("/", response_model=User)
def create_user(
    *,
    db: Session = Depends(get_db),
    user_in: UserCreate,
    current_user: Optional[User] = Depends(get_optional_current_user),
) -> Any:
    """Create new user.

    * 初回ユーザー登録 (テーブルにレコードが 0 件) の場合は認証不要。
    * それ以降は SYSTEM_ADMIN / PROJECT_OWNER のみ許可。
    """

    # ユーザーが存在するかを確認
    total_users: int = db.query(UserModel).count()

    if total_users > 0:
        # 既にユーザーがいる場合は認可チェック
        if current_user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication credentials were not provided",
            )
        if current_user.role not in [UserRole.SYSTEM_ADMIN, UserRole.PROJECT_OWNER]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions",
            )

    # -- 入力値重複チェック --
    user_obj = user.get_by_email(db, email=user_in.email)
    if user_obj:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The user with this email already exists in the system.",
        )

    user_obj = user.get_by_username(db, username=user_in.username)
    if user_obj:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The user with this username already exists in the system.",
        )

    # -- ユーザー作成 --
    user_obj = user.create(db, obj_in=user_in)
    return user_obj


@router.get("/{user_id}", response_model=User)
def read_user_by_id(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    """Get a specific user by id"""
    user_obj = user.get(db, id=user_id)
    if not user_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return user_obj


@router.put("/{user_id}", response_model=User)
def update_user(
    *,
    db: Session = Depends(get_db),
    user_id: int,
    user_in: UserUpdate,
    current_user: User = Depends(get_current_admin_user),
) -> Any:
    """Update a user (admin only)"""
    user_obj = user.get(db, id=user_id)
    if not user_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    user_obj = user.update(db, db_obj=user_obj, obj_in=user_in)
    return user_obj


@router.delete("/{user_id}")
def delete_user(
    *,
    db: Session = Depends(get_db),
    user_id: int,
    current_user: User = Depends(get_current_admin_user),
) -> Any:
    """Delete a user (admin only)"""
    user_obj = user.get(db, id=user_id)
    if not user_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    user.remove(db, id=user_id)
    return {"message": "User deleted successfully"}


@router.get("/search/{search_term}", response_model=List[User])
def search_users(
    *,
    db: Session = Depends(get_db),
    search_term: str,
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
) -> Any:
    """Search users"""
    users = user.search_users(db, search_term=search_term, skip=skip, limit=limit)
    return users