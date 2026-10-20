/* ---------------------------------------------------------------
   Adaptive question bank (spec §4, §52). Questions depend on the task
   domain detected from the idea, carry an importance level, and can
   appear only after certain answers (`showIf`). Field types:
   text, textarea, number, select, single, multi, yesno, slider, date,
   daterange, url, file.
   `context` is the label used when the answer goes into the prompt's
   CONTEXT section; `short` names it in the missing-details list.
   Hand-off point: the questioning service will generate these per request.
----------------------------------------------------------------*/

const goal = {
  name: "goal",
  type: "textarea",
  importance: "required",
  title: "What do you want the AI to do?",
  hint: "Your idea, in your own words. Add anything we should know.",
  maxLength: 400,
};

const outputFormat = {
  name: "outputFormat",
  type: "single",
  importance: "recommended",
  title: "What output format would you prefer?",
  short: "Output format",
  options: [
    { value: "structured", label: "Structured sections" },
    { value: "bullets", label: "Bulleted list" },
    { value: "table", label: "Table" },
    { value: "steps", label: "Step-by-step" },
    { value: "prose", label: "Flowing prose" },
  ],
};

const tone = {
  name: "tone",
  type: "single",
  importance: "recommended",
  title: "What tone should it use?",
  short: "Tone",
  options: [
    { value: "professional", label: "Professional" },
    { value: "friendly", label: "Friendly" },
    { value: "casual", label: "Casual" },
    { value: "academic", label: "Academic" },
    { value: "persuasive", label: "Persuasive" },
    { value: "technical", label: "Technical" },
  ],
};

const detail = {
  name: "detail",
  type: "slider",
  importance: "optional",
  title: "How detailed should the result be?",
  short: "Detail level",
  min: 1,
  max: 3,
  labels: ["Concise", "Balanced", "Detailed"],
};

const examples = {
  name: "examples",
  type: "yesno",
  importance: "optional",
  title: "Should the AI include examples?",
  short: "Examples",
};

const COMMON_TAIL = [outputFormat, tone, detail, examples];

