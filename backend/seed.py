#!/usr/bin/env python3
"""
初期データ投入スクリプト
最初のSystemAdminユーザーを作成します
"""
import sys
from pathlib import Path

# プロジェクトルートをPythonパスに追加
sys.path.insert(0, str(Path(__file__).parent))

from app.database import SessionLocal, engine, Base
from app.models import User, UserRole
from app.core.security import get_password_hash
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def create_initial_admin():
    """初期のSystemAdminユーザーを作成"""
    db = SessionLocal()
    try:
        # テーブルが存在することを確認
        Base.metadata.create_all(bind=engine)
        
        # 既存のadminユーザーをチェック
        existing_admin = db.query(User).filter(
            User.email == "admin@example.com"
        ).first()
        
        if existing_admin:
            logger.info("SystemAdmin user already exists")
            return
        
        # SystemAdminユーザーを作成
        admin_user = User(
            email="admin@example.com",
            username="admin",
            hashed_password=get_password_hash("admin123"),  # 本番環境では変更必須
            role=UserRole.SYSTEM_ADMIN,
            is_active=True
        )
        
        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)
        
        logger.info(f"Created SystemAdmin user: {admin_user.email}")
        logger.warning("⚠️  デフォルトパスワードは 'admin123' です。本番環境では必ず変更してください！")
        
    except Exception as e:
        logger.error(f"Error creating initial admin: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    logger.info("Starting seed script...")
    create_initial_admin()
    logger.info("Seed script completed!")