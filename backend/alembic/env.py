import os
import sys
from pathlib import Path
from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool
from dotenv import load_dotenv

# Ensure backend root is in sys.path
backend_root = Path(__file__).resolve().parent.parent
if str(backend_root) not in sys.path:
    sys.path.insert(0, str(backend_root))

from models.models import Base
from core.database import normalize_database_url

# Load .env file
load_dotenv()

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Dynamically set sqlalchemy.url from environment with %40-safe normalization
raw_database_url = os.getenv("DATABASE_URL")
if raw_database_url:
    # Normalize URL: converts raw '@' in passwords to '%40' and preserves existing '%40'
    normalized_url = normalize_database_url(raw_database_url)
    if normalized_url.startswith("postgresql://"):
        normalized_url = normalized_url.replace("postgresql://", "postgresql+psycopg://", 1)
    elif normalized_url.startswith("postgres://"):
        normalized_url = normalized_url.replace("postgres://", "postgresql+psycopg://", 1)

    # Escape % as %% for configparser so %40 in passwords does not raise interpolation ValueError
    config.set_main_option("sqlalchemy.url", normalized_url.replace("%", "%%"))

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    from sqlalchemy import create_engine

    # Use resolved URL directly to avoid configparser % interpolation issues
    url = config.get_main_option("sqlalchemy.url")
    connectable = create_engine(url, poolclass=pool.NullPool)

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
