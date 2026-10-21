import { render, screen } from "@testing-library/react";
import { createRoutesStub } from "react-router";
import { describe, expect, it } from "vitest";
import linkStyles from "../components/Link/Link.module.css";
import typographyStyles from "../components/Typography/Typography.module.css";
import { homeContent } from "../content/home.ts";
import { siteUrl } from "../site.config.ts";
import Home, { links, meta } from "./home.tsx";

function renderHome() {
  const Stub = createRoutesStub([{ path: "/", Component: Home }]);
  render(<Stub initialEntries={["/"]} />);
}

describe("home route", () => {
  it("renders the name as the only h1", async () => {
    renderHome();

    expect(await screen.findByRole("heading", { level: 1 })).toHaveTextContent(homeContent.name);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  });

  it("renders the intro", async () => {
    renderHome();

    expect(await screen.findByText(homeContent.intro)).toBeVisible();
  });

  it("renders the name with the display look and the intro as a muted lead (refinement R12.12)", async () => {
    renderHome();

    expect(await screen.findByRole("heading", { level: 1 })).toHaveClass(
      typographyStyles.display ?? "",
    );
    expect(screen.getByText(homeContent.intro)).toHaveClass(
      typographyStyles.lead ?? "",
      typographyStyles["tone-muted"] ?? "",
    );
  });

  it("links to /design-system with the content's descriptive accessible name", async () => {
    renderHome();

    const link = await screen.findByRole("link", { name: homeContent.designSystemLinkText });
    expect(link).toHaveAttribute("href", "/design-system");
  });

  it("uses the library Link for the design system link (refinement R4.10)", async () => {
    renderHome();

    expect(await screen.findByRole("link", { name: homeContent.designSystemLinkText })).toHaveClass(
      linkStyles.link ?? "",
    );
  });

  it("sets the title and description from the content module", () => {
    expect(meta()).toEqual([
      { title: homeContent.title },
      { name: "description", content: homeContent.description },
    ]);
  });

  it("links the canonical URL to the site root", () => {
    expect(links()).toEqual([{ rel: "canonical", href: `${siteUrl}/` }]);
  });
});
