"""API endpoints for static UI content, metadata, and wizard schema."""

from fastapi import APIRouter, status
from schemas.content import (
    ContentMetaResponse,
    WizardSchemaResponse,
)

router = APIRouter(prefix="/api/v1/content", tags=["Content & Metadata"])

_DEFAULT_EXAMPLE_CHIPS = [
    {
        "id": "marketing",
        "label": "Marketing Campaign",
        "icon": "FileText",
        "tone": "text-brand",
        "seed": "Write a prompt for an AI to create a full marketing campaign for a new product launch.",
    },
    {
        "id": "code",
        "label": "Code Generator",
        "icon": "Code2",
        "tone": "text-cyan",
        "seed": "Write a prompt for an AI to generate production-ready code from a feature description.",
    },
    {
        "id": "blog",
        "label": "Blog Writer",
        "icon": "PenLine",
        "tone": "text-purple",
        "seed": "Write a prompt for an AI to draft a long-form blog post with an SEO-friendly structure.",
    },
    {
        "id": "product",
        "label": "Product Description",
        "icon": "Package",
        "tone": "text-amber",
        "seed": "Write a prompt for an AI to write persuasive e-commerce product descriptions.",
    },
    {
        "id": "lesson",
        "label": "Lesson Plan",
        "icon": "GraduationCap",
        "tone": "text-good",
        "seed": "Write a prompt for an AI to build a lesson plan with objectives, activities and assessment.",
    },
]

_DEFAULT_FEATURE_CARDS = [
    {
        "id": "smart-questions",
        "title": "Smart Questions",
        "body": "Our AI asks the right questions to understand your needs.",
        "icon": "Compass",
        "tone": "text-purple",
        "tint": "bg-purple/10 ring-purple/20",
    },
    {
        "id": "structured",
        "title": "Structured Prompts",
        "body": "Get expertly crafted prompts ready to use anywhere.",
        "icon": "FileText",
        "tone": "text-brand",
        "tint": "bg-brand/10 ring-brand/20",
    },
    {
        "id": "analytics",
        "title": "Prompt Analytics",
        "body": "Evaluate the strength and clarity of your prompts.",
        "icon": "TrendingUp",
        "tone": "text-good",
        "tint": "bg-good/10 ring-good/20",
    },
    {
        "id": "organize",
        "title": "Save & Organize",
        "body": "Store, manage and reuse your best prompts.",
        "icon": "Folder",
        "tone": "text-amber",
        "tint": "bg-amber/10 ring-amber/20",
    },
]

_DEFAULT_STRENGTH = {
    "score": 85,
    "label": "Strong",
    "note": "Your last prompt is strong!",
    "metrics": [
        {"id": "clarity", "label": "Clarity", "value": 90},
        {"id": "specificity", "label": "Specificity", "value": 85},
        {"id": "context", "label": "Context", "value": 80},
        {"id": "structure", "label": "Structure", "value": 85},
        {"id": "actionability", "label": "Actionability", "value": 90},
    ],
}

_DEFAULT_BENEFITS = [
    "Saves time and boosts productivity",
    "Improves AI output quality",
    "Perfect for all AI models",
    "Built for creators, developers, marketers and more",
]

_DEFAULT_OUTPUT_TYPES = [
    {"id": "analysis", "label": "Analysis / Insight", "icon": "Lightbulb", "tone": "text-purple"},
    {"id": "guide", "label": "Step-by-step Guide", "icon": "ListOrdered", "tone": "text-brand"},
    {"id": "creative", "label": "Creative Content", "icon": "PenTool", "tone": "text-pink"},
    {"id": "technical", "label": "Code / Technical", "icon": "Code2", "tone": "text-good"},
    {"id": "other", "label": "Other", "icon": "LayoutGrid", "tone": "text-amber"},
]

_DEFAULT_USER = {
    "name": "Dhanush C",
    "role": "COO · ProEduvate",
    "initial": "D",
}

