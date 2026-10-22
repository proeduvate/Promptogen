"""Tests for Alembic migrations, database models, and schema definitions."""

import os
from pathlib import Path
from alembic.config import Config
from alembic.script import ScriptDirectory
import pytest

from models.models import (
    Base,
    User,
    LibraryFolder,
    SavedPrompt,
    PromptCreation,
    PromptAssessment,
    GuestRateLimit,
)


def test_base_metadata_contains_all_models():
    """Verify that all core application models are registered in Base.metadata."""
    table_names = set(Base.metadata.tables.keys())
    expected_tables = {
        "users",
        "library_folders",
        "saved_prompts",
        "prompt_creations",
        "prompt_assessments",
        "guest_rate_limits",
    }
    assert expected_tables.issubset(table_names), f"Missing tables: {expected_tables - table_names}"


def test_users_table_schema():
    """Verify the users table has all required columns, indexes, and constraints."""
    table = Base.metadata.tables["users"]

    # Verify primary key
    assert table.c.id.primary_key
    assert table.c.id.type.python_type.__name__ == "UUID"

    # Verify column existence and attributes
    assert not table.c.email.nullable
    assert table.c.email.unique or any(idx.unique for idx in table.indexes if "email" in [c.name for c in idx.columns])
    assert not table.c.name.nullable
    assert table.c.password_hash.nullable
    assert not table.c.auth_provider.nullable
    assert table.c.google_id.nullable
    assert table.c.avatar_url.nullable
    assert not table.c.is_active.nullable
    assert not table.c.created_at.nullable
    assert not table.c.updated_at.nullable


def test_user_relationships_and_foreign_keys():
    """Verify foreign keys connect saved_prompts, prompt_creations, and prompt_assessments to users."""
    # saved_prompts -> users
    prompts_table = Base.metadata.tables["saved_prompts"]
    user_fk_prompts = [fk for fk in prompts_table.foreign_keys if fk.column.table.name == "users"]
    assert len(user_fk_prompts) == 1
    assert user_fk_prompts[0].parent.name == "user_id"
    assert user_fk_prompts[0].ondelete == "CASCADE"

    # prompt_creations -> users
    creations_table = Base.metadata.tables["prompt_creations"]
    user_fk_creations = [fk for fk in creations_table.foreign_keys if fk.column.table.name == "users"]
    assert len(user_fk_creations) == 1
    assert user_fk_creations[0].parent.name == "user_id"
    assert user_fk_creations[0].ondelete == "SET NULL"

    # prompt_assessments -> users
    assessments_table = Base.metadata.tables["prompt_assessments"]
    user_fk_assessments = [fk for fk in assessments_table.foreign_keys if fk.column.table.name == "users"]
    assert len(user_fk_assessments) == 1
    assert user_fk_assessments[0].parent.name == "user_id"
    assert user_fk_assessments[0].ondelete == "SET NULL"


def test_guest_rate_limits_composite_pk():
    """Verify guest_rate_limits has composite primary key on ip_address and usage_date."""
    table = Base.metadata.tables["guest_rate_limits"]
    pk_cols = [c.name for c in table.primary_key.columns]
    assert set(pk_cols) == {"ip_address", "usage_date"}
    assert not table.c.count.nullable


def test_alembic_migration_chain():
    """Verify that Alembic migrations form a continuous, unbroken chain."""
    backend_dir = Path(__file__).resolve().parent.parent
    ini_path = backend_dir / "alembic.ini"
    assert ini_path.exists()

    config = Config(str(ini_path))
    config.set_main_option("script_location", str(backend_dir / "alembic"))
    script_dir = ScriptDirectory.from_config(config)

    # Get heads and base
    heads = script_dir.get_heads()
    assert len(heads) == 1
    assert heads[0] == "002_add_users_and_relationships"

    base = script_dir.get_base()
    assert base == "001_initial_schema"

    # Verify revision sequence
    revs = list(script_dir.walk_revisions(base="base", head="head"))
    rev_ids = [r.revision for r in revs]
    assert rev_ids == ["002_add_users_and_relationships", "001_initial_schema"]


def test_db_connection_url_normalization_with_at_and_percent_40():
    """Verify that database URLs with @ in password or %40 are properly parsed."""
    from core.database import normalize_database_url
    from sqlalchemy.engine import make_url

    # Case 1: Password with %40 already encoded (e.g. Supabase connection string)
    url_encoded = "postgresql://promptogen_admin:Secret%40Pass2026@db.supabase.co:5432/mydb"
    norm_encoded = normalize_database_url(url_encoded)
    assert norm_encoded == url_encoded
    sqla_1 = make_url(norm_encoded)
    assert sqla_1.password == "Secret@Pass2026"
    assert sqla_1.host == "db.supabase.co"

    # Case 2: Password with raw unencoded @ in password
    url_raw = "postgresql://promptogen_admin:Secret@Pass2026@db.supabase.co:5432/mydb"
    norm_raw = normalize_database_url(url_raw)
    assert norm_raw == "postgresql://promptogen_admin:Secret%40Pass2026@db.supabase.co:5432/mydb"
    sqla_2 = make_url(norm_raw)
    assert sqla_2.password == "Secret@Pass2026"
    assert sqla_2.host == "db.supabase.co"

    # Case 3: URL without password
    url_no_pwd = "postgresql+psycopg://dhanushc@localhost:5432/promptogen"
    norm_no_pwd = normalize_database_url(url_no_pwd)
    assert norm_no_pwd == url_no_pwd
    sqla_3 = make_url(norm_no_pwd)
    assert sqla_3.password is None
    assert sqla_3.host == "localhost"
