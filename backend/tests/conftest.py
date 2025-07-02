"""
pytest共通設定とフィクスチャ
"""
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient
import sys
from pathlib import Path

# プロジェクトルートをPythonパスに追加
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.database import Base, get_db
from app.main import app
from app.models import User, UserRole
from app.core.security import get_password_hash


# テスト用のSQLiteデータベース
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def db():
    """テスト用データベースセッション"""
    # テーブルを作成
    Base.metadata.create_all(bind=engine)
    
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        # テーブルを削除
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db):
    """テスト用FastAPIクライアント"""
    def override_get_db():
        try:
            yield db
        finally:
            pass
    
    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture
def test_user(db):
    """テスト用一般ユーザー"""
    user = User(
        email="test@example.com",
        username="testuser",
        hashed_password=get_password_hash("testpass123"),
        role=UserRole.TEAM_MEMBER,
        is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def test_admin(db):
    """テスト用管理者ユーザー"""
    admin = User(
        email="admin@example.com",
        username="admin",
        hashed_password=get_password_hash("adminpass123"),
        role=UserRole.SYSTEM_ADMIN,
        is_active=True
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)
    return admin


@pytest.fixture
def auth_headers(client, test_user):
    """認証済みヘッダー（一般ユーザー）"""
    response = client.post(
        "/api/v1/users/login/simple",
        json={"username": "testuser", "password": "testpass123"}
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def admin_auth_headers(client, test_admin):
    """認証済みヘッダー（管理者）"""
    response = client.post(
        "/api/v1/users/login/simple",
        json={"username": "admin", "password": "adminpass123"}
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}