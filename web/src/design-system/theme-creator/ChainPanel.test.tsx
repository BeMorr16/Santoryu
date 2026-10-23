import { act, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { openDisclosure, renderCreator, typeHex } from "./theme-creator-test.tsx";

afterEach(() => {
  localStorage.clear();
});

const panel = () => screen.getByRole("region", { name: "Token chain" });

describe("chain panel (theme-creator R8)", () => {
  it("is a labelled region with no live region, starting on color.action.background (R8.4, R8.5)", async () => {
    await renderCreator();

    const chain = panel();
    expect(chain.querySelector("[aria-live], [role='status'], [role='alert']")).toBeNull();
    expect(within(chain).getByRole("link", { name: "color.action.background" })).toHaveAttribute(
      "href",
      "/design-system/tokens#color-action-background",
    );
    expect(within(chain).getByRole("link", { name: "color.blue.700" })).toBeInTheDocument();
    expect(within(chain).getByText(/^Component tokens \(\d+\)$/)).toBeInTheDocument();
    expect(within(chain).getByRole("link", { name: "Button" })).toHaveAttribute(
      "href",
      "/design-system/components/button",
    );
  });

  it("retargets to a row that gets focus, without moving focus (R8.1, R8.4)", async () => {
    const { user } = await renderCreator();
    await openDisclosure(user, "Spacing", "Semantic tokens");

    const field = screen.getByRole("spinbutton", { name: "space.inset.md" });
    act(() => {
      field.focus();
    });

    expect(within(panel()).getByRole("link", { name: "space.inset.md" })).toBeInTheDocument();
    expect(field).toHaveFocus();
  });

  it("traces a key control as the semantic tokens it sets", async () => {
    await renderCreator();

    act(() => {
      screen.getByRole("slider", { name: "Corner radius" }).focus();
    });

    expect(within(panel()).getByText("Corner radius sets 2 semantic tokens")).toBeInTheDocument();
    expect(within(panel()).getByRole("link", { name: "radius.control" })).toBeInTheDocument();
  });

  it("follows the draft's values live, and shows an edited value as Custom (R8.2, R8.3)", async () => {
    const { user } = await renderCreator();

    await typeHex(user, screen.getByRole("group", { name: "Action" }), "#2a8556");
    // The key control is traced now; trace the semantic token itself.
    await openDisclosure(user, "Color", "Semantic tokens");
    act(() => {
      screen
        .getByRole("group", { name: "color.action.background" })
        .querySelector("input")
        ?.focus();
    });

    const chain = panel();
    expect(await within(chain).findByText("Custom")).toBeInTheDocument();
    expect(within(chain).getAllByText("#2a8556").length).toBeGreaterThan(0);
    expect(within(chain).queryByRole("link", { name: "color.blue.700" })).toBeNull();
  });
});
