/* Reusable Context Profiles (spec §20–21). Each profile is a name plus
   labelled fields; Promptogen uses the relevant ones when generating.
   Hand-off point: load and save profiles through the profiles API. */
export const SEED_PROFILES = [
  {
    id: "my-company",
    name: "My Company",
    fields: [
      { label: "Company Name", value: "Example Technologies" },
      { label: "Industry", value: "SaaS" },
      { label: "Target Audience", value: "Small businesses" },
      { label: "Brand Tone", value: "Professional and approachable" },
      { label: "Market", value: "India" },
      { label: "Preferred Output", value: "Structured and actionable" },
    ],
  },
  {
    id: "dev-project",
    name: "My Development Project",
    fields: [
      { label: "Project", value: "Promptogen API" },
      { label: "Language", value: "Python 3.11" },
      { label: "Framework", value: "FastAPI" },
      { label: "Database", value: "PostgreSQL" },
      { label: "Coding Standards", value: "Type hints, black, pytest" },
    ],
  },
  {
    id: "personal",
    name: "My Personal Preferences",
    fields: [
      { label: "Preferred Output", value: "Short explanations with examples" },
      { label: "Brand Tone", value: "Friendly" },
      { label: "Language", value: "English" },
    ],
  },
];

/* Field labels offered when adding a field to a profile. */
export const FIELD_SUGGESTIONS = [
  "Company Name",
  "Industry",
  "Product",
  "Target Audience",
  "Brand Tone",
  "Market",
  "Budget",
  "Preferred Output",
  "Language",
  "Framework",
  "Database",
  "Coding Standards",
  "Client",
  "Notes",
];

/* Field used for tone conflict detection (spec §22). */
export const TONE_FIELD = "Brand Tone";

export const profileValue = (profile, label) =>
  profile?.fields.find((field) => field.label.toLowerCase() === label.toLowerCase())?.value ?? "";
