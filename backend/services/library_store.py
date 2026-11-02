"""Service layer for Prompt Library with PostgreSQL persistence."""

import copy
import datetime
import uuid
from typing import Any, Dict, List, Optional

from core.database import database

_INITIAL_FOLDERS = [
    {"id": "all", "label": "All Prompts", "count": 6, "icon": "LayoutGrid", "tone": "text-brand"},
    {"id": "marketing", "label": "Marketing", "count": 3, "icon": "Megaphone", "tone": "text-pink"},
    {"id": "product", "label": "Product", "count": 0, "icon": "Package", "tone": "text-amber"},
    {"id": "development", "label": "Development", "count": 1, "icon": "Code2", "tone": "text-good"},
    {"id": "content", "label": "Content Writing", "count": 1, "icon": "PenLine", "tone": "text-purple"},
    {"id": "research", "label": "Research", "count": 1, "icon": "FlaskConical", "tone": "text-cyan"},
    {"id": "personal", "label": "Personal", "count": 0, "icon": "User", "tone": "text-brand"},
    {"id": "archived", "label": "Archived", "count": 0, "icon": "Archive", "tone": "text-muted"},
]

_INITIAL_FILTERS = [
    {
        "id": "model",
        "label": "Model",
        "options": [
            {"value": "all", "label": "All Models"},
            {"value": "GPT-4o", "label": "GPT-4o"},
            {"value": "Claude 3.5", "label": "Claude 3.5"},
        ],
    },
    {
        "id": "tag",
        "label": "Tags",
        "options": [
            {"value": "all", "label": "All Tags"},
            {"value": "Marketing", "label": "Marketing"},
            {"value": "Strategy", "label": "Strategy"},
            {"value": "Content", "label": "Content"},
            {"value": "Development", "label": "Development"},
            {"value": "Email", "label": "Email"},
            {"value": "Business", "label": "Business"},
        ],
    },
    {
        "id": "createdBy",
        "label": "Created By",
        "options": [
            {"value": "all", "label": "Anyone"},
            {"value": "you", "label": "You"},
            {"value": "team", "label": "Teammates"},
        ],
    },
    {
        "id": "date",
        "label": "Date",
        "options": [
            {"value": "all", "label": "Anytime"},
            {"value": "today", "label": "Today"},
            {"value": "week", "label": "Last 7 days"},
            {"value": "month", "label": "Last 30 days"},
        ],
    },
]

DEMO_USER_ID = "00000000-0000-0000-0000-000000000001"
DEMO2_USER_ID = "00000000-0000-0000-0000-000000000002"

_INITIAL_PROMPTS = [
    {
        "id": "saas-marketing",
        "user_id": DEMO_USER_ID,
        "title": "Marketing strategy for SaaS product",
        "createdBy": "you",
        "date": "2025-05-26",
        "created": "May 26, 2025",
        "model": "GPT-4o",
        "folder": "marketing",
        "tags": ["Marketing", "Strategy", "SaaS"],
        "moreTags": 2,
        "score": 80,
        "favorite": True,
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
    },
    {
        "id": "launch-emails",
        "user_id": DEMO_USER_ID,
        "title": "Product launch email sequence",
        "createdBy": "you",
        "date": "2025-05-25",
        "created": "May 25, 2025",
        "model": "GPT-4o",
        "folder": "marketing",
        "tags": ["Marketing", "Email", "Launch"],
        "score": 90,
        "favorite": False,
        "currentVersion": "v3",
        "versions": [
            {
                "id": "v3",
                "date": "May 25, 2025 03:20 PM",
                "metrics": {"score": 90, "words": 1245, "clarity": 95, "specificity": 90, "actionability": 92},
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
            },
        ],
    },
    {
        "id": "code-review",
        "user_id": DEMO_USER_ID,
        "title": "Code review best practices guide",
        "createdBy": "you",
        "date": "2025-05-25",
        "created": "May 25, 2025",
        "model": "Claude 3.5",
        "folder": "development",
        "tags": ["Development", "Code", "Guide"],
        "moreTags": 1,
        "score": 72,
        "favorite": False,
    },
    {
        "id": "ai-healthcare-blog",
        "user_id": DEMO_USER_ID,
        "title": "Blog on AI in healthcare",
        "createdBy": "you",
        "date": "2025-05-25",
        "created": "May 25, 2025",
        "model": "Claude 3.5",
        "folder": "content",
        "tags": ["Content", "Blog", "AI", "Healthcare"],
        "score": 65,
        "favorite": False,
    },
    {
        "id": "social-calendar",
        "user_id": DEMO_USER_ID,
        "title": "Social media content calendar",
        "createdBy": "you",
        "date": "2025-05-24",
        "created": "May 24, 2025",
        "model": "GPT-4o",
        "folder": "marketing",
        "tags": ["Marketing", "Social Media", "Content"],
        "score": 78,
        "favorite": False,
    },
    {
        "id": "competitor-analysis",
        "user_id": DEMO_USER_ID,
        "title": "Competitor analysis framework",
        "createdBy": "you",
        "date": "2025-05-24",
        "created": "May 24, 2025",
        "model": "GPT-4o",
        "folder": "research",
        "tags": ["Strategy", "Business", "Analysis"],
        "score": 83,
        "favorite": False,
    },
]


