from app.database import SessionLocal, Base, engine
from app.models import User, UserRole  # noqa: F401 (importing for table creation)
from app.schemas.user import UserCreate
from app.crud import user as crud_user


def main() -> None:
    """Create initial SystemAdmin user if user table is empty."""
    # Ensure tables exist (in case Alembic not yet run for SQLite quick start)
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        user_count = db.query(User).count()
        if user_count > 0:
            print("✅ Users already exist – seed skipped.")
            return

        admin_in = UserCreate(
            username="admin",
            email="admin@example.com",
            full_name="System Administrator",
            password="admin123",
            role=UserRole.SYSTEM_ADMIN,
            is_active=True,
        )
        crud_user.create(db, obj_in=admin_in)
        print(
            "✅ Admin user created.\n    username: admin\n    password: admin123\n    role: system_admin"
        )
    finally:
        db.close()


if __name__ == "__main__":
    main()