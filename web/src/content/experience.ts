/** The skills panel's categories, broad first (R6.1). */
export const skillCategories = [
  "languages",
  "frontend",
  "backend",
  "ai",
  "design-systems",
  "devops",
] as const;
export type SkillCategoryId = (typeof skillCategories)[number];

export interface Skill {
  id: string;
  label: string;
  category: SkillCategoryId;
  /** Search-only alternative names (R8.1). Only where the label alone wouldn't match. */
  aliases?: readonly string[];
}

/** Every skill, in display order within each category (R6.4). "Used" is derived (R6.3). */
export const skills = [
  { id: "typescript", label: "TypeScript", category: "languages", aliases: ["TS"] },
  { id: "javascript", label: "JavaScript", category: "languages", aliases: ["JS"] },
  { id: "python", label: "Python", category: "languages" },
  { id: "sql", label: "SQL", category: "languages" },
  { id: "cypher", label: "Cypher", category: "languages" },
  { id: "html", label: "HTML", category: "languages" },
  { id: "css", label: "CSS", category: "languages" },
  { id: "sass", label: "Sass", category: "languages", aliases: ["SCSS"] },
  { id: "rust", label: "Rust", category: "languages" },
  { id: "java", label: "Java", category: "languages" },

  { id: "react", label: "React", category: "frontend" },
  { id: "react-native", label: "React Native", category: "frontend", aliases: ["mobile"] },
  { id: "expo", label: "Expo", category: "frontend" },
  { id: "vue", label: "Vue", category: "frontend", aliases: ["Vue.js"] },
  { id: "electron", label: "Electron", category: "frontend" },
  { id: "shadcn-ui", label: "shadcn/ui", category: "frontend" },
  { id: "mapbox-gl-js", label: "Mapbox GL JS", category: "frontend" },
  { id: "gsap", label: "GSAP", category: "frontend" },
  {
    id: "accessibility",
    label: "Accessibility",
    category: "frontend",
    aliases: ["a11y", "WCAG", "ARIA"],
  },
  {
    id: "responsive-design",
    label: "Responsive design",
    category: "frontend",
    aliases: ["mobile", "tablet"],
  },
  { id: "data-visualization", label: "Data visualization", category: "frontend" },
  { id: "prototyping", label: "Prototyping", category: "frontend" },
  { id: "nextjs", label: "Next.js", category: "frontend" },
  { id: "angular", label: "Angular", category: "frontend" },
  { id: "tailwind-css", label: "Tailwind CSS", category: "frontend" },
  { id: "material-ui", label: "Material UI", category: "frontend" },
  { id: "radix-ui", label: "Radix UI", category: "frontend" },
  { id: "bootstrap", label: "Bootstrap", category: "frontend" },
  { id: "chartjs", label: "Chart.js", category: "frontend" },
  { id: "threejs", label: "Three.js", category: "frontend" },
  { id: "react-router", label: "React Router", category: "frontend" },
  { id: "tanstack-query", label: "TanStack Query", category: "frontend" },
  { id: "redux", label: "Redux", category: "frontend" },
  { id: "rtk-query", label: "RTK Query", category: "frontend" },
  { id: "zustand", label: "Zustand", category: "frontend" },
  { id: "recoil", label: "Recoil", category: "frontend" },

  { id: "nodejs", label: "Node.js", category: "backend" },
  { id: "bun", label: "Bun", category: "backend" },
  { id: "express", label: "Express", category: "backend" },
  { id: "rest-apis", label: "REST APIs", category: "backend" },
  { id: "graphql", label: "GraphQL", category: "backend" },
  { id: "websockets", label: "WebSockets", category: "backend" },
  { id: "zod", label: "Zod", category: "backend" },
  { id: "postgresql", label: "PostgreSQL", category: "backend", aliases: ["Postgres"] },
  { id: "sqlite", label: "SQLite", category: "backend" },
  { id: "neo4j", label: "Neo4j", category: "backend" },
  { id: "etl", label: "ETL", category: "backend" },
  { id: "jwt", label: "JWT", category: "backend" },
  { id: "oidc", label: "OIDC", category: "backend", aliases: ["OAuth", "OpenID Connect"] },
  { id: "sso", label: "SSO", category: "backend" },
  { id: "rbac", label: "RBAC", category: "backend" },
  { id: "entra-id", label: "Entra ID", category: "backend", aliases: ["Azure AD"] },
  { id: "spring-boot", label: "Spring Boot", category: "backend" },
  { id: "django", label: "Django", category: "backend" },
  { id: "auth0", label: "Auth0", category: "backend" },

  { id: "mcp", label: "MCP", category: "ai", aliases: ["Model Context Protocol"] },
  { id: "claude-code", label: "Claude Code", category: "ai", aliases: ["Anthropic"] },
  { id: "kiro", label: "Kiro", category: "ai" },
  { id: "llm-integration", label: "LLM integration", category: "ai", aliases: ["AI", "GenAI"] },
  { id: "claude-api", label: "Claude API", category: "ai", aliases: ["Anthropic"] },
  { id: "openai-api", label: "OpenAI API", category: "ai" },

  { id: "design-tokens", label: "Design tokens", category: "design-systems" },
  { id: "style-dictionary", label: "Style Dictionary", category: "design-systems" },
  { id: "storybook", label: "Storybook", category: "design-systems" },
  { id: "figma-plugin-api", label: "Figma Plugin API", category: "design-systems" },
  { id: "figma-rest-api", label: "Figma REST API", category: "design-systems" },
  { id: "chromatic", label: "Chromatic", category: "design-systems" },

  { id: "aws", label: "AWS", category: "devops", aliases: ["Amazon Web Services", "EKS"] },
  { id: "kubernetes", label: "Kubernetes", category: "devops", aliases: ["K8s", "EKS"] },
  { id: "docker", label: "Docker", category: "devops" },
  { id: "gitlab-ci-cd", label: "GitLab CI/CD", category: "devops" },
  { id: "rancher", label: "Rancher", category: "devops" },
  { id: "turborepo", label: "Turborepo", category: "devops" },
  { id: "pnpm", label: "pnpm", category: "devops" },
  { id: "webpack", label: "Webpack", category: "devops" },
  { id: "esbuild", label: "esbuild", category: "devops" },
  { id: "postcss", label: "PostCSS", category: "devops" },
  { id: "cli-tools", label: "CLI tools", category: "devops" },
  { id: "github-actions", label: "GitHub Actions", category: "devops", aliases: ["CI/CD"] },
  {
    id: "bitbucket-pipelines",
    label: "Bitbucket Pipelines",
    category: "devops",
    aliases: ["CI/CD"],
  },
  { id: "nginx", label: "nginx", category: "devops" },
  { id: "vite", label: "Vite", category: "devops" },
  { id: "babel", label: "Babel", category: "devops" },
  { id: "jest", label: "Jest", category: "devops" },
  { id: "playwright", label: "Playwright", category: "devops" },
  { id: "postman", label: "Postman", category: "devops" },
  { id: "eslint", label: "ESLint", category: "devops" },
] as const satisfies readonly Skill[];

