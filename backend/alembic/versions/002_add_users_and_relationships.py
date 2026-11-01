"""Add users, user relationships, and guest rate limits

Revision ID: 002_add_users_and_relationships
Revises: 001_initial_schema
Create Date: 2026-10-22 12:20:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

# revision identifiers, used by Alembic.
revision: str = "002_add_users_and_relationships"
down_revision: Union[str, None] = "001_initial_schema"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

DHANUSH_USER_ID = "00000000-0000-0000-0000-000000000001"
DEMO_USER_ID = "00000000-0000-0000-0000-000000000002"

# Salted PBKDF2 hashes from core.security.hash_password
DHANUSH_PWD_HASH = "45770ba20f3352a37e8bef95c188ba6b$463d3f3260e004906d0480d561a2a47a6ad3c6f93249ea7d9426777ad0a6538a"
DEMO_PWD_HASH = "39541a49dd0398b03f2abdf36a2a9690$6a5883f3d8f27d8d8cee7f56393e1b9f72ec46efe2b33b339de066f00130bd28"


def upgrade() -> None:
    # ── 1. Create users table ─────────────────────────────────────────────────
    users_table = op.create_table(
        "users",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=True),
        sa.Column("auth_provider", sa.String(length=32), nullable=False, server_default=sa.text("'local'")),
        sa.Column("google_id", sa.String(length=128), nullable=True),
        sa.Column("avatar_url", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    op.create_index("idx_users_email", "users", ["email"], unique=True)
    op.create_index("idx_users_google_id", "users", ["google_id"])

    # ── 2. Seed primary users ─────────────────────────────────────────────────
    op.execute(
        sa.text(
            """
            INSERT INTO users (id, email, name, password_hash, auth_provider, is_active)
            VALUES 
                (CAST(:dhanush_id AS uuid), 'dhanush@proeduvate.com', 'Dhanush C', :dhanush_pwd, 'local', true),
                (CAST(:demo_id AS uuid), 'demo@promptogen.ai', 'Demo User', :demo_pwd, 'local', true)
            ON CONFLICT (id) DO NOTHING
            """
        ).bindparams(
            dhanush_id=DHANUSH_USER_ID,
            dhanush_pwd=DHANUSH_PWD_HASH,
            demo_id=DEMO_USER_ID,
            demo_pwd=DEMO_PWD_HASH,
        )
    )

    # ── 3. Wire saved_prompts to users ────────────────────────────────────────
    op.add_column("saved_prompts", sa.Column("user_id", UUID(as_uuid=True), nullable=True))
    op.create_foreign_key(
        "fk_saved_prompts_user_id",
        "saved_prompts",
        "users",
        ["user_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_index("idx_saved_prompts_user_id", "saved_prompts", ["user_id"])

    # Wire all existing prompts to Dhanush C
    op.execute(
        sa.text(
            f"UPDATE saved_prompts SET user_id = CAST('{DHANUSH_USER_ID}' AS uuid) WHERE user_id IS NULL"
        )
    )

    # ── 4. Wire prompt_creations to users ──────────────────────────────────────
    op.add_column("prompt_creations", sa.Column("user_id", UUID(as_uuid=True), nullable=True))
    op.create_foreign_key(
        "fk_prompt_creations_user_id",
        "prompt_creations",
        "users",
        ["user_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index("idx_prompt_creations_user_id", "prompt_creations", ["user_id"])

    # Wire existing prompt_creations to Dhanush C
    op.execute(
        sa.text(
            f"UPDATE prompt_creations SET user_id = CAST('{DHANUSH_USER_ID}' AS uuid) WHERE user_id IS NULL"
        )
    )

    # ── 5. Wire prompt_assessments to users ────────────────────────────────────
    op.add_column("prompt_assessments", sa.Column("user_id", UUID(as_uuid=True), nullable=True))
    op.create_foreign_key(
        "fk_prompt_assessments_user_id",
        "prompt_assessments",
        "users",
        ["user_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index("idx_prompt_assessments_user_id", "prompt_assessments", ["user_id"])

    # Wire existing assessments to Dhanush C
    op.execute(
        sa.text(
            f"UPDATE prompt_assessments SET user_id = CAST('{DHANUSH_USER_ID}' AS uuid) WHERE user_id IS NULL"
        )
    )

    # ── 6. Create guest_rate_limits table ─────────────────────────────────────
    op.create_table(
        "guest_rate_limits",
        sa.Column("ip_address", sa.String(length=64), primary_key=True),
        sa.Column("usage_date", sa.Date(), primary_key=True),
        sa.Column("count", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("guest_rate_limits")

    op.drop_index("idx_prompt_assessments_user_id", table_name="prompt_assessments")
    op.drop_constraint("fk_prompt_assessments_user_id", "prompt_assessments", type_="foreignkey")
    op.drop_column("prompt_assessments", "user_id")

    op.drop_index("idx_prompt_creations_user_id", table_name="prompt_creations")
    op.drop_constraint("fk_prompt_creations_user_id", "prompt_creations", type_="foreignkey")
    op.drop_column("prompt_creations", "user_id")

    op.drop_index("idx_saved_prompts_user_id", table_name="saved_prompts")
    op.drop_constraint("fk_saved_prompts_user_id", "saved_prompts", type_="foreignkey")
    op.drop_column("saved_prompts", "user_id")

    op.drop_index("idx_users_google_id", table_name="users")
    op.drop_index("idx_users_email", table_name="users")
    op.drop_table("users")
