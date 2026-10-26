import { designSystemPath } from "../design-system/components/pages.ts";
import { ownerName } from "../site.config.ts";

export interface WorkCard {
  id: string;
  title: string;
  description: string;
  /** Absent: a placeholder for a page that doesn't exist yet (R3.4). Row 7 adds Experience's. */
  href?: string;
}

export interface Principle {
  id: string;
  name: string;
  description: string;
  example: string;
}

/** Home page copy. Edit freely; the page and its metadata read from here. */
export const homeContent = {
  name: ownerName,
  role: "Full Stack Software Engineer",
  intro:
    "I'm a software engineer who left a pharmaceutical sciences PhD to build software, and I still bring a researcher's rigor to everything I ship. I work across the stack in TypeScript, React and Node, with a focus on:",
  focusAreas: [
    "ETL pipelines",
    "Design systems and components",
    "Accessible, responsive interfaces",
    "AI developer tooling",
  ],
  linkedinLabel: "LinkedIn",
  contactLabel: "Want to connect?",
  workHeading: "What I build",
  placeholderBadge: "Coming soon",
  principlesHeading: "How I develop",
  exampleLabel: "In practice",
  description:
    "Ben Morrison is a full stack software engineer building design systems, component libraries, accessible React apps and AI developer tools.",
} as const;

export const homeTitle = `${homeContent.name} · ${homeContent.role}`;

export const workCards = [
  {
    id: "design-system",
    title: "Design System",
    description:
      "An example component library built on design tokens: easy to use, strict by design and fully themeable, with live docs and a theme creator.",
    href: designSystemPath,
  },
  {
    id: "experience",
    title: "Experience",
    description: "My professional experience and highlights of the work I've shipped.",
  },
] as const satisfies readonly WorkCard[];

export const principles = [
  {
    id: "bias-for-action",
    name: "Bias for action",
    description:
      "When I hit a blocker and the next step is a two-way door, I take it. What I learn and the head start I gain are worth the time it might cost to undo.",
    example:
      "When an external team stalled our role-access ETL pipeline even after approvals, I kept it moving by pulling the data by hand from an admin site we already had access to.",
  },
  {
    id: "ownership",
    name: "Ownership",
    description:
      "I'm responsible for the code I write, even after it ships. When something breaks, I want to fix it, whether or not it's still in my hands.",
    example:
      "After our SDK and CLI toolkit for Kiro and Claude was adopted company-wide and handed to another team, I stayed on as one of its core engineers.",
  },
  {
    id: "opinions",
    name: "Have opinions, hold them loosely",
    description:
      "The best results I've seen come from teams where everyone brings an opinion and stays open to discussion. I bring mine, and I change it when a better solution shows up.",
    example:
      "I was sure our intake app had to ship as an Electron app for its dependencies, until a coworker found that switching to the company's internal AI model let us serve it on the web. We switched.",
  },
] as const satisfies readonly Principle[];