export type SkillId = (typeof skills)[number]["id"];

type Month = "01" | "02" | "03" | "04" | "05" | "06" | "07" | "08" | "09" | "10" | "11" | "12";
/** A valid HTML month string, e.g. "2025-04", used as `<time dateTime>` (R4.2). */
export type YearMonth = `${number}-${Month}`;

export interface Highlight {
  id: string;
  title: string;
  summary: string;
  details: readonly string[];
  skills: readonly SkillId[];
}

export interface Position {
  id: string;
  title: string;
  company: string;
  start: YearMonth;
  /** Absent: current ("Present"). */
  end?: YearMonth;
  type?: "contract" | "part-time";
  location?: string;
  about?: string;
  highlights: readonly Highlight[];
}

/** In display order (R4.1). Appendix A. */
export const positions = [
  {
    id: "charter-software-engineer",
    title: "Software Engineer",
    company: "Charter Communications (Spectrum)",
    start: "2025-04",
    highlights: [
      {
        id: "ai-tool-registry",
        title: "AI tool registry",
        summary:
          "Co-built a package manager for AI agent tooling that the company's developer-enablement team adopted as its enterprise-wide registry for Kiro CLI, and later Claude Code, then stayed on its core engineering team after the handoff.",
        details: [
          "Architected a TypeScript SDK and CLI that let developers discover, install, validate, version and roll back curated agents, skills, prompts, steering files, knowledge bases and MCP servers from namespaced registries with per-registry allow lists.",
          "Engineered a registry layer that merges a bundled registry with a GitLab-backed community registry, fuzzy-searched with Fuse.js, and accepts contributions through merge requests validated against Zod schemas.",
          "Made installs reproducible and reversible with a lockfile of versions and integrity hashes, and an SQLite event log that restores any earlier state.",
          "Developed an Express sidecar server, kept running by a background daemon, whose REST and Server-Sent Events endpoints stream Kiro CLI sessions to a React GUI, an interactive TUI and other clients.",
        ],
        skills: [
          "typescript",
          "nodejs",
          "bun",
          "express",
          "rest-apis",
          "react",
          "sqlite",
          "zod",
          "kiro",
          "claude-code",
          "mcp",
          "cli-tools",
        ],
      },
      {
        id: "codebase-intelligence",
        title: "Codebase intelligence platform",
        summary:
          "Co-built a dependency-analysis platform that gives engineers, designers and AI agents queryable insight into a 50+ package enterprise React micro-frontend.",
        details: [
          "Engineered a CLI-driven ETL pipeline that clones every repository, parses the source into ASTs, and derives dependency graphs, component and hook usage, render trees and AI-generated component documentation.",
          "Consolidated the output into SQLite and Neo4j, explored through SQL, Cypher and GraphQL queries, generated reports, and React data visualizations.",
          "Developed an MCP server on raw JSON-RPC 2.0, with no MCP SDK, that exposes the data to AI agents through 23 tools over stdio and streamable HTTP, and powers a React chat interface on the team site.",
          "Enabled teams to track deprecated UI-library components, remove stale packages, scope feature additions and removals, trace role access, and check whether a component already exists before building it, among many other analyses.",
        ],
        skills: [
          "typescript",
          "react",
          "bun",
          "turborepo",
          "zod",
          "sql",
          "sqlite",
          "neo4j",
          "cypher",
          "graphql",
          "mcp",
          "cli-tools",
          "etl",
          "data-visualization",
        ],
      },
      {
        id: "accessibility-tablet",
        title: "Accessibility and tablet readiness",
        summary:
          "Led two platform-wide efforts on an enterprise call-center platform used by thousands of agents: a WCAG AA accessibility remediation, and the responsive work for an in-store tablet rollout, delivered in two-thirds of its planned time.",
        details: [
          "Coordinated fixes with 15+ teams that own the platform's UI packages, triaging the accessibility team's audit findings and tracing each issue to the package and component responsible.",
          "Fixed visual, screen-reader and keyboard issues directly in React and HTML, or routed them to the owning team with the cause identified; the remediation finished early and continues as ongoing work.",
          "Wrote much of the responsive code for the tablet rollout, contributing directly to other teams' codebases so the platform works on in-store tablets.",
        ],
        skills: ["react", "javascript", "html", "css", "accessibility", "responsive-design"],
      },
      {
        id: "document-orchestration",
        title: "AI document orchestration",
        summary:
          "Co-built a conversational document builder that guides product consultants through PRDs, project briefs, case studies and competitive analyses; it's now in pilot with two teams for their intake work.",
        details: [
          "Designed a chat flow in which the AI asks focused questions, synthesizes the answers into professional Markdown, and writes it into the document's named sections in real time.",
          "Made every document type configurable: users create and customize directives (sections) and choose which ones make up each framework, so new document types need no code changes.",
          "Developed across the full stack alongside a principal product designer: a React single-page app, a Bun backend-for-frontend with server-side AI inference, and a private PostgreSQL schema behind bearer-token (JWT) authentication.",
          "Moved it from an Electron desktop app to the browser by switching inference to the company's internal AI model, which removed the desktop install.",
        ],
        skills: [
          "typescript",
          "react",
          "bun",
          "turborepo",
          "postgresql",
          "sql",
          "jwt",
          "electron",
          "llm-integration",
        ],
      },
      {
        id: "design-token-pipeline",
        title: "Design token pipeline",
        summary:
          "Co-built, from scratch, the token pipeline the company's design-system team uses to keep Figma and code in sync, publishing its tokens as npm packages for web, iOS and Android.",
        details: [
          "Compiled one JSON token source with Style Dictionary and custom transforms into CSS custom properties, SCSS variables, JS and TypeScript modules, JSON, and iOS and Android formats.",
          "Synced tokens in either direction with Figma variables through the Figma REST API, diffing local JSON against Figma for review and preserving alias chains.",
          "Packaged the system as three layered npm packages (tokens, CSS and components), each usable alone or together, built with Sass, PostCSS and esbuild (ESM and CommonJS), versioned with Changesets and published to the company's npm registry.",
          "Independently developed an MCP server that gives AI agents authoritative design-system knowledge: tokens, themes, components and props, icons, deprecations, migration status and changelogs, plus a comparison with another internal component library.",
        ],
        skills: [
          "typescript",
          "nodejs",
          "style-dictionary",
          "design-tokens",
          "figma-rest-api",
          "css",
          "sass",
          "postcss",
          "esbuild",
          "turborepo",
          "pnpm",
          "mcp",
        ],
      },
      {
        id: "ux-test-prototypes",
        title: "Interactive UX-test prototypes",
        summary:
          "Built 10+ interactive React prototypes, three of them alone, that replaced static mockups in UX testing, so call-center agents try new designs as they would in production instead of only looking at them.",
        details: [
          "Turned designers' Figma files into working prototypes for UX researchers' sessions, each a TypeScript and React app in a shared Turborepo workspace, with Node and Express backends where a test needed live behavior.",
          "Developed a WebSocket chat backend and an event-driven API for a chat-agent test: the moderator answers the participant live, and actions such as opening account details trigger the next scripted message.",
          "Kept undocked panels in sync across browser windows with the BroadcastChannel API.",
          "Surfaced problems static mockups would have missed: undocking the right rail took away information agents still needed on the main page, and a new alert type went unnoticed behind a bell icon. Both designs were changed.",
        ],
        skills: [
          "typescript",
          "react",
          "nodejs",
          "express",
          "websockets",
          "turborepo",
          "prototyping",
        ],
      },
      {
        id: "team-tools-platform",
        title: "Team tools platform",
        summary:
          "Built sign-in, access control and usage analytics for the team's internal tools site, home to its AI chat, data visualizations, document builder and reporting dashboards, and ran its deployments to the team's AWS account.",
        details: [
          "Implemented single sign-on with Entra ID over OIDC (openid-client), and replaced the site's old sign-in pages with an access-request page for protected routes.",
          "Kept roles and permissions in the site's own user database rather than in the identity provider, so the team grants access itself, which cut the time it takes to onboard new users.",
          "Added usage analytics (user counts and site activity), the team's first data on who uses which tools.",
          "Ran deployments to Amazon EKS and maintained the GitLab CI/CD pipelines behind them, monitoring workloads in Rancher.",
        ],
        skills: [
          "typescript",
          "react",
          "sql",
          "entra-id",
          "oidc",
          "sso",
          "rbac",
          "aws",
          "kubernetes",
          "gitlab-ci-cd",
          "rancher",
        ],
      },
      {
        id: "economic-impact-map",
        title: "Economic-impact map",
        summary:
          "Maintained and extended a Vue data-visualization app, built by others, that presents the company's statewide footprint and economic impact on an interactive U.S. map, shipping each year's data update along with new features and fixes.",
        details: [
          "Worked across Vue, TypeScript, Mapbox GL JS and GSAP animations, with state-by-state statistics (homes passed, customers, employees, investment, taxes paid and more) kept in JSON.",
          "Shipped it both as a browser app served through Docker, and as a full-screen Electron kiosk for presentations.",
          "Added states missing from the map's Mapbox data, and updated the configuration when its hosting moved into the team's AWS cluster.",
        ],
        skills: [
          "vue",
          "typescript",
          "sass",
          "html",
          "mapbox-gl-js",
          "gsap",
          "electron",
          "docker",
          "data-visualization",
        ],
      },
    ],
  },
  {
    id: "verizon",
    title: "Senior Figma Plugin Developer",
    company: "Verizon",
    start: "2024-12",
    end: "2025-04",
    type: "contract",
    highlights: [
      {
        id: "adoption-plugin",
        title: "Design-system adoption plugin",
        summary:
          "Co-built a Figma plugin that suggests design-system components to replace custom parts of a design, about 85% accurate in testing, to help product teams adopt the company's central design system.",
        details: [
          "Developed the plugin itself in TypeScript and React with shadcn/ui, using the Figma Plugin and REST APIs to read designs and present the model's suggestions.",
          "Improved the Python service's LLM responses, alongside the two teammates who owned image hashing and the model integration.",
          "Replaced a manual check that relied on each designer reviewing their own work.",
        ],
        skills: [
          "typescript",
          "react",
          "shadcn-ui",
          "figma-plugin-api",
          "figma-rest-api",
          "python",
          "llm-integration",
        ],
      },
      {
        id: "theming-plugin",
        title: "Design-system theming plugin",
        summary:
          "Independently built a prototype Figma plugin that let product teams theme design-system components within the system's rules, so teams with their own look could still adopt the central design system.",
        details: [
          "Allowed adjustments to component variant properties (color, border and typography) within the limits the design tokens set, enforcing the system's core standards.",
          "Exported customizations past those limits as a JSON theme object that overrides the tokens to produce the team's look.",
          "Developed it in TypeScript and React with the Figma Plugin API, pulling the design library's tokens through the Figma REST API.",
        ],
        skills: ["typescript", "react", "figma-plugin-api", "figma-rest-api", "design-tokens"],
      },
    ],
  },
  {
    id: "charter-software-engineer-i",
    title: "Software Engineer I",
    company: "Charter Communications (Spectrum)",
    start: "2024-10",
    end: "2024-12",
    type: "contract",
    highlights: [],
  },
  {
    id: "troska-health",
    title: "Fullstack Software Engineer",
    company: "Troska Health",
    start: "2024-07",
    end: "2024-12",
    type: "part-time",
    about:
      "An early-stage startup building a platform to help patients deal with health insurers: tracking deadlines, gathering what each claim needs, and simplifying the back-and-forth.",
    highlights: [
      {
        id: "component-libraries",
        title: "Web and mobile component libraries",
        summary:
          "Built matching React and React Native component libraries from the product's Figma designs, making feature development about a third faster by the team's estimate.",
        details: [
          "Developed the React Native library alone with Expo, and the React library with one other developer, covering every component the designs called for: buttons, typography, cards, stacks, accordions, inputs and more.",
          "Shared design tokens for color, borders, typography and radius between web and native, while spacing stayed separate per platform.",
          "Documented and previewed the components in Storybook.",
        ],
        skills: [
          "typescript",
          "react",
          "react-native",
          "expo",
          "css",
          "storybook",
          "design-tokens",
        ],
      },
      {
        id: "passwordless-sign-in",
        title: "Passwordless sign-in",
        summary:
          "Built passwordless magic-link sign-in end to end, from the React frontend to the Node API, giving 50+ early users and testers access with no passwords to store or reset.",
        details: [
          "Developed an Express API that issues a signed JWT, emails it in a sign-in link and verifies it when the link is opened, with accounts stored in PostgreSQL.",
          "Built the sign-in screens in React and TypeScript.",
        ],
        skills: ["typescript", "react", "nodejs", "express", "postgresql", "sql", "jwt"],
      },
      {
        id: "faster-builds",
        title: "Faster builds",
        summary:
          "Cut build times from a minute or two to a few seconds by introducing Turborepo and its caching, so packages that hadn't changed were never rebuilt.",
        details: [
          "Replaced separate, repeated build steps with one cached Turborepo pipeline.",
          "Tuned the webpack configuration to speed up the builds that still ran.",
        ],
        skills: ["turborepo", "webpack"],
      },
    ],
  },
] as const satisfies readonly Position[];

