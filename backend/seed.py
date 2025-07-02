#!/usr/bin/env python3
"""
Database seeding script for project management tool.
Creates initial system administrator user.
"""

import sys
import os
from pathlib import Path

# Add the parent directory to Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from sqlalchemy.orm import Session
from app.database import SessionLocal, create_tables
from app.models.models import User, UserRole
from app.core.security import get_password_hash


def create_system_admin():
    """Create the initial system administrator user."""
    db: Session = SessionLocal()
    
    try:
        # Check if system admin already exists
        existing_admin = db.query(User).filter(
            User.role == UserRole.SYSTEM_ADMIN
        ).first()
        
        if existing_admin:
            print(f"System admin already exists: {existing_admin.username}")
            return
        
        # Create system admin user
        admin_user = User(
            username="admin",
            email="admin@example.com",
            full_name="System Administrator",
            hashed_password=get_password_hash("admin123"),
            role=UserRole.SYSTEM_ADMIN,
            is_active=True,
            job_title="System Administrator",
            department="IT"
        )
        
        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)
        
        print(f"✅ System admin created successfully:")
        print(f"   Username: {admin_user.username}")
        print(f"   Email: {admin_user.email}")
        print(f"   Password: admin123")
        print(f"   Role: {admin_user.role}")
        
    except Exception as e:
        print(f"❌ Error creating system admin: {e}")
        db.rollback()
        raise
    finally:
        db.close()


def main():
    """Main seeding function."""
    print("🌱 Starting database seeding...")
    
    # Create tables if they don't exist
    print("📋 Creating database tables...")
    create_tables()
    
    # Create system admin
    print("👤 Creating system administrator...")
    create_system_admin()
    
    print("✅ Database seeding completed!")


if __name__ == "__main__":
    main()