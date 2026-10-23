import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { expectNoAxeViolations } from "../../../test/axe.ts";
import { expectHydratesCleanly } from "../../../test/component.tsx";
import hiddenStyles from "../VisuallyHidden/VisuallyHidden.module.css";
import { Slider, sliderValueText } from "./Slider.tsx";

const px = (value: number) => `${String(value)}px`;
const densityMarks = [
  { value: 3, label: "Compact" },
  { value: 4, label: "Default" },
  { value: 5, label: "Roomy" },
];

describe("Slider (theme-creator R13)", () => {
  it("is a native range input named by its visible, associated label (R13.1, R13.2)", () => {
    render(<Slider label="Corner radius" defaultValue={4} min={0} max={24} />);

    const slider = screen.getByRole("slider", { name: "Corner radius" });
    expect(slider.tagName).toBe("INPUT");
    expect(slider).toHaveAttribute("type", "range");
    expect(slider).toHaveAttribute("min", "0");
    expect(slider).toHaveAttribute("max", "24");
    expect(slider).toHaveAttribute("step", "1");
    const label = screen.getByText("Corner radius");
    expect(label.tagName).toBe("LABEL");
    expect(label).toHaveAttribute("for", slider.id);
    expect(label).toBeVisible();
  });

  it("keeps a hidden label as the name, and its value text visible", () => {
    render(<Slider label="Volume" hideLabel defaultValue={30} />);

    expect(screen.getByRole("slider", { name: "Volume" })).toBeInTheDocument();
    expect(screen.getByText("Volume").parentElement).toHaveClass(hiddenStyles.root ?? "");
    expect(screen.getByText("30")).toBeVisible();
  });

  it("is described by its hint", () => {
    render(<Slider label="Type scale" hint="How much larger headings are than body text." />);

    expect(screen.getByRole("slider")).toHaveAccessibleDescription(
      "How much larger headings are than body text.",
    );
  });

  it("shows its value as text through formatValue, which also gives aria-valuetext (R13.3)", () => {
    render(<Slider label="Corner radius" defaultValue={4} min={0} max={24} formatValue={px} />);

    expect(screen.getByText("4px")).toBeVisible();
    expect(screen.getByRole("slider")).toHaveAttribute("aria-valuetext", "4px");
  });

  it("starts at the native default, half way, when uncontrolled with no defaultValue", () => {
    render(<Slider label="Level" min={0} max={10} />);

    expect(screen.getByRole("slider")).toHaveValue("5");
    expect(screen.getByText("5")).toBeVisible();
  });

  it("leads its value text with a mark's label on a mark, and shows the marks (R13.4)", async () => {
    const user = userEvent.setup();
    render(
      <Slider
        label="Density"
        defaultValue={4}
        min={3}
        max={5}
        step={0.5}
        formatValue={px}
        marks={densityMarks}
      />,
    );
    const slider = screen.getByRole("slider", { name: "Density" });

    expect(slider).toHaveAttribute("aria-valuetext", "Default, 4px");
    expect(screen.getByText("4px")).toBeVisible();
    const marks = screen.getByText("Compact").closest("ul");
    expect(marks).toHaveAttribute("aria-hidden", "true");
    expect(marks?.textContent).toBe("CompactDefaultRoomy");

    slider.focus();
    await user.keyboard("{ArrowRight}");
    expect(slider).toHaveAttribute("aria-valuetext", "4.5px");
  });

  it("builds value text from a format and marks", () => {
    expect(sliderValueText(4, px, densityMarks)).toBe("Default, 4px");
    expect(sliderValueText(4.5, px, densityMarks)).toBe("4.5px");
    expect(sliderValueText(4, px)).toBe("4px");
  });

  it("moves with Arrow keys, Home and End, reporting each value (R13.5)", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    const onChange = vi.fn();
    render(
      <Slider
        label="Border width"
        defaultValue={2}
        min={1}
        max={4}
        onValueChange={onValueChange}
        onChange={onChange}
      />,
    );
    const slider = screen.getByRole("slider");
    slider.focus();

    await user.keyboard("{ArrowRight}");
    expect(slider).toHaveValue("3");
    await user.keyboard("{ArrowLeft}{ArrowLeft}");
    expect(slider).toHaveValue("1");
    await user.keyboard("{End}");
    expect(slider).toHaveValue("4");
    await user.keyboard("{Home}");
    expect(slider).toHaveValue("1");

    expect(onValueChange.mock.calls).toEqual([[3], [2], [1], [4], [1]]);
    expect(onChange).toHaveBeenCalledTimes(5);
    expect(screen.getByText("1")).toBeVisible();
  });

  it("works controlled, its value text following `value`", async () => {
    const user = userEvent.setup();
    function Controlled() {
      const [value, setValue] = useState(10);
      return (
        <Slider
          label="Scale"
          value={value}
          onValueChange={setValue}
          formatValue={(v) => `${String(v)}%`}
        />
      );
    }
    render(<Controlled />);
    const slider = screen.getByRole("slider");
    slider.focus();

    await user.keyboard("{ArrowUp}");

    expect(slider).toHaveValue("11");
    expect(screen.getByText("11%")).toBeVisible();
    expect(slider).toHaveAttribute("aria-valuetext", "11%");
  });

  it("uses native disabled, which doesn't move", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Slider label="Locked" defaultValue={5} disabled onValueChange={onValueChange} />);
    const slider = screen.getByRole("slider");

    expect(slider).toBeDisabled();
    slider.focus();
    await user.keyboard("{ArrowRight}");
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("passes the ref and native props to the input, and className and style to the wrapper", () => {
    const ref = createRef<HTMLInputElement>();
    const { container } = render(
      <Slider label="Name" name="radius" ref={ref} className="extra" style={{ marginTop: 0 }} />,
    );
    const slider = screen.getByRole("slider");

    expect(ref.current).toBe(slider);
    expect(slider).toHaveAttribute("name", "radius");
    expect(container.firstElementChild).toHaveClass("extra");
    expect(container.firstElementChild).toHaveStyle({ marginTop: "0px" });
  });

  it("hydrates cleanly", () => {
    expectHydratesCleanly(
      <Slider label="Density" defaultValue={4} min={3} max={5} marks={densityMarks} />,
    );
  });

  it("has no axe violations, with a hint, marks, a hidden label, or disabled", async () => {
    const { container } = render(
      <>
        <Slider label="Radius" hint="Corner radius in pixels." formatValue={px} />
        <Slider label="Density" min={3} max={5} marks={densityMarks} />
        <Slider label="Volume" hideLabel />
        <Slider label="Locked" disabled />
      </>,
    );

    await expectNoAxeViolations(container);
  });
});
