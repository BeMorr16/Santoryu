import { version as reactVersion } from "react";
import { ownerName } from "../site.config.ts";
import { contactContent } from "./contact.ts";
import { homeContent } from "./home.ts";

/** Footer copy (site-footer). Edit freely; the role and location come from Home and Contact. */
export const footerContent = {
  name: ownerName,
  homeLabel: `${ownerName}, home`,
  role: homeContent.role,
  location: contactContent.location,
  linkedinLabel: "LinkedIn",
  githubLabel: "GitHub",
  navLabel: "Footer",
  navHeading: "Navigation",
  homeLink: "Home",
  resumeLink: "Résumé (PDF)",
  builtWith: `Built with React ${reactVersion.split(".")[0] ?? ""} and Vite`,
} as const;
