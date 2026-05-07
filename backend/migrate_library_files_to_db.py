"""One-time migration: JSON library files -> PostgreSQL.

- Reads existing items from ../data/library/*.json
- Inserts into Postgres table library_items (created automatically)
- Skips IDs that already exist

Usage (Windows PowerShell):
  cd backend
  .\venv\Scripts\Activate.ps1
  python migrate_library_files_to_db.py
"""

from __future__ import annotations

import json
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker

import main


def _project_root() -> Path:
    return Path(__file__).resolve().parent.parent


def run() -> None:
    root = _project_root()
    load_dotenv(root / ".env", override=False)

    database_url = main.get_database_url()
    if not database_url:
        raise SystemExit("DATABASE_URL is not set. Add it to .env and restart.")

    engine = create_engine(database_url, pool_pre_ping=True)
    main.Base.metadata.create_all(engine)
    SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

    library_dir = main.LIBRARY_DIR
    files = sorted(library_dir.glob("*.json"))
    if not files:
        print("No JSON library files found to migrate.")
        return

    inserted = 0
    skipped = 0
    failed = 0

    with SessionLocal() as session:
        for f in files:
            try:
                data = json.loads(f.read_text(encoding="utf-8"))
                pid = (data.get("id") or "").strip()
                if not pid:
                    skipped += 1
                    continue

                exists = session.execute(
                    select(main.LibraryItem.id).where(main.LibraryItem.id == pid)
                ).first()
                if exists:
                    skipped += 1
                    continue

                item = main.LibraryItem(
                    id=pid,
                    title=data.get("title", ""),
                    prompt=data.get("prompt", ""),
                    category=data.get("category", "general") or "general",
                    tags=data.get("tags") or [],
                    uses=int(data.get("uses", 0) or 0),
                )

                # created_at is optional; if missing, DB default will apply
                created_at = data.get("created_at")
                if created_at:
                    try:
                        from datetime import datetime

                        item.created_at = datetime.fromisoformat(created_at)
                    except Exception:
                        pass

                session.add(item)
                inserted += 1
            except Exception:
                failed += 1

        session.commit()

    print(f"Migrated: inserted={inserted}, skipped={skipped}, failed={failed}")


if __name__ == "__main__":
    run()
