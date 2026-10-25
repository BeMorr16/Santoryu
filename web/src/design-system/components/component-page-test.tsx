// Test support for showcases/<id>.test.tsx (not a test file itself): renders a component page
// through its route module, and holds the checks every component page shares.
import { render, screen, within } from "@testing-library/react";
import type { ComponentType } from "react";
import { createRoutesStub } from "react-router";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "../../../test/axe.ts";
import { componentPage, componentPages, componentPath, type ComponentPageId } from "./pages.ts";
import { showcases as showcaseById } from "./registry.ts";
import { sections } from "./toc.ts";

/** A component page's route module, as routes.ts loads it. */
export interface ComponentRoute {
  default: ComponentType;
  meta: () => unknown;
  links: () => unknown;
  handle: unknown;
}

/** Every showcase in side-menu order, with its page's name. */
export const showcases = componentPages.map(({ id, name }) => ({ ...showcaseById[id], name }));

/** Each example's visible title: the h3 that starts its group (refinement R8.13, ds-components R4.6). */
export const exampleTitle = `[role="group"] > h3:first-child`;

/**
 * Renders a component page through its route module, in a main as the shell does, and waits for
 * its h1. `page` is that main.
 */
export async function renderComponentPage(route: ComponentRoute, id: ComponentPageId) {
  const Page = route.default;
  const Stub = createRoutesStub([
    {
      path: componentPath(id),
      Component: () => (
        <main>
          <Page />
        </main>
      ),
    },
  ]);
  const result = render(<Stub initialEntries={[componentPath(id)]} />);
  await screen.findByRole("heading", { level: 1, name: componentPage(id).name });
  return { ...result, page: screen.getByRole("main") };
}

/** The customized example's CSS, shown once in a CodeBlock labelled CSS (refinement R15.11). */
export function expectCustomCss(page: HTMLElement, sample: string, css: string) {
  const blocks = [...page.querySelectorAll("pre")].filter((pre) => pre.textContent === sample);
  expect(blocks).toHaveLength(1);
  const header = blocks[0]?.previousElementSibling;
  expect(header?.firstElementChild).toHaveTextContent(/^CSS$/);
  expect(within(header as HTMLElement).getByRole("button", { name: "Copy code" })).toBeVisible();
  expect(blocks[0]?.querySelector("code")).toHaveClass("language-css");
  expect(css).toContain(sample);
}

/** The checks every component page shares (R15.3, ds-components R4.1, R4.6, R4.7). */
export function describeComponentPage(route: ComponentRoute, id: ComponentPageId) {
  const showcase = showcases.find((candidate) => candidate.id === id);
  if (!showcase) throw new Error(`no showcase ${id}`);
  const { name } = showcase;

  describe(`${name} page: shared docs`, () => {
    it(`shows ${name}'s purpose, examples panel, props, tokens and accessibility notes, all expanded`, async () => {
      const { page: section } = await renderComponentPage(route, id);

      expect(section).toHaveTextContent(showcase.purpose);
      expect(within(section).getByRole("group", { name: `${name} examples` })).toBeVisible();
      expect([...section.querySelectorAll("section > h2")].map((h) => h.textContent)).toEqual(
        sections.map(({ label }) => label),
      );
      // Expanded sections, not folded accordion items (ds-components R4.7).
      for (const { label } of sections.slice(1)) {
        expect(within(section).queryByRole("button", { name: label })).toBeNull();
      }
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
          within(section).getByRole("table", { name: `${name} component tokens` }),
        ).toBeInTheDocument();
      }
      for (const note of showcase.a11y) expect(section).toHaveTextContent(note);
      if (showcase.keyboard) {
        const keyboard = within(section).getByRole("table", { name: `${name} keyboard` });
        expect(within(keyboard).getAllByRole("rowheader")).toHaveLength(showcase.keyboard.length);
      }
    });

    it(`renders ${name}'s props note under the native-props sentence only when it has one`, async () => {
      const { page: section } = await renderComponentPage(route, id);

      if (showcase.nativePropsToRoot === false) {
        // Its native props go elsewhere, so the sentence would be wrong; the note says where.
        expect(within(section).queryByText(/^Any native prop not listed here/)).toBeNull();
        expect(showcase.propsNote).toBeDefined();
        expect(within(section).getByText(showcase.propsNote ?? "")).toBeInTheDocument();
        return;
      }
      const native = within(section).getByText(/^Any native prop not listed here/);
      const next = native.nextElementSibling;
      if (showcase.propsNote === undefined) {
        expect(next?.tagName).not.toBe("P");
      } else {
        expect(next?.tagName).toBe("P");
        expect(next).toHaveTextContent(showcase.propsNote);
      }
    });

    it(`names every ${name} example as a group by its visible title (refinement R8.13)`, async () => {
      const { page: section } = await renderComponentPage(route, id);
      const panel = within(section).getByRole("group", { name: `${name} examples` });

      const titles = [...panel.querySelectorAll(exampleTitle)];
      expect(titles.map((title) => title.textContent)).toEqual(
        showcase.examples.map(({ title }) => title),
      );
      for (const title of titles) {
        const group = title.parentElement;
        expect(group).toHaveAttribute("role", "group");
        expect(group).toHaveAccessibleName(title.textContent);
      }
    });

    it(`has no axe violations (R3.9)`, async () => {
      const { container } = await renderComponentPage(route, id);

      await expectNoAxeViolations(container);
    }, 30_000);
  });
}
