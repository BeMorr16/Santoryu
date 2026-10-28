import { describe, expect, it } from "vitest";
import {
  githubUrl,
  initials,
  linkedinUrl,
  ownerName,
  repoUrl,
  resumePdfPath,
  siteUrl,
} from "./site.config.ts";

describe("siteUrl", () => {
  it("is an https origin with no trailing slash", () => {
    expect(siteUrl).toMatch(/^https:\/\//);
    expect(siteUrl.endsWith("/")).toBe(false);
    expect(new URL(siteUrl).origin).toBe(siteUrl);
  });

  it("is the production domain", () => {
    expect(siteUrl).toBe("https://ben-morrison.com");
  });
});

describe("githubUrl", () => {
  it("is the owner's GitHub profile, with no trailing slash (contact R2.4)", () => {
    expect(githubUrl).toBe("https://github.com/BeMorr16");
    expect(githubUrl.endsWith("/")).toBe(false);
  });
});

describe("repoUrl", () => {
  it("is the site's GitHub repository, with no trailing slash (ds-components R3.5)", () => {
    expect(repoUrl).toBe("https://github.com/BeMorr16/Santoryu");
  });
});

describe("owner (site-refresh R7.1, R7.3)", () => {
  it("names the owner, and makes the initials from the name", () => {
    expect(ownerName).toBe("Ben Morrison");
    expect(initials).toBe(
      ownerName
        .split(" ")
        .map((word) => word.charAt(0))
        .join(""),
    );
  });

  it("links the LinkedIn profile over https, with no trailing slash", () => {
    expect(linkedinUrl).toBe("https://www.linkedin.com/in/morrison-ben");
    expect(new URL(linkedinUrl).protocol).toBe("https:");
  });
});

describe("resumePdfPath (resume R10.1)", () => {
  it("is the root-relative path of the PDF in web/public/", () => {
    expect(resumePdfPath).toBe("/ben-morrison-resume.pdf");
  });
});