class LibraryStore:
    def __init__(self) -> None:
        self._prompts: List[Dict[str, Any]] = copy.deepcopy(_INITIAL_PROMPTS)
        self._folders: List[Dict[str, Any]] = copy.deepcopy(_INITIAL_FOLDERS)
        self._filters: List[Dict[str, Any]] = copy.deepcopy(_INITIAL_FILTERS)

    async def get_folders(self, user_id: Optional[str] = None) -> List[Dict[str, Any]]:
        if not user_id:
            return []

        # Filter prompts belonging to this user
        user_prompts = [p for p in self._prompts if p.get("user_id") in (user_id, DEMO_USER_ID, DEMO2_USER_ID)]
        counts: Dict[str, int] = {"all": len(user_prompts)}
        for p in user_prompts:
            folder = p.get("folder", "marketing")
            counts[folder] = counts.get(folder, 0) + 1

        updated = []
        for f in self._folders:
            item = dict(f)
            item["count"] = counts.get(f["id"], 0)
            updated.append(item)
        return updated

    async def get_filters(self, user_id: Optional[str] = None) -> List[Dict[str, Any]]:
        if not user_id:
            return []
        return self._filters

    async def list_prompts(
        self,
        user_id: Optional[str] = None,
        tab: str = "all",
        folder: str = "all",
        model: str = "all",
        tag: str = "all",
        created_by: str = "all",
        search: str = "",
        page: int = 1,
        page_size: int = 10,
    ) -> Dict[str, Any]:
        # Unauthenticated / guest -> Return null / empty prompt list
        if not user_id:
            return {
                "total": 0,
                "page": page,
                "page_size": page_size,
                "prompts": [],
            }

        # Filter prompts belonging to user
        needle = search.strip().lower()
        filtered = []
        for p in self._prompts:
            p_user = p.get("user_id")
            if p_user and p_user not in (user_id, DEMO_USER_ID, DEMO2_USER_ID):
                continue

            if tab == "favorites" and not p.get("favorite"):
                continue
            if tab == "trash" and not p.get("archived"):
                continue
            if tab != "trash" and p.get("archived"):
                continue

            if folder != "all" and p.get("folder") != folder:
                continue

            if model != "all" and p.get("model") != model:
                continue

            if tag != "all" and tag not in p.get("tags", []):
                continue

            if created_by != "all" and p.get("createdBy") != created_by:
                continue

            if needle:
                title = p.get("title", "").lower()
                desc = p.get("description", "").lower()
                tags_str = " ".join(p.get("tags", [])).lower()
                if needle not in title and needle not in desc and needle not in tags_str:
                    continue

            filtered.append(p)

        total = len(filtered)
        start = (page - 1) * page_size
        end = start + page_size
        page_prompts = filtered[start:end]

        return {
            "total": total,
            "page": page,
            "page_size": page_size,
            "prompts": page_prompts,
        }

    async def get_prompt(self, prompt_id: str, user_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
        if database.enabled:
            try:
                p = await database.get_saved_prompt(prompt_id)
                if p:
                    return p
            except Exception:
                pass

        for p in self._prompts:
            if p["id"] == prompt_id:
                return copy.deepcopy(p)
        return None

    async def save_prompt(self, data: Dict[str, Any], user_id: Optional[str] = None) -> Dict[str, Any]:
        if database.enabled:
            try:
                return await database.save_saved_prompt(data)
            except Exception:
                pass

        prompt_id = data.get("id") or str(uuid.uuid4())[:8]
        now = datetime.datetime.now()
        date_str = now.strftime("%Y-%m-%d")
        created_str = now.strftime("%b %d, %Y")

        new_prompt = {
            "id": prompt_id,
            "user_id": user_id or DEMO_USER_ID,
            "title": data.get("title", "Untitled Prompt"),
            "createdBy": "you",
            "date": date_str,
            "created": created_str,
            "model": data.get("model", "GPT-4o"),
            "folder": data.get("folder", "marketing"),
            "tags": data.get("tags", ["AI", "Custom"]),
            "moreTags": 0,
            "score": data.get("score", 85),
            "favorite": False,
            "sections": data.get("sections") or [],
        }

        for idx, existing in enumerate(self._prompts):
            if existing["id"] == prompt_id:
                self._prompts[idx] = new_prompt
                return new_prompt

        self._prompts.insert(0, new_prompt)
        return new_prompt

    async def toggle_favorite(self, prompt_id: str) -> Optional[bool]:
        if database.enabled:
            try:
                res = await database.toggle_saved_prompt_favorite(prompt_id)
                if res is not None:
                    return res
            except Exception:
                pass

        for p in self._prompts:
            if p["id"] == prompt_id:
                p["favorite"] = not p.get("favorite", False)
                return p["favorite"]
        return None

    async def delete_prompt(self, prompt_id: str) -> bool:
        if database.enabled:
            try:
                return await database.delete_saved_prompt(prompt_id)
            except Exception:
                pass

        for idx, p in enumerate(self._prompts):
            if p["id"] == prompt_id:
                self._prompts.pop(idx)
                return True
        return False


library_store = LibraryStore()
