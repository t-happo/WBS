from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from .core.config import settings

# Choose database URL based on configuration
database_url = settings.SQLITE_URL if settings.USE_SQLITE else str(settings.DATABASE_URL)

# Create engine with appropriate settings
if settings.USE_SQLITE:
    # SQLite specific settings
    engine = create_engine(
        database_url,
        connect_args={"check_same_thread": False},  # SQLite specific
        echo=False  # Set to True for SQL logging during development
    )
else:
    # PostgreSQL settings
    engine = create_engine(
        database_url,
        pool_pre_ping=True,  # Verify connections before use
        echo=False  # Set to True for SQL logging during development
    )

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create base class for models
Base = declarative_base()


def get_db():
    """Dependency to get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_tables():
    """Create all tables"""
    Base.metadata.create_all(bind=engine)


def drop_tables():
    """Drop all tables (use with caution!)"""
    Base.metadata.drop_all(bind=engine)