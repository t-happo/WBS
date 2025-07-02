from __future__ import annotations

import argparse
import os
import sys
from typing import Optional

# Ensure backend/app is on PYTHONPATH when executed from project root
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
APP_DIR = os.path.join(CURRENT_DIR, "app")
if APP_DIR not in sys.path:
    sys.path.append(APP_DIR)

from app.database import Base, SessionLocal, engine  # noqa: E402
from app.models.models import User, UserRole  # noqa: E402
from app.core.security import get_password_hash  # noqa: E402


def create_system_admin(username: str, email: str, password: str, full_name: str = "System Administrator") -> None:
    """Create a SystemAdmin user if one does not already exist."""

    # Ensure DB schema exists (particularly useful for SQLite dev)
    Base.metadata.create_all(bind=engine)

    session = SessionLocal()
    try:
        # Check if a SystemAdmin already exists
        existing_admin = (
            session.query(User)
            .filter(User.role == UserRole.SYSTEM_ADMIN)
            .order_by(User.id)
            .first()
        )
        if existing_admin:
            print(
                f"[INFO] SystemAdmin user already exists (username={existing_admin.username}, id={existing_admin.id}). Skipping creation."
            )
            return

        hashed_pw = get_password_hash(password)
        admin_user = User(
            username=username,
            email=email,
            full_name=full_name,
            hashed_password=hashed_pw,
            role=UserRole.SYSTEM_ADMIN,
            is_active=True,
        )
        session.add(admin_user)
        session.commit()
        print(f"[SUCCESS] SystemAdmin user created (username={username}).")
    except Exception as exc:  # pragma: no cover
        session.rollback()
        print(f"[ERROR] Failed to create SystemAdmin user: {exc}")
        raise
    finally:
        session.close()


def parse_args(argv: Optional[list[str]] = None) -> argparse.Namespace:  # pragma: no cover
    parser = argparse.ArgumentParser(description="Seed initial data into the database.")
    parser.add_argument("--username", default="admin", help="Username for the SystemAdmin")
    parser.add_argument("--email", default="admin@example.com", help="Email for the SystemAdmin")
    parser.add_argument("--password", default="admin123", help="Password for the SystemAdmin")
    parser.add_argument(
        "--full-name",
        dest="full_name",
        default="System Administrator",
        help="Full name for the SystemAdmin",
    )
    return parser.parse_args(argv)


def main(argv: Optional[list[str]] = None) -> None:  # pragma: no cover
    args = parse_args(argv)
    create_system_admin(args.username, args.email, args.password, args.full_name)


if __name__ == "__main__":  # pragma: no cover
    main()