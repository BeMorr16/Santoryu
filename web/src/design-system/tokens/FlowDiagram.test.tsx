import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "../../../test/axe.ts";
import { flowChain, workedExample } from "./flow.ts";
import { FlowDiagram } from "./FlowDiagram.tsx";
import { tierCounts, tierRules } from "./stats.ts";

const chain = flowChain(workedExample);

function renderDiagram() {
  return render(
    <MemoryRouter>
      <FlowDiagram chain={chain} counts={tierCounts} />
    </MemoryRouter>,
  );
}

/** The four tier items of the diagram's ordered list. */
function tierItems() {
  const list = screen.getAllByRole("list").find((element) => element.tagName === "OL");
  if (!list) throw new Error("No ordered list");
  return within(list)
    .getAllByRole("listitem")
    .filter((item) => item.parentElement === list);
}

describe("FlowDiagram (ds-tokens R2)", () => {
  it("is a figure with a visible caption (R2.1)", () => {
    renderDiagram();

    const caption = within(screen.getByRole("figure")).getByText(/^How a value reaches the page/);
    expect(caption.tagName).toBe("FIGCAPTION");
    expect(caption).toBeVisible();
  });

  it("lists exactly four tiers in order, with their rules (R2.1, R2.8)", () => {
    renderDiagram();

    const items = tierItems();
    expect(items).toHaveLength(4);
    expect(items.map((item) => item.querySelector("p")?.textContent)).toEqual([
      `Primitive ${String(tierCounts.primitive)} tokens`,
      `Semantic ${String(tierCounts.semantic)} tokens`,
      `Component ${String(tierCounts.component)} tokens`,
      "Site",
    ]);
    expect(items[0]).toHaveTextContent(tierRules.primitive);
    expect(items[1]).toHaveTextContent(tierRules.semantic);
    expect(items[2]).toHaveTextContent(tierRules.component);
  });

  it("links each tier's name to its h2 (R2.2)", () => {
    renderDiagram();

    expect(
      ["Primitive", "Semantic", "Component"].map((name) =>
        screen.getByRole("link", { name }).getAttribute("href"),
      ),
    ).toEqual(["#primitives", "#semantic", "#component"]);
  });

  it("shows the chain, with Light and Dark primitives, each node linking to its row (R2.3–R2.5)", () => {
    renderDiagram();
    const [primitive, semantic, component] = tierItems();
    if (!primitive || !semantic || !component) throw new Error("expected tiers");

    const nodes = within(primitive).getAllByRole("listitem");
    expect(nodes).toHaveLength(2);
    for (const [index, label] of ["Light", "Dark"].entries()) {
      const { token } = chain.primitives[index] ?? {};
      if (!token) throw new Error(`no ${label} primitive`);
      const node = nodes[index] as HTMLElement;
      expect(node).toHaveTextContent(label);
      expect(node).toHaveTextContent(token.css);
      expect(within(node).getByRole("link", { name: token.name })).toHaveAttribute(
        "href",
        `#${token.name.replaceAll(".", "-")}`,
      );
    }
    if (!chain.semantic.themed) throw new Error("the worked example's semantic token is themed");
    expect(semantic).toHaveTextContent(
      `Light ${chain.semantic.values.light.css}, Dark ${chain.semantic.values.dark.css}`,
    );
    expect(within(semantic).getByRole("link", { name: chain.semantic.name })).toHaveAttribute(
      "href",
      `#${chain.semantic.name.replaceAll(".", "-")}`,
    );
    expect(within(component).getByRole("link", { name: workedExample })).toHaveAttribute(
      "href",
      `#${workedExample.replaceAll(".", "-")}`,
    );
    expect(component).toHaveTextContent(`aliases ${chain.semantic.name}`);
  });

  it("names the component in the Site tier, linking to its page (R2.6)", () => {
    renderDiagram();

    expect(screen.getByRole("link", { name: "Button" })).toHaveAttribute(
      "href",
      "/design-system/components/button",
    );
  });

  it("shows an inert preview that's no control and hidden from assistive technology (R2.6, R2.8)", () => {
    const { container } = renderDiagram();

    const preview = container.querySelector("[inert]");
    expect(preview).toHaveAttribute("aria-hidden", "true");
    expect(preview?.querySelector("button")).toHaveTextContent("Send");
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("keeps every specimen decorative (R2.8)", () => {
    const { container } = renderDiagram();

    const specimens = container.querySelectorAll("[style]");
    expect(specimens.length).toBeGreaterThanOrEqual(4);
    for (const specimen of specimens) expect(specimen).toHaveAttribute("aria-hidden", "true");
  });

  it("has no axe violations", async () => {
    const { container } = renderDiagram();

    await expectNoAxeViolations(container);
  });
});
