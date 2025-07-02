"""Alembic environment.

This file sets up the context for Alembic so that migrations can be generated and
executed against the models defined in `app.models`.

• 接続 URL は app.core.config.settings から取得するため、alembic.ini の
  sqlalchemy.url はダミー値です。
"""
from __future__ import annotations

import os
import sys
from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool
from alembic import context

# --- パス設定 ---
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.append(BASE_DIR)  # backend/

from app.database import Base  # noqa: E402  pylint: disable=wrong-import-position
from app.core.config import settings  # noqa: E402  pylint: disable=wrong-import-position

# --------------------------------------------------
config = context.config

# 実際の DB URL を settings から設定
real_db_url = settings.SQLITE_URL if settings.USE_SQLITE else str(settings.DATABASE_URL)
config.set_main_option("sqlalchemy.url", real_db_url)

# Interpret the config file for Python logging.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata

# --------------------------------------------------

def run_migrations_offline() -> None:  # type: ignore[return-value]
    """Run migrations in 'offline' mode."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        compare_type=True,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:  # type: ignore[return-value]
    """Run migrations in 'online' mode."""
    connectable = engine_from_config(  # type: ignore[arg-type]
        config.get_section(config.config_ini_section),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()