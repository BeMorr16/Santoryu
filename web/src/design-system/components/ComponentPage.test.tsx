import { render, screen, within } from "@testing-library/react";
import { createRoutesStub } from "react-router";
import { describe, expect, it } from "vitest";
import * as buttonRoute from "../../routes/design-system/components/button.tsx";
import { renderComponentPage, type ComponentRoute } from "./component-page-test.tsx";
import { componentPageLinks, componentPageMeta } from "./ComponentPage.tsx";
import { docsHandle } from "./docs-handle.ts";
import { componentPages, componentPath, type ComponentPageId } from "./pages.ts";
import { showcases } from "./registry.ts";
import { slug } from "./slug.ts";
import { ComponentsSideMenu } from "./SideMenu.tsx";

/** Every component page's route module, by page id. */
const routes: Partial<Record<string, ComponentRoute>> = Object.fromEntries(
  Object.entries(
    import.meta.glob<ComponentRoute>(
      ["../../routes/design-system/components/*.tsx", "!**/index.tsx", "!**/*.test.tsx"],
      { eager: true },
    ),
  ).map(([path, route]) => [path.replace(/^.*\/|\.tsx$/g, ""), route] as const),
);

function routeOf(id: ComponentPageId): ComponentRoute {
  const route = routes[id];
  if (!route) throw new Error(`no route module for ${id}`);
  return route;
}

