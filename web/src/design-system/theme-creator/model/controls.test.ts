import { describe, expect, it } from "vitest";
import { semanticTokens } from "../../../tokens/metadata.ts";
import {
  componentOptions,
  inputProblem,
  keyRanges,
  sectionComponents,
  sectionOf,
  sectionSemantics,
  semanticControl,
} from "./controls.ts";

describe("controls (theme-creator R6.1, R6.2; design §8.4)", () => {
  it("puts every color, type, space and radius semantic, and the border width, in a section", () => {
    const listed = Object.values(sectionSemantics).flatMap((tokens) =>
      tokens.map(({ name }) => name),
    );
    const editable = semanticTokens
      .map(({ name }) => name)
      .filter(
        (name) => /^(color|type|space|radius)\./.test(name) || name === "effect.border.width",
      );

    expect(listed.toSorted()).toEqual(editable.toSorted());
    expect(sectionOf("motion.duration.base")).toBeNull();
    expect(sectionOf("size.control.md")).toBeNull();
    expect(sectionOf("effect.border.width-thick")).toBeNull();
  });

  it("gives every editable semantic a control, read-only only for no fill and the pill radius", () => {
    const controls = Object.values(sectionSemantics)
      .flat()
      .map(({ name }) => [name, semanticControl(name).kind] as const);

    expect(controls.filter(([, kind]) => kind === "readonly").map(([name]) => name)).toEqual([
      "color.fill.none",
      "radius.pill",
    ]);
  });

  it.each([
    ["color.text.default", { kind: "color" }],
    ["type.size.h1", { kind: "dimension", unit: "rem", min: 0.625, max: 6, step: 0.0625 }],
    ["type.family.body", { kind: "font" }],
    ["type.weight.body", { kind: "number", min: 100, max: 900, step: 100 }],
    ["type.leading.body", { kind: "number", min: 1, max: 2.5, step: 0.05 }],
    ["type.tracking.label", { kind: "number", unit: "em", min: -0.1, max: 0.3, step: 0.01 }],
    ["type.measure.text", { kind: "dimension", unit: "ch", min: 40, max: 90, step: 1 }],
    ["space.inset.md", { kind: "dimension", unit: "rem", min: 0, max: 8, step: 0.0625 }],
    ["radius.control", { kind: "dimension", unit: "px", min: 0, max: 48, step: 1 }],
    ["effect.border.width", { kind: "dimension", unit: "px", min: 0.5, max: 4, step: 0.5 }],
  ])("gives %s the design's control and limits", (token, control) => {
    expect(semanticControl(token)).toEqual(control);
  });

  it("starts every built-in value inside its control's limits", () => {
    for (const token of Object.values(sectionSemantics).flat()) {
      for (const value of Object.values(token.values)) {
        const control = semanticControl(token.name);
        if (control.kind !== "dimension" && control.kind !== "number") continue;
        const number = Number.parseFloat(value.css);
        expect(number, token.name).toBeGreaterThanOrEqual(control.min);
        expect(number, token.name).toBeLessThanOrEqual(control.max);
      }
    }
  });

  it("lists component tokens by the section of the semantic they alias", () => {
    expect(sectionComponents.color.map(({ name }) => name)).toContain(
      "component.button.primary.background",
    );
    expect(sectionComponents.spacing.map(({ name }) => name)).toContain("component.button.gap");
    expect(sectionComponents.shape.map(({ name }) => name)).toContain("component.button.radius");
    const listed = Object.values(sectionComponents).flatMap((tokens) =>
      tokens.map(({ name }) => name),
    );
    expect(listed).not.toContain("component.button.height.md");
  });

  it("offers every opaque color semantic to a color token, and its own alias", () => {
    const options = componentOptions("component.button.primary.background");
    const opaque = sectionSemantics.color
      .filter(({ values }) => Object.values(values).every((value) => (value.alpha ?? 1) === 1))
      .map(({ name }) => name);

    expect(options).toEqual(opaque);
    expect(componentOptions("component.button.ghost.background")).toContain("color.fill.none");
    expect(componentOptions("component.button.primary.background")).not.toContain(
      "color.surface.glass",
    );
  });

  it("offers other tokens only the editable semantics in the same category.group", () => {
    expect(componentOptions("component.button.gap")).toEqual([
      "space.inline.xs",
      "space.inline.sm",
      "space.inline.md",
      "space.inline.lg",
      "space.inline.xl",
    ]);
    expect(componentOptions("component.button.font-size.md")).toEqual(
      sectionSemantics.typography
        .filter(({ name }) => name.startsWith("type.size."))
        .map(({ name }) => name),
    );
    expect(componentOptions("component.button.radius")).toEqual([
      "radius.control",
      "radius.surface",
    ]);
  });

  it("leaves a token with one option read-only: the border width, and non-editable aliases", () => {
    expect(componentOptions("component.button.border-width")).toEqual(["effect.border.width"]);
    expect(componentOptions("component.button.height.md")).toEqual(["size.control.md"]);
    expect(componentOptions("component.nope")).toEqual([]);
  });

  it("sets the key controls' ranges", () => {
    expect(keyRanges).toEqual({
      typeScale: { min: 0.75, max: 1.5, step: 0.05 },
      radius: { min: 0, max: 24, step: 1 },
      borderWidth: { min: 1, max: 4, step: 1 },
      density: { min: 0.1875, max: 0.3125, step: 0.0125 },
    });
  });

  it("explains a value a token can't take", () => {
    expect(
      inputProblem("space.inset.md", { kind: "dimension", value: 1, unit: "rem" }),
    ).toBeUndefined();
    expect(inputProblem("space.inset.md", { kind: "dimension", value: 9, unit: "rem" })).toBe(
      "space.inset.md must be from 0rem to 8rem",
    );
    expect(inputProblem("space.inset.md", { kind: "dimension", value: 1, unit: "px" })).toBe(
      "space.inset.md needs a value in rem",
    );
    expect(inputProblem("space.inset.md", { kind: "color", hex: "#000000" })).toBe(
      "space.inset.md needs a dimension value",
    );
    expect(inputProblem("radius.pill", { kind: "dimension", value: 1, unit: "px" })).toBe(
      "radius.pill can't be edited",
    );
    expect(inputProblem("color.nope", { kind: "color", hex: "#000000" })).toBe(
      "color.nope isn't a semantic token",
    );
    expect(inputProblem("type.weight.body", { kind: "number", value: Number.NaN })).toMatch(
      /must be from 100 to 900/,
    );
  });
});
