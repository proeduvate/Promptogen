"""Schemas for application content, UI metadata, and wizard configuration."""

from typing import Any, List, Optional
from pydantic import BaseModel, Field


class ExampleChip(BaseModel):
    id: str
    label: str
    icon: str
    tone: str
    seed: str


class FeatureCard(BaseModel):
    id: str
    title: str
    body: str
    icon: str
    tone: str
    tint: str


class MetricScore(BaseModel):
    id: str
    label: str
    value: int


class StrengthOverview(BaseModel):
    score: int
    label: str
    note: str
    metrics: List[MetricScore]


class UserProfile(BaseModel):
    name: str
    role: str
    initial: str


class OutputTypeOption(BaseModel):
    id: str
    label: str
    icon: str
    tone: str


class ContentMetaResponse(BaseModel):
    app_title: str
    example_chips: List[ExampleChip]
    feature_cards: List[FeatureCard]
    benefits: List[str]
    strength: StrengthOverview
    output_types: List[OutputTypeOption]
    user: UserProfile


class WizardOption(BaseModel):
    id: Optional[str] = None
    label: str
    icon: Optional[str] = None
    tone: Optional[str] = None


class WizardField(BaseModel):
    name: str
    type: str  # textarea | cards | select
    title: str
    hint: Optional[str] = None
    placeholder: Optional[str] = None
    maxLength: Optional[int] = None
    required: bool = False
    multiple: bool = False
    options: Optional[List[Any]] = None


class WizardStep(BaseModel):
    id: str
    label: str
    fields: List[WizardField]


class WizardSchemaResponse(BaseModel):
    steps: List[WizardStep]