export interface EducationEntry {
  id: string;
  credential: string;
  school: string;
  year: number;
  note?: string;
}

/** In display order (R9.1). Appendix A. */
export const education = [
  {
    id: "fullstack-academy",
    credential: "Software Engineering Bootcamp",
    school: "Fullstack Academy",
    year: 2024,
  },
  {
    id: "st-johns",
    credential: "M.S. Pharmaceutical Sciences",
    school: "St. John's University",
    year: 2024,
    note: "Data science focus; left the PhD program for software",
  },
  {
    id: "binghamton",
    credential: "B.S. Biological Sciences",
    school: "SUNY Binghamton",
    year: 2021,
    note: "Cum laude",
  },
] as const satisfies readonly EducationEntry[];

/** Experience page copy. Edit freely; the page and its metadata read from here. */
export const experienceContent = {
  heading: "Experience",
  pdfLabel: "Download résumé (PDF)",
  workHeading: "Work",
  skillsHeading: "Skills",
  skillsHint: "Choose skills to show only the work that used them.",
  searchLabel: "Search skills",
  alsoLabel: "Also worked with",
  clearLabel: "Clear skills",
  disclosureLabel: "Filter by skill",
  noMatch: "No highlights use the selected skills.",
  educationHeading: "Education",
  present: "Present",
  tagListLabel: "Skills",
  selectedTag: "selected",
  types: { contract: "Contract", "part-time": "Part-time" },
  categories: {
    languages: "Languages",
    frontend: "Frontend",
    backend: "Backend & data",
    ai: "AI & agents",
    "design-systems": "Design systems",
    devops: "DevOps & tooling",
  },
  count: (shown: number, total: number) =>
    shown === total
      ? `Showing all ${String(total)} highlights`
      : `Showing ${String(shown)} of ${String(total)} highlights`,
  categoryCount: (selected: number, total: number) =>
    `${String(selected)} of ${String(total)} selected`,
  noSkillsMatch: (query: string) => `No skills match “${query}”.`,
  description:
    "Ben Morrison's work as a full stack software engineer: AI developer tools, design systems, accessible React apps and data pipelines, filterable by skill.",
} as const satisfies { categories: Record<SkillCategoryId, string> } & Record<string, unknown>;
