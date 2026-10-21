import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "../../../test/axe.ts";
import typographyStyles from "../../components/Typography/Typography.module.css";
import { OnThisPage } from "./OnThisPage.tsx";
import type { TocItem } from "./toc.ts";

const items: TocItem[] = [
  {
    id: "examples",
    label: "Examples",
    children: [
      { id: "variants", label: "Variants" },
      { id: "sizes", label: "Sizes" },
    ],
  },
  { id: "props", label: "Props" },
];

function renderList() {
  return render(
    <MemoryRouter initialEntries={["/design-system/components/button"]}>
      <OnThisPage items={items} className="extra" />
    </MemoryRouter>,
  );
}

describe("OnThisPage (ds-components R4.2)", () => {
  it('is a list labelled by its visible "On this page" label, not a landmark', () => {
    renderList();

    expect(screen.getByText("On this page")).toHaveClass(typographyStyles.label ?? "");
    expect(screen.getByRole("list", { name: "On this page" })).toBeInTheDocument();
    expect(screen.queryByRole("navigation")).toBeNull();
  });

  it("links each heading by its id, with the nested headings in a list under their parent", () => {
    renderList();

    const list = screen.getByRole("list", { name: "On this page" });
    const [examples, props] = within(list)
      .getAllByRole("listitem")
      .filter((item) => item.parentElement === list);
    if (!examples || !props) throw new Error("missing items");
    expect(
      within(examples)
        .getAllByRole("link")
        .map((link) => link.getAttribute("href")),
    ).toEqual(["#examples", "#variants", "#sizes"]);
    expect(
      within(within(examples).getByRole("list"))
        .getAllByRole("link")
        .map((l) => l.textContent),
    ).toEqual(["Variants", "Sizes"]);
    expect(within(props).getByRole("link", { name: "Props" })).toHaveAttribute("href", "#props");
  });

  it("never marks an in-page link as the current page", () => {
    renderList();

    for (const link of screen.getAllByRole("link"))
      expect(link).not.toHaveAttribute("aria-current");
  });

  it("passes className to its root", () => {
    const { container } = renderList();

    expect(container.firstElementChild).toHaveClass("extra");
  });

  it("has no axe violations", async () => {
    const { container } = renderList();

    await expectNoAxeViolations(container);
  });
});
