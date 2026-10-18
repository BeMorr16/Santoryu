import { render, screen, within } from "@testing-library/react";
import { createRoutesStub } from "react-router";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "../../../test/axe.ts";
import { ComponentsPage } from "./ComponentsPage.tsx";
import { showcases } from "./registry.ts";

function renderPage() {
  const Stub = createRoutesStub([
    {
      path: "/lab/components",
      Component: () => (
        <main>
          <h1>Components</h1>
          <ComponentsPage />
        </main>
      ),
    },
  ]);
  return render(<Stub initialEntries={["/lab/components"]} />);
}

describe("/lab/components page (R15.1, R15.3)", () => {
  it("lists every section in an in-page list, linking to its id", async () => {
    renderPage();

    const list = await screen.findByRole("list", { name: "On this page" });
    const links = within(list).getAllByRole("link");
    expect(links.map((link) => [link.textContent, link.getAttribute("href")])).toEqual(
      showcases.map((showcase) => [showcase.name, `#${showcase.id}`]),
    );
  });

  it("renders one section per component, named by its h2, in registry order", async () => {
    renderPage();
    await screen.findByRole("list", { name: "On this page" });

    expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual(
      showcases.map((showcase) => showcase.name),
    );
    for (const showcase of showcases) {
      expect(screen.getByRole("region", { name: showcase.name })).toHaveAttribute(
        "id",
        showcase.id,
      );
    }
  });

  it.each(showcases.map((s) => [s.name, s] as const))(
    "shows %s's purpose, examples panel, props, tokens and accessibility notes",
    async (_name, showcase) => {
      renderPage();
      const section = await screen.findByRole("region", { name: showcase.name });

      expect(section).toHaveTextContent(showcase.purpose);
      expect(
        within(section).getByRole("group", { name: `${showcase.name} examples` }),
      ).toBeVisible();
      expect(
        within(section)
          .getAllByRole("heading", { level: 3 })
          .map((h) => h.textContent),
      ).toEqual(["Examples", "Props", "Component tokens", "Accessibility"]);
      for (const { part, docs } of showcase.props) {
        const table = within(section).getByRole("table", { name: `${part} props` });
        expect(
          within(table)
            .getAllByRole("rowheader")
            .map((row) => row.textContent),
        ).toEqual(Object.keys(docs));
      }
      if (showcase.tokens === null) {
        expect(section).toHaveTextContent(showcase.tokensNote ?? "");
      } else {
        expect(
          within(section).getByRole("table", { name: `${showcase.name} component tokens` }),
        ).toBeInTheDocument();
      }
      for (const note of showcase.a11y) expect(section).toHaveTextContent(note);
      if (showcase.keyboard) {
        const keyboard = within(section).getByRole("table", { name: `${showcase.name} keyboard` });
        expect(within(keyboard).getAllByRole("rowheader")).toHaveLength(showcase.keyboard.length);
      }
    },
  );

  it("has no axe violations (R3.9)", async () => {
    const { container } = renderPage();
    await screen.findByRole("list", { name: "On this page" });

    await expectNoAxeViolations(container);
  }, 30_000);
});