describe("ComponentPage (ds-components R4)", () => {
  it("has a route module for every component page, with the docs handle", () => {
    for (const { id } of componentPages) expect(routeOf(id).handle).toBe(docsHandle);
    expect(docsHandle.Aside).toBe(ComponentsSideMenu);
  });

  it("shows the h1, lead, source link, On this page, main example and its code, the four sections, then previous/next, in order (R4.1)", async () => {
    const { page } = await renderComponentPage(buttonRoute, "button");

    const h1 = within(page).getByRole("heading", { level: 1, name: "Button" });
    const lead = within(page).getByText(showcases.button.purpose);
    const source = within(page).getByRole("link", { name: "View source on GitHub" });
    const toc = within(page).getByRole("list", { name: "On this page" });
    const mainPanel = within(page).getByRole("group", { name: "Button example" });
    const code = within(page).getByText(showcases.button.main.file, { selector: "p, span, div" });
    const sections = ["examples", "props", "component-tokens", "accessibility"].map((id) =>
      page.querySelector(`h2#${id}`),
    );
    const prevNext = within(page).getByRole("list", { name: "Previous and next" });
    const ordered = [h1, lead, source, toc, mainPanel, code, ...sections, prevNext];
    for (const [index, element] of ordered.entries()) {
      expect(element, `part ${String(index)}`).not.toBeNull();
      const next = ordered[index + 1];
      if (element && next) {
        expect(element.compareDocumentPosition(next) & Node.DOCUMENT_POSITION_FOLLOWING).toBe(
          Node.DOCUMENT_POSITION_FOLLOWING,
        );
      }
    }
  });

  it("links the component's source folder on GitHub, in the same tab (R4.1)", async () => {
    const { page } = await renderComponentPage(buttonRoute, "button");

    const source = within(page).getByRole("link", { name: "View source on GitHub" });
    expect(source).toHaveAttribute(
      "href",
      "https://github.com/BeMorr16/Santoryu/tree/main/web/src/components/Button",
    );
    expect(source).not.toHaveAttribute("target");
  });

  it("lists the h2s in On this page, with the examples nested under Examples, each linking its heading's id (R4.2, R4.3)", async () => {
    const { page } = await renderComponentPage(buttonRoute, "button");

    const toc = within(page).getByRole("list", { name: "On this page" });
    const top = within(toc)
      .getAllByRole("listitem")
      .filter((item) => item.parentElement === toc);
    expect(top.map((item) => item.firstElementChild?.textContent)).toEqual([
      "Examples",
      "Props",
      "Component tokens",
      "Accessibility",
    ]);
    const nested = within(top[0] as HTMLElement).getByRole("list");
    expect(
      within(nested)
        .getAllByRole("link")
        .map((link) => link.textContent),
    ).toEqual(showcases.button.examples.map(({ title }) => title));
    for (const link of within(toc).getAllByRole("link")) {
      const id = link.getAttribute("href")?.slice(1) ?? "";
      const heading = page.querySelector(`[id="${id}"]`);
      expect(heading?.tagName, id).toMatch(/^H[23]$/);
      expect(heading).toHaveTextContent(link.textContent);
    }
    for (const { title } of showcases.button.examples) {
      expect(within(page).getByRole("heading", { level: 3, name: title })).toHaveAttribute(
        "id",
        slug(title),
      );
    }
  });

  it("shows the main example and the other examples in two panels, each with its own theme menu (R4.4, R4.6)", async () => {
    const { page } = await renderComponentPage(buttonRoute, "button");

    const mainPanel = within(page).getByRole("group", { name: "Button example" });
    const examplesPanel = within(page).getByRole("group", { name: "Button examples" });
    expect(
      within(mainPanel).getByRole("button", { name: "Theme: Site (Button example preview)" }),
    ).toHaveAttribute("aria-haspopup", "menu");
    expect(
      within(examplesPanel).getByRole("button", { name: "Theme: Site (Button examples preview)" }),
    ).toHaveAttribute("aria-haspopup", "menu");
    expect(within(mainPanel).getByRole("button", { name: "Save changes" })).toBeInTheDocument();
    expect(examplesPanel.querySelectorAll('[role="group"] > h3')).toHaveLength(
      showcases.button.examples.length,
    );
  });

  it("shows the main example's module source below it, labelled with its file name, with a copy button (R4.4)", async () => {
    const { page } = await renderComponentPage(buttonRoute, "button");

    const mainPanel = within(page).getByRole("group", { name: "Button example" });
    const block = mainPanel.nextElementSibling as HTMLElement;
    expect(block).toHaveTextContent("ButtonExample.tsx");
    expect(block.querySelector("code")).toHaveTextContent(
      showcases.button.main.source.trimEnd().replace(/\s+/g, " "),
      { normalizeWhitespace: true },
    );
    expect(block.querySelector("code")).toHaveClass("language-tsx");
    expect(within(block).getByRole("button", { name: "Copy code" })).toBeInTheDocument();
  });

  it("ends with links to the previous and next pages (R4.9)", async () => {
    const { page } = await renderComponentPage(routeOf("link"), "link");

    const prevNext = within(page).getByRole("list", { name: "Previous and next" });
    expect(within(prevNext).getByRole("link", { name: "Previous: Button" })).toBeInTheDocument();
    expect(within(prevNext).getByRole("link", { name: "Next: Menu" })).toBeInTheDocument();
  });

  it.each(componentPages.map(({ id, name }) => [name, id] as const))(
    "%s's page has one h1 and no skipped heading levels (R4.8)",
    async (_name, id) => {
      const { page } = await renderComponentPage(routeOf(id), id);

      const levels = [...page.querySelectorAll("h1, h2, h3, h4, h5, h6")].map((heading) =>
        Number(heading.tagName.slice(1)),
      );
      expect(levels.filter((level) => level === 1)).toHaveLength(1);
      expect(levels[0]).toBe(1);
      levels.forEach((level, index) => {
        const previous = levels[index - 1] ?? 0;
        expect(level, `heading ${String(index)}`).toBeLessThanOrEqual(previous + 1);
      });
    },
  );

  it("titles the page, describes it with its purpose and links its canonical URL (R1.1, R1.5)", () => {
    expect(componentPageMeta(showcases["back-to-top"])).toEqual([
      { title: "BackToTop · Components · Design System · Ben" },
      { name: "description", content: showcases["back-to-top"].purpose },
    ]);
    expect(componentPageLinks(showcases["back-to-top"])).toEqual([
      { rel: "canonical", href: `https://ben-morrison.com${componentPath("back-to-top")}` },
    ]);
    expect(buttonRoute.meta()).toEqual(componentPageMeta(showcases.button));
    expect(buttonRoute.links()).toEqual(componentPageLinks(showcases.button));
  });

  it("renders through the route module the router loads", async () => {
    const Stub = createRoutesStub([
      { path: componentPath("menu"), Component: routeOf("menu").default },
    ]);
    render(<Stub initialEntries={[componentPath("menu")]} />);

    expect(await screen.findByRole("heading", { level: 1, name: "Menu" })).toBeInTheDocument();
  });
});
