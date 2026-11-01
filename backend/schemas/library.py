"""Pydantic schemas for the Prompt Library and folder management."""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class PromptSectionItem(BaseModel):
    key: Optional[str] = None
    text: str


class PromptSection(BaseModel):
    id: str
    label: str
    type: str  # text | list | numbered
    content: Optional[str] = None
    items: Optional[List[Any]] = None


class PromptMetrics(BaseModel):
    score: int
    words: Optional[int] = None
    clarity: int
    specificity: int
    actionability: int


class PromptVersion(BaseModel):
    id: str
    date: str
    metrics: Optional[Dict[str, Any]] = None
    sections: List[PromptSection]


class PromptItem(BaseModel):
    id: str
    title: str
    createdBy: str = "you"
    date: str
    created: str
    model: str
    folder: str
    tags: List[str] = []
    moreTags: int = 0
    score: int = 80
    favorite: bool = False
    currentVersion: Optional[str] = None
    versions: Optional[List[PromptVersion]] = None
    sections: Optional[List[PromptSection]] = None


class FolderItem(BaseModel):
    id: str
    label: str
    count: int
    icon: str
    tone: str


class FilterOption(BaseModel):
    value: str
    label: str


class FilterGroup(BaseModel):
    id: str
    label: str
    options: List[FilterOption]


class PromptListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    prompts: List[PromptItem]


class PromptCreateRequest(BaseModel):
    title: str = Field(..., min_length=1)
    model: str = "GPT-4o"
    folder: str = "marketing"
    tags: List[str] = []
    score: int = 85
    sections: Optional[List[PromptSection]] = None
    prompt_text: Optional[str] = None


class ToggleFavoriteResponse(BaseModel):
    id: str
    favorite: bool