export const QUESTION_BANK = {
  marketing: [
    goal,
    { name: "productName", type: "text", importance: "required", title: "What is the name of your product?", context: "Product", short: "Product name", placeholder: "e.g., FocusFlow" },
    { name: "audience", type: "text", importance: "required", title: "Who is your target audience?", context: "Target Audience", short: "Target audience", placeholder: "e.g., Remote professionals and freelancers" },
    {
      name: "objective",
      type: "multi",
      importance: "required",
      title: "What is your primary objective?",
      context: "Objective",
      short: "Objective",
      options: ["Brand Awareness", "Lead Generation", "Sales", "App Downloads", "Customer Retention"].map((label) => ({ value: label, label })),
    },
    { name: "problem", type: "textarea", importance: "recommended", title: "What problem does the product solve?", context: "Problem Solved", short: "Problem solved", maxLength: 300 },
    { name: "budget", type: "text", importance: "recommended", title: "What is your marketing budget?", context: "Budget", short: "Budget", placeholder: "e.g., ₹1,00,000 per month" },
    { name: "market", type: "text", importance: "recommended", title: "Which geographic market are you targeting?", context: "Market", short: "Geographic market", placeholder: "e.g., India" },
    {
      name: "channels",
      type: "multi",
      importance: "recommended",
      title: "Which channels should be considered?",
      context: "Channels",
      short: "Marketing channels",
      options: ["Instagram", "LinkedIn", "Google Ads", "SEO", "Email", "YouTube", "Other"].map((label) => ({ value: label, label })),
    },
    {
      name: "channelsOther",
      type: "text",
      importance: "optional",
      title: "Which other channels?",
      context: "Other Channels",
      placeholder: "e.g., Podcasts, WhatsApp communities",
      showIf: (answers) => answers.channels?.includes("Other"),
    },
    {
      name: "timeline",
      type: "select",
      importance: "recommended",
      title: "What timeline should the strategy cover?",
      context: "Timeline",
      short: "Timeline",
      options: ["1 month", "3 months", "6 months", "12 months"].map((label) => ({ value: label, label })),
    },
    { name: "startDate", type: "date", importance: "optional", title: "When does the campaign start?", context: "Start Date", short: "Start date" },
    { name: "competitors", type: "textarea", importance: "optional", title: "Who are your main competitors?", context: "Competitors", short: "Competitors", maxLength: 200 },
    ...COMMON_TAIL,
  ],

  development: [
    goal,
    {
      name: "devTask",
      type: "single",
      importance: "required",
      title: "What kind of help do you need?",
      context: "Task Type",
      options: ["New feature", "Fix a bug", "Code review", "Refactor", "Write tests", "Explain code"].map((label) => ({ value: label, label })),
    },
    {
      name: "language",
      type: "select",
      importance: "required",
      title: "Which programming language?",
      context: "Language",
      short: "Programming language",
      options: ["Python", "JavaScript", "TypeScript", "Java", "Go", "Rust", "C#", "PHP", "Other"].map((label) => ({ value: label, label })),
    },
    { name: "framework", type: "text", importance: "recommended", title: "Which framework and version?", context: "Framework", short: "Framework", placeholder: "e.g., FastAPI 0.110" },
    {
      name: "errorMessage",
      type: "textarea",
      importance: "required",
      title: "What error message do you see?",
      context: "Error Message",
      short: "Error message",
      maxLength: 400,
      showIf: (answers) => answers.devTask === "Fix a bug",
    },
    {
      name: "expected",
      type: "textarea",
      importance: "required",
      title: "What is the expected behavior?",
      context: "Expected Behavior",
      short: "Expected behavior",
      maxLength: 300,
      showIf: (answers) => answers.devTask === "Fix a bug",
    },
    { name: "implementation", type: "textarea", importance: "recommended", title: "Describe the current implementation", hint: "Or paste the relevant code.", context: "Current Implementation", short: "Current implementation", maxLength: 600 },
    {
      name: "database",
      type: "select",
      importance: "optional",
      title: "Which database is involved?",
      context: "Database",
      short: "Database",
      options: ["PostgreSQL", "MySQL", "MongoDB", "SQLite", "Redis", "None"].map((label) => ({ value: label, label })),
    },
    { name: "tests", type: "yesno", importance: "recommended", title: "Should the answer include tests?", short: "Testing" },
    {
      name: "qualities",
      type: "multi",
      importance: "optional",
      title: "Anything else to prioritise?",
      context: "Priorities",
      options: ["Performance", "Security", "Error handling", "Readability", "Backward compatibility"].map((label) => ({ value: label, label })),
    },
    { name: "repoUrl", type: "url", importance: "optional", title: "Link to the repository or docs", context: "Reference", placeholder: "https://github.com/…" },
    ...COMMON_TAIL,
  ],

  business: [
    goal,
    { name: "company", type: "text", importance: "required", title: "Which company or team is this for?", context: "Company", short: "Company", placeholder: "e.g., Example Technologies" },
    {
      name: "deliverable",
      type: "single",
      importance: "required",
      title: "What should the deliverable be?",
      context: "Deliverable",
      short: "Deliverable",
      options: ["Report", "Plan", "Presentation", "Proposal", "Memo", "Email"].map((label) => ({ value: label, label })),
    },
    { name: "industry", type: "text", importance: "recommended", title: "Which industry?", context: "Industry", short: "Industry", placeholder: "e.g., SaaS" },
    {
      name: "stakeholders",
      type: "multi",
      importance: "recommended",
      title: "Who are the stakeholders?",
      context: "Stakeholders",
      short: "Stakeholders",
      options: ["Leadership", "Investors", "Customers", "Team", "Partners"].map((label) => ({ value: label, label })),
    },
    { name: "constraints", type: "textarea", importance: "recommended", title: "Any constraints to respect?", context: "Constraints", short: "Constraints", maxLength: 300 },
    { name: "period", type: "daterange", importance: "optional", title: "Which period should it cover?", context: "Period", short: "Time period" },
    { name: "dataFile", type: "file", importance: "optional", title: "Any supporting data?", context: "Supporting Data", short: "Supporting data" },
    ...COMMON_TAIL,
  ],

  data: [
    goal,
    { name: "dataDescription", type: "textarea", importance: "required", title: "What data do you have?", hint: "Columns, size and where it comes from.", context: "Data", short: "Data description", maxLength: 300 },
    { name: "question", type: "textarea", importance: "required", title: "What do you want to learn from it?", context: "Analysis Question", short: "Analysis question", maxLength: 300 },
    { name: "dataFile", type: "file", importance: "recommended", title: "Attach a sample of the data", context: "Sample File", short: "Data sample" },
    { name: "metrics", type: "text", importance: "recommended", title: "Which metrics matter most?", context: "Key Metrics", short: "Key metrics", placeholder: "e.g., Revenue, churn, conversion rate" },
    { name: "period", type: "daterange", importance: "optional", title: "Which period should it cover?", context: "Period", short: "Time period" },
    { name: "audience", type: "text", importance: "optional", title: "Who will read the analysis?", context: "Audience", short: "Audience" },
    ...COMMON_TAIL,
  ],

  education: [
    goal,
    { name: "topic", type: "text", importance: "required", title: "What topic should it cover?", context: "Topic", short: "Topic", placeholder: "e.g., Python for data analysis" },
    {
      name: "level",
      type: "single",
      importance: "required",
      title: "What is the learner's current level?",
      context: "Level",
      short: "Learner level",
      options: ["Beginner", "Intermediate", "Advanced"].map((label) => ({ value: label, label })),
    },
    { name: "weeks", type: "number", importance: "recommended", title: "Over how many weeks?", context: "Duration (weeks)", short: "Duration", min: 1, max: 52 },
    { name: "hours", type: "slider", importance: "recommended", title: "Hours available per week", context: "Hours per Week", short: "Weekly hours", min: 1, max: 20 },
    { name: "quizzes", type: "yesno", importance: "optional", title: "Include quizzes or exercises?", short: "Exercises" },
    { name: "outcome", type: "textarea", importance: "optional", title: "What should the learner be able to do at the end?", context: "Learning Outcome", short: "Learning outcome", maxLength: 200 },
    ...COMMON_TAIL,
  ],

  writing: [
    goal,
    {
      name: "writingType",
      type: "single",
      importance: "required",
      title: "What are you writing?",
      context: "Type",
      options: ["Email", "Blog post", "Article", "Social post", "Letter", "Other"].map((label) => ({ value: label, label })),
    },
    { name: "recipient", type: "text", importance: "required", title: "Who is it for?", context: "Audience", short: "Recipient / audience", placeholder: "e.g., My manager" },
    { name: "keyPoints", type: "textarea", importance: "recommended", title: "Which key points must it include?", context: "Key Points", short: "Key points", maxLength: 300 },
    {
      name: "length",
      type: "select",
      importance: "recommended",
      title: "How long should it be?",
      context: "Length",
      short: "Length",
      options: ["A few lines", "1–2 paragraphs", "About 500 words", "1,000+ words"].map((label) => ({ value: label, label })),
    },
    { name: "cta", type: "text", importance: "optional", title: "Any call to action?", context: "Call to Action", short: "Call to action" },
    ...COMMON_TAIL,
  ],

  research: [
    goal,
    { name: "topic", type: "text", importance: "required", title: "What is the research topic?", context: "Topic", short: "Topic" },
    { name: "researchQuestion", type: "textarea", importance: "required", title: "What question should the research answer?", context: "Research Question", short: "Research question", maxLength: 300 },
    {
      name: "sources",
      type: "single",
      importance: "recommended",
      title: "Which sources should it rely on?",
      context: "Sources",
      short: "Sources",
      options: ["Academic papers", "Industry reports", "News", "Any reliable source"].map((label) => ({ value: label, label })),
    },
    {
      name: "citation",
      type: "select",
      importance: "optional",
      title: "Citation style",
      context: "Citation Style",
      short: "Citation style",
      options: ["APA", "MLA", "Chicago", "None"].map((label) => ({ value: label, label })),
    },
    { name: "audience", type: "text", importance: "optional", title: "Who is the audience?", context: "Audience", short: "Audience" },
    ...COMMON_TAIL,
  ],

  career: [
    goal,
    {
      name: "careerTask",
      type: "single",
      importance: "required",
      title: "What do you need?",
      context: "Task",
      options: ["Resume", "Cover letter", "Interview prep", "LinkedIn profile", "Salary negotiation"].map((label) => ({ value: label, label })),
    },
    { name: "role", type: "text", importance: "required", title: "Which role are you targeting?", context: "Target Role", short: "Target role" },
    { name: "experience", type: "number", importance: "recommended", title: "Years of experience", context: "Experience (years)", short: "Experience", min: 0, max: 50 },
    { name: "highlights", type: "textarea", importance: "recommended", title: "Key achievements to highlight", context: "Highlights", short: "Achievements", maxLength: 300 },
    ...COMMON_TAIL,
  ],

  general: [
    goal,
    { name: "audience", type: "text", importance: "recommended", title: "Who is the result for?", context: "Audience", short: "Audience" },
    { name: "background", type: "textarea", importance: "recommended", title: "Any background the AI should know?", context: "Background", short: "Background", maxLength: 300 },
    { name: "constraints", type: "textarea", importance: "optional", title: "Any constraints or things to avoid?", context: "Constraints", short: "Constraints", maxLength: 200 },
    ...COMMON_TAIL,
  ],
};

export const IMPORTANCE = {
  required: { label: "Required", pill: "bg-bad/10 text-bad ring-bad/25" },
  recommended: { label: "Recommended", pill: "bg-brand/10 text-brand ring-brand/25" },
  optional: { label: "Optional", pill: "bg-surface-3 text-muted ring-line" },
};

/* Profile field → question it can pre-fill (spec §20 context reuse). */
export const PROFILE_PREFILL = {
  "target audience": ["audience", "recipient"],
  product: ["productName"],
  "company name": ["company"],
  market: ["market"],
  budget: ["budget"],
  industry: ["industry"],
  language: ["language"],
  framework: ["framework"],
  database: ["database"],
  "preferred output": ["outputFormat"],
};

export const TONE_GROUPS = { formal: ["professional", "academic", "technical"], informal: ["casual", "friendly"] };