_DEFAULT_WIZARD_STEPS = [
    {
        "id": "goal",
        "label": "Goal",
        "fields": [
            {
                "name": "goal",
                "type": "textarea",
                "title": "What is the main goal of this prompt?",
                "hint": "What do you want the AI to do?",
                "placeholder": "e.g., Create a marketing strategy for launching a new product",
                "maxLength": 200,
                "required": True,
            },
            {
                "name": "outputTypes",
                "type": "cards",
                "multiple": True,
                "title": "What type of output do you expect?",
                "hint": "Select all that apply.",
                "required": True,
                "options": _DEFAULT_OUTPUT_TYPES,
            },
            {
                "name": "audience",
                "type": "select",
                "title": "Who is the target audience?",
                "hint": "Who will use or benefit from this output?",
                "placeholder": "e.g., Business owners, Developers, Students...",
                "required": True,
                "options": [
                    "Business owners",
                    "Developers",
                    "Students",
                    "Marketers",
                    "Educators",
                    "General audience",
                ],
            },
        ],
    },
    {
        "id": "context",
        "label": "Context",
        "fields": [
            {
                "name": "background",
                "type": "textarea",
                "title": "What background should the AI know?",
                "hint": "Product, company, situation — anything that shapes the answer.",
                "placeholder": "e.g., A B2B SaaS tool for schools, launching in India next quarter",
                "maxLength": 300,
                "required": True,
            },
            {
                "name": "domain",
                "type": "select",
                "title": "Which domain does this belong to?",
                "hint": "Helps the AI pick the right vocabulary.",
                "placeholder": "Select a domain...",
                "options": [
                    "Marketing",
                    "Software & Engineering",
                    "Education",
                    "Finance",
                    "Healthcare",
                    "Design",
                    "Other",
                ],
            },
            {
                "name": "priorAttempts",
                "type": "textarea",
                "title": "What has not worked before?",
                "hint": "Optional — helps the AI avoid repeating weak output.",
                "placeholder": "e.g., Generic answers with no concrete numbers",
                "maxLength": 200,
            },
        ],
    },
    {
        "id": "requirements",
        "label": "Requirements",
        "fields": [
            {
                "name": "mustInclude",
                "type": "textarea",
                "title": "What must the output include?",
                "hint": "List the non-negotiables.",
                "placeholder": "e.g., A 30-day timeline, budget split, and 3 KPIs",
                "maxLength": 300,
                "required": True,
            },
            {
                "name": "length",
                "type": "select",
                "title": "How long should the output be?",
                "hint": "Sets the depth the AI aims for.",
                "placeholder": "Select a length...",
                "options": ["Short (a few lines)", "Medium (2-4 paragraphs)", "Long (detailed document)"],
            },
            {
                "name": "format",
                "type": "cards",
                "multiple": False,
                "title": "Preferred structure?",
                "hint": "Pick one.",
                "options": [
                    {"id": "bullets", "label": "Bulleted List", "icon": "ListOrdered", "tone": "text-brand"},
                    {"id": "sections", "label": "Titled Sections", "icon": "LayoutGrid", "tone": "text-purple"},
                    {"id": "table", "label": "Table / Matrix", "icon": "Scale", "tone": "text-cyan"},
                    {"id": "prose", "label": "Flowing Prose", "icon": "PenTool", "tone": "text-pink"},
                ],
            },
        ],
    },
    {
        "id": "preferences",
        "label": "Preferences",
        "fields": [
            {
                "name": "tone",
                "type": "cards",
                "multiple": False,
                "title": "What tone should it use?",
                "hint": "Pick one.",
                "required": True,
                "options": [
                    {"id": "professional", "label": "Professional", "icon": "Briefcase", "tone": "text-brand"},
                    {"id": "friendly", "label": "Friendly", "icon": "Smile", "tone": "text-amber"},
                    {"id": "academic", "label": "Academic", "icon": "GraduationCap", "tone": "text-purple"},
                    {"id": "persuasive", "label": "Persuasive", "icon": "Megaphone", "tone": "text-pink"},
                    {"id": "technical", "label": "Technical", "icon": "Cpu", "tone": "text-good"},
                ],
            },
            {
                "name": "model",
                "type": "select",
                "title": "Which AI model will you use?",
                "hint": "The prompt is tuned to the model's strengths.",
                "placeholder": "Select a model...",
                "options": ["Claude", "GPT", "Gemini", "Llama", "Not sure yet"],
            },
            {
                "name": "notes",
                "type": "textarea",
                "title": "Anything else we should add?",
                "hint": "Optional final instructions.",
                "placeholder": "e.g., Always end with a short summary",
                "maxLength": 200,
            },
        ],
    },
]


@router.get(
    "/meta",
    response_model=ContentMetaResponse,
    status_code=status.HTTP_200_OK,
    summary="Get UI metadata and overview content",
)
async def get_content_meta() -> ContentMetaResponse:
    return ContentMetaResponse(
        app_title="Promptogen",
        example_chips=_DEFAULT_EXAMPLE_CHIPS,
        feature_cards=_DEFAULT_FEATURE_CARDS,
        benefits=_DEFAULT_BENEFITS,
        strength=_DEFAULT_STRENGTH,
        output_types=_DEFAULT_OUTPUT_TYPES,
        user=_DEFAULT_USER,
    )


@router.get(
    "/wizard-schema",
    response_model=WizardSchemaResponse,
    status_code=status.HTTP_200_OK,
    summary="Get schema and fields for the prompt creation wizard",
)
async def get_wizard_schema() -> WizardSchemaResponse:
    return WizardSchemaResponse(steps=_DEFAULT_WIZARD_STEPS)
