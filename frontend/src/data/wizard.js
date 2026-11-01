import {
  Lightbulb,
  ListOrdered,
  PenTool,
  Code2,
  LayoutGrid,
  Briefcase,
  GraduationCap,
  Megaphone,
  Cpu,
  Smile,
  Scale,
  Sparkles,
} from "lucide-react";

/* ---------------------------------------------------------------
   The whole modal is data-driven: every step is a list of fields and
   the renderer only knows three primitives — textarea, cards, select.
   Adding a question is a config change, not a component change.
----------------------------------------------------------------*/
export const WIZARD = [
  {
    id: "goal",
    label: "Goal",
    fields: [
      {
        name: "goal",
        type: "textarea",
        title: "What is the main goal of this prompt?",
        hint: "What do you want the AI to do?",
        placeholder: "e.g., Create a marketing strategy for launching a new product",
        maxLength: 200,
        required: true,
      },
      {
        name: "outputTypes",
        type: "cards",
        multiple: true,
        title: "What type of output do you expect?",
        hint: "Select all that apply.",
        required: true,
        options: [
          { id: "analysis", label: "Analysis / Insight", icon: Lightbulb, tone: "text-purple" },
          { id: "guide", label: "Step-by-step Guide", icon: ListOrdered, tone: "text-brand" },
          { id: "creative", label: "Creative Content", icon: PenTool, tone: "text-pink" },
          { id: "technical", label: "Code / Technical", icon: Code2, tone: "text-good" },
          { id: "other", label: "Other", icon: LayoutGrid, tone: "text-amber" },
        ],
      },
      {
        name: "audience",
        type: "select",
        title: "Who is the target audience?",
        hint: "Who will use or benefit from this output?",
        placeholder: "e.g., Business owners, Developers, Students...",
        required: true,
        options: [
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
    id: "context",
    label: "Context",
    fields: [
      {
        name: "background",
        type: "textarea",
        title: "What background should the AI know?",
        hint: "Product, company, situation — anything that shapes the answer.",
        placeholder: "e.g., A B2B SaaS tool for schools, launching in India next quarter",
        maxLength: 300,
        required: true,
      },
      {
        name: "domain",
        type: "select",
        title: "Which domain does this belong to?",
        hint: "Helps the AI pick the right vocabulary.",
        placeholder: "Select a domain...",
        options: [
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
        name: "priorAttempts",
        type: "textarea",
        title: "What has not worked before?",
        hint: "Optional — helps the AI avoid repeating weak output.",
        placeholder: "e.g., Generic answers with no concrete numbers",
        maxLength: 200,
      },
    ],
  },
  {
    id: "requirements",
    label: "Requirements",
    fields: [
      {
        name: "mustInclude",
        type: "textarea",
        title: "What must the output include?",
        hint: "List the non-negotiables.",
        placeholder: "e.g., A 30-day timeline, budget split, and 3 KPIs",
        maxLength: 300,
        required: true,
      },
      {
        name: "length",
        type: "select",
        title: "How long should the output be?",
        hint: "Sets the depth the AI aims for.",
        placeholder: "Select a length...",
        options: ["Short (a few lines)", "Medium (2-4 paragraphs)", "Long (detailed document)"],
      },
      {
        name: "format",
        type: "cards",
        multiple: false,
        title: "Preferred structure?",
        hint: "Pick one.",
        options: [
          { id: "bullets", label: "Bulleted List", icon: ListOrdered, tone: "text-brand" },
          { id: "sections", label: "Titled Sections", icon: LayoutGrid, tone: "text-purple" },
          { id: "table", label: "Table / Matrix", icon: Scale, tone: "text-cyan" },
          { id: "prose", label: "Flowing Prose", icon: PenTool, tone: "text-pink" },
        ],
      },
    ],
  },
  {
    id: "preferences",
    label: "Preferences",
    fields: [
      {
        name: "tone",
        type: "cards",
        multiple: false,
        title: "What tone should it use?",
        hint: "Pick one.",
        required: true,
        options: [
          { id: "professional", label: "Professional", icon: Briefcase, tone: "text-brand" },
          { id: "friendly", label: "Friendly", icon: Smile, tone: "text-amber" },
          { id: "academic", label: "Academic", icon: GraduationCap, tone: "text-purple" },
          { id: "persuasive", label: "Persuasive", icon: Megaphone, tone: "text-pink" },
          { id: "technical", label: "Technical", icon: Cpu, tone: "text-good" },
        ],
      },
      {
        name: "model",
        type: "select",
        title: "Which AI model will you use?",
        hint: "The prompt is tuned to the model's strengths.",
        placeholder: "Select a model...",
        options: ["Claude", "GPT", "Gemini", "Llama", "Not sure yet"],
      },
      {
        name: "notes",
        type: "textarea",
        title: "Anything else we should add?",
        hint: "Optional final instructions.",
        placeholder: "e.g., Always end with a short summary",
        maxLength: 200,
      },
    ],
  },
];

export const STEP_ICON = Sparkles;
