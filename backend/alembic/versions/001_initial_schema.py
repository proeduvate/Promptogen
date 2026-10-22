"""Initial database setup for Promptogen

Revision ID: 001_initial_schema
Revises: 
Create Date: 2026-10-13 17:15:00.000000

"""
from typing import Sequence, Union
import json
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB, UUID

revision: str = "001_initial_schema"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── 1. prompt_assessments ─────────────────────────────────────────────────
    op.create_table(
        "prompt_assessments",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("prompt_text", sa.Text(), nullable=False),
        sa.Column("overall_score", sa.Integer(), nullable=False),
        sa.Column("clarity", sa.Integer(), nullable=False),
        sa.Column("specificity", sa.Integer(), nullable=False),
        sa.Column("context", sa.Integer(), nullable=False),
        sa.Column("structure", sa.Integer(), nullable=False),
        sa.Column("actionability", sa.Integer(), nullable=False),
        sa.Column("suggestions", JSONB(), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    # ── 2. prompt_creations ───────────────────────────────────────────────────
    op.create_table(
        "prompt_creations",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("original_query", sa.Text(), nullable=False),
        sa.Column("questions", JSONB(), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("answers", JSONB(), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("prompt_title", sa.Text(), nullable=True),
        sa.Column("optimized_prompt", sa.Text(), nullable=True),
        sa.Column("overall_score", sa.Integer(), nullable=True),
        sa.Column("clarity", sa.Integer(), nullable=True),
        sa.Column("specificity", sa.Integer(), nullable=True),
        sa.Column("context", sa.Integer(), nullable=True),
        sa.Column("structure", sa.Integer(), nullable=True),
        sa.Column("actionability", sa.Integer(), nullable=True),
        sa.Column("suggestions", JSONB(), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("status", sa.String(length=64), nullable=False, server_default=sa.text("'awaiting_answers'")),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    # ── 3. library_folders ────────────────────────────────────────────────────
    folders_table = op.create_table(
        "library_folders",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("label", sa.String(length=128), nullable=False),
        sa.Column("icon", sa.String(length=64), nullable=False),
        sa.Column("tone", sa.String(length=64), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    # ── 4. saved_prompts ──────────────────────────────────────────────────────
    prompts_table = op.create_table(
        "saved_prompts",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("created_by", sa.String(length=64), nullable=False, server_default=sa.text("'you'")),
        sa.Column("model", sa.String(length=64), nullable=False, server_default=sa.text("'GPT-4o'")),
        sa.Column("folder_id", sa.String(length=64), sa.ForeignKey("library_folders.id", ondelete="SET NULL"), nullable=True),
        sa.Column("tags", JSONB(), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("score", sa.Integer(), nullable=False, server_default=sa.text("85")),
        sa.Column("favorite", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("archived", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("prompt_text", sa.Text(), nullable=True),
        sa.Column("sections", JSONB(), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("current_version", sa.String(length=32), nullable=True, server_default=sa.text("'v1'")),
        sa.Column("versions", JSONB(), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    op.create_index("idx_saved_prompts_folder", "saved_prompts", ["folder_id"])
    op.create_index("idx_saved_prompts_created_at", "saved_prompts", ["created_at"])

    # ── 5. Seed initial data ──────────────────────────────────────────────────
    initial_folders = [
        {"id": "all", "label": "All Prompts", "icon": "LayoutGrid", "tone": "text-brand"},
        {"id": "marketing", "label": "Marketing", "icon": "Megaphone", "tone": "text-pink"},
        {"id": "product", "label": "Product", "icon": "Package", "tone": "text-amber"},
        {"id": "development", "label": "Development", "icon": "Code2", "tone": "text-good"},
        {"id": "content", "label": "Content Writing", "icon": "PenLine", "tone": "text-purple"},
        {"id": "research", "label": "Research", "icon": "FlaskConical", "tone": "text-cyan"},
        {"id": "personal", "label": "Personal", "icon": "User", "tone": "text-brand"},
        {"id": "archived", "label": "Archived", "icon": "Archive", "tone": "text-muted"},
    ]
    op.bulk_insert(folders_table, initial_folders)

    initial_prompts = [
        {
            "id": "saas-marketing",
            "title": "Marketing strategy for SaaS product",
            "created_by": "you",
            "model": "GPT-4o",
            "folder_id": "marketing",
            "tags": ["Marketing", "Strategy", "SaaS"],
            "score": 80,
            "favorite": True,
            "archived": False,
            "sections": [
                {
                    "id": "role",
                    "label": "SYSTEM / ROLE",
                    "type": "text",
                    "content": "You are an expert AI Marketing Strategist with 10+ years of experience in B2B SaaS growth.",
                },
                {
                    "id": "task",
                    "label": "TASK",
                    "type": "text",
                    "content": "Create a comprehensive go-to-market strategy for a productivity SaaS product.",
                },
            ],
            "versions": [],
        },
        {
            "id": "launch-emails",
            "title": "Product launch email sequence",
            "created_by": "you",
            "model": "GPT-4o",
            "folder_id": "marketing",
            "tags": ["Marketing", "Email", "Launch"],
            "score": 90,
            "favorite": False,
            "archived": False,
            "sections": [
                {
                    "id": "role",
                    "label": "SYSTEM / ROLE",
                    "type": "text",
                    "content": "You are an expert email copywriter specializing in product launches.",
                },
                {
                    "id": "task",
                    "label": "TASK",
                    "type": "text",
                    "content": "Create a 5-email launch sequence for a new productivity app.",
                },
            ],
            "versions": [],
        },
        {
            "id": "code-review",
            "title": "Code review best practices guide",
            "created_by": "you",
            "model": "Claude 3.5",
            "folder_id": "development",
            "tags": ["Development", "Code", "Guide"],
            "score": 72,
            "favorite": False,
            "archived": False,
            "sections": [],
            "versions": [],
        },
        {
            "id": "ai-healthcare-blog",
            "title": "Blog on AI in healthcare",
            "created_by": "you",
            "model": "Claude 3.5",
            "folder_id": "content",
            "tags": ["Content", "Blog", "AI", "Healthcare"],
            "score": 65,
            "favorite": False,
            "archived": False,
            "sections": [],
            "versions": [],
        },
        {
            "id": "social-calendar",
            "title": "Social media content calendar",
            "created_by": "you",
            "model": "GPT-4o",
            "folder_id": "marketing",
            "tags": ["Marketing", "Social Media", "Content"],
            "score": 78,
            "favorite": False,
            "archived": False,
            "sections": [],
            "versions": [],
        },
        {
            "id": "competitor-analysis",
            "title": "Competitor analysis framework",
            "created_by": "you",
            "model": "GPT-4o",
            "folder_id": "research",
            "tags": ["Strategy", "Business", "Analysis"],
            "score": 83,
            "favorite": False,
            "archived": False,
            "sections": [],
            "versions": [],
        },
    ]

    for p in initial_prompts:
        op.execute(
            sa.text(
                """
                INSERT INTO saved_prompts (
                    id, title, created_by, model, folder_id, tags, score, favorite, archived, sections, versions
                ) VALUES (
                    :id, :title, :created_by, :model, :folder_id, CAST(:tags AS jsonb), :score, :favorite, :archived, CAST(:sections AS jsonb), CAST(:versions AS jsonb)
                )
                """
            ).bindparams(
                id=p["id"],
                title=p["title"],
                created_by=p["created_by"],
                model=p["model"],
                folder_id=p["folder_id"],
                tags=json.dumps(p["tags"]),
                score=p["score"],
                favorite=p["favorite"],
                archived=p["archived"],
                sections=json.dumps(p["sections"]),
                versions=json.dumps(p["versions"]),
            )
        )


def downgrade() -> None:
    op.drop_table("saved_prompts")
    op.drop_table("library_folders")
    op.drop_table("prompt_creations")
    op.drop_table("prompt_assessments")
