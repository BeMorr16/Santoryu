import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRoutesStub } from "react-router";
import { describe, expect, it } from "vitest";
import typographyStyles from "../../components/Typography/Typography.module.css";
import { hubData } from "../../generated/hub-data.ts";
import { hubCards } from "./cards.ts";
import { cardCounts } from "./counts.ts";
import { HubPage } from "./HubPage.tsx";

async function renderPage() {
  const Stub = createRoutesStub([
    { path: "/design-system", Component: HubPage },
    { path: "/design-system/components", Component: () => <h1>Components</h1> },
  ]);
  render(<Stub initialEntries={["/design-system"]} />);
  return screen.findByRole("heading", { level: 1 });
}

describe("HubPage (ds-hub R1, R2)", () => {
  it("has one h1, Design System, then an h2 per card (R1.3)", async () => {
    expect(await renderPage()).toHaveAccessibleName("Design System");

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getAllByRole("heading").map((heading) => heading.textContent)).toEqual([
      "Design System",
      "Tokens",
      "Components",
      "Theme Creator",
    ]);
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(3);
  });

  it("shows a muted lead paragraph after the h1 (R1.1)", async () => {
    const h1 = await renderPage();

    const lead = screen.getByText(/^The system this site is built from/);
    expect(lead.tagName).toBe("P");
    expect(h1.nextElementSibling).toBe(lead);
    expect(lead).toHaveClass(typographyStyles.lead ?? "", typographyStyles["tone-muted"] ?? "");
  });

  it("lists three link cards in order, each named by its heading alone (R1.2, R2.1)", async () => {
    await renderPage();

    const items = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(screen.getAllByRole("link")).toHaveLength(3);
    for (const [index, card] of hubCards.entries()) {
      const item = items[index];
      if (!item) throw new Error(`missing item ${String(index)}`);
      expect(within(item).getByRole("link")).toHaveAccessibleName(card.title);
      expect(within(item).getByRole("link")).toHaveAttribute("href", card.href);
    }
  });

  it("shows each card's description and counts (R2.4, R2.5)", async () => {
    await renderPage();

    const items = within(screen.getByRole("list")).getAllByRole("listitem");
    for (const [index, { id, description }] of hubCards.entries()) {
      expect(items[index]).toHaveTextContent(description);
      expect(items[index]).toHaveTextContent(cardCounts[id]);
    }
    expect(items[0]).toHaveTextContent(`${String(hubData.tokens.total)} tokens`);
  });

  it("puts a hidden, inert preview in every card (R3.5)", async () => {
    await renderPage();

    for (const item of within(screen.getByRole("list")).getAllByRole("listitem")) {
      const previews = item.querySelectorAll("[inert]");
      expect(previews).toHaveLength(1);
      expect(previews[0]).toHaveAttribute("aria-hidden", "true");
    }
    expect(screen.queryAllByRole("button")).toHaveLength(0);
    expect(screen.queryAllByRole("textbox")).toHaveLength(0);
  });

  it("follows a card's link from the keyboard: Tab to it, then Enter (R2.3)", async () => {
    const user = userEvent.setup();
    await renderPage();

    await user.tab();
    expect(screen.getByRole("link", { name: "Tokens" })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("link", { name: "Components" })).toHaveFocus();
    await user.keyboard("{Enter}");

    expect(await screen.findByRole("heading", { level: 1, name: "Components" })).toBeVisible();
  });
});
