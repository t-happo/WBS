#!/usr/bin/env python3
"""Script to create the first admin user"""

from app.database import get_db
from app.crud import user
from app.schemas.user import UserCreate

def create_admin_user():
    db = next(get_db())
    
    # Check if admin already exists
    existing_user = user.get_by_username(db, username="admin")
    if existing_user:
        print("Admin user already exists!")
        return
    
    # Create admin user
    admin_data = UserCreate(
        username="admin",
        email="admin@example.com",
        full_name="System Administrator",
        password="admin123",
        role="system_admin",
        is_active=True,
        daily_capacity=8.0
    )
    
    admin_user = user.create(db, obj_in=admin_data)
    print(f"Admin user created successfully!")
    print(f"Username: {admin_user.username}")
    print(f"Email: {admin_user.email}")
    print(f"Role: {admin_user.role}")
    print(f"Password: admin123")
    print("\nYou can now login with these credentials.")

if __name__ == "__main__":
    create_admin_user()