import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { expectNoAxeViolations } from "../../../test/axe.ts";
import { expectHydratesCleanly } from "../../../test/component.tsx";
import { ColorField, parseHex, type Hex } from "./ColorField.tsx";

const swatches = [
  { value: "#185480", name: "Blue 700" },
  { value: "#d4a447", name: "Gold 500" },
] as const;

/** The color picker: a native color input, named by the legend. */
const picker = (name: string) => {
  const input = screen.getByLabelText(name, { selector: "input" });
  expect(input).toHaveAttribute("type", "color");
  return input as HTMLInputElement;
};

describe("parseHex (theme-creator R14.3)", () => {
  it.each([
    ["#abc", "#aabbcc"],
    ["ABC", "#aabbcc"],
    ["#a1b2c3", "#a1b2c3"],
    ["a1b2c3", "#a1b2c3"],
    ["  #A1B2C3 ", "#a1b2c3"],
  ])("reads %j as %s", (text, hex) => {
    expect(parseHex(text)).toBe(hex);
  });

  it.each(["#ab", "#ggg", "red", "", "#abcd", "##abc", "#a1b2c3d4"])("rejects %j", (text) => {
    expect(parseHex(text)).toBeNull();
  });
});

describe("ColorField (theme-creator R14)", () => {
  it("names the group and the picker with its legend, and the hex field Hex (R14.2)", () => {
    render(<ColorField label="Action" defaultValue="#185480" hint="Buttons and links." />);

    const group = screen.getByRole("group", { name: "Action" });
    expect(group.tagName).toBe("FIELDSET");
    expect(group).toHaveAccessibleDescription("Buttons and links.");
    expect(picker("Action")).toHaveValue("#185480");
    expect(within(group).getByRole("textbox", { name: "Hex" })).toHaveValue("#185480");
  });

  it("keeps the picker and the hex text in sync both ways (R14.2)", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<ColorField label="Accent" defaultValue="#185480" onValueChange={onValueChange} />);
    const hex = screen.getByRole("textbox", { name: "Hex" });

    fireEvent.input(picker("Accent"), { target: { value: "#d4a447" } });
    expect(hex).toHaveValue("#d4a447");

    await user.clear(hex);
    await user.type(hex, "#123");
    expect(picker("Accent")).toHaveValue("#112233");
    expect(hex).toHaveValue("#123");

    expect(onValueChange.mock.calls).toEqual([["#d4a447"], ["#112233"]]);
  });

  it("commits each time the typed text parses (R14.3)", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<ColorField label="Accent" defaultValue="#000000" onValueChange={onValueChange} />);
    const hex = screen.getByRole("textbox", { name: "Hex" });

    await user.clear(hex);
    await user.type(hex, "a1b2c3");

    // "a1b" parses on the way to "a1b2c3".
    expect(onValueChange.mock.calls).toEqual([["#aa11bb"], ["#a1b2c3"]]);
    expect(picker("Accent")).toHaveValue("#a1b2c3");
  });

  it("shows an error on blur with invalid text, keeping the last valid value (R14.3)", async () => {
    const user = userEvent.setup();
    render(<ColorField label="Accent" defaultValue="#185480" />);
    const hex = screen.getByRole("textbox", { name: "Hex" });

    await user.clear(hex);
    await user.type(hex, "#12");
    expect(hex).toBeValid();
    await user.tab();

    expect(hex).toBeInvalid();
    expect(hex).toHaveAccessibleDescription("Enter a hex color, like #1a4d80.");
    expect(hex).toHaveValue("#12");
    expect(picker("Accent")).toHaveValue("#185480");

    await user.type(hex, "3");
    expect(hex).toBeValid();
    expect(picker("Accent")).toHaveValue("#112233");
  });

  it("replaces typed text when the value changes elsewhere", async () => {
    const user = userEvent.setup();
    render(<ColorField label="Accent" defaultValue="#185480" swatches={swatches} />);
    const hex = screen.getByRole("textbox", { name: "Hex" });

    await user.clear(hex);
    await user.type(hex, "#zz");
    await user.click(screen.getByRole("button", { name: "Gold 500" }));

    expect(hex).toHaveValue("#d4a447");
    expect(hex).toBeValid();
  });

  it("names its swatches, and presses the one matching the value (R14.4)", async () => {
    const user = userEvent.setup();
    render(<ColorField label="Action" defaultValue="#185480" swatches={swatches} />);

    const group = screen.getByRole("group", { name: "Suggested colors" });
    const blue = within(group).getByRole("button", { name: "Blue 700" });
    const gold = within(group).getByRole("button", { name: "Gold 500" });
    expect(blue).toHaveAttribute("aria-pressed", "true");
    expect(gold).toHaveAttribute("aria-pressed", "false");
    expect(blue).toHaveAccessibleDescription("#185480");

    await user.click(gold);
    expect(gold).toHaveAttribute("aria-pressed", "true");
    expect(blue).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("textbox", { name: "Hex" })).toHaveValue("#d4a447");
  });

  it("labels the swatch group with swatchesLabel", () => {
    render(<ColorField label="Action" swatches={swatches} swatchesLabel="Blue ramp" />);

    expect(screen.getByRole("group", { name: "Blue ramp" })).toBeInTheDocument();
  });

  it("works controlled", async () => {
    const user = userEvent.setup();
    function Controlled() {
      const [value, setValue] = useState<Hex>("#185480");
      return (
        <>
          <ColorField label="Action" value={value} onValueChange={setValue} swatches={swatches} />
          <output>{value}</output>
        </>
      );
    }
    render(<Controlled />);

    await user.click(screen.getByRole("button", { name: "Gold 500" }));

    expect(screen.getByRole("status")).toHaveTextContent("#d4a447");
    expect(picker("Action")).toHaveValue("#d4a447");
  });

  it("disables the picker, the hex field and the swatches together", () => {
    render(<ColorField label="Action" swatches={swatches} disabled />);

    expect(screen.getByRole("group", { name: "Action" })).toBeDisabled();
    expect(picker("Action")).toBeDisabled();
    expect(screen.getByRole("textbox", { name: "Hex" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Blue 700" })).toBeDisabled();
  });

  it("puts className and native props on the fieldset", () => {
    render(<ColorField label="Action" className="extra" data-testid="field" />);

    const group = screen.getByRole("group", { name: "Action" });
    expect(group).toHaveClass("extra");
    expect(group).toHaveAttribute("data-testid", "field");
  });

  // Without swatches: each swatch's tooltip anchors itself after hydration, as Button's does.
  it("hydrates cleanly", () => {
    expectHydratesCleanly(<ColorField label="Action" defaultValue="#185480" hint="Buttons." />);
  });

  it("has no axe violations, with a hint, swatches, an error or disabled", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <>
        <ColorField label="Action" hint="Buttons and links." swatches={swatches} />
        <ColorField label="Accent" />
        <ColorField label="Locked" disabled />
      </>,
    );
    const [hex] = screen.getAllByRole("textbox", { name: "Hex" });
    if (!hex) throw new Error("no hex field");
    await user.clear(hex);
    await user.type(hex, "x");
    await user.tab();

    await expectNoAxeViolations(container);
  });
});
