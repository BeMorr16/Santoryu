import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  emailPattern,
  emptyValues,
  fieldError,
  firstInvalidField,
  limits,
  trimmed,
  validate,
  type Field,
  type FormValues,
} from "./model.ts";

type Value = string | { prefix?: string; repeat: string; times: number; suffix?: string };

const contract = JSON.parse(
  readFileSync(
    new URL("../../../services/contact/contract/validation-cases.json", import.meta.url),
    "utf8",
  ),
) as {
  limits: Record<Field, number>;
  emailPattern: string;
  base: FormValues;
  cases: {
    description: string;
    input: Partial<Record<Field, Value>>;
    errors: Record<string, string>;
    trimmed?: Partial<FormValues>;
  }[];
};

function expand(value: Value): string {
  if (typeof value === "string") return value;
  return (value.prefix ?? "") + value.repeat.repeat(value.times) + (value.suffix ?? "");
}

function valuesFrom(input: Partial<Record<Field, Value>>): FormValues {
  const values = { ...contract.base };
  for (const [field, value] of Object.entries(input)) {
    values[field as Field] = expand(value);
  }
  return values;
}

describe("the shared validation cases (R2.6)", () => {
  it.each(contract.cases)("$description", ({ input, errors, trimmed: expected }) => {
    const values = valuesFrom(input);

    expect(validate(values)).toEqual(errors);
    if (expected) expect(trimmed(values)).toMatchObject(expected);
  });

  it("uses the contract's limits and email rule", () => {
    expect(limits).toEqual(contract.limits);
    expect(emailPattern.source).toBe(contract.emailPattern);
  });
});

describe("the helpers", () => {
  it("requires name, email and message on an empty form, in field order (R2.1)", () => {
    const errors = validate(emptyValues);

    expect(errors).toEqual({ name: "missing", email: "missing", message: "missing" });
    expect(firstInvalidField(errors)).toBe("name");
  });

  it("finds the first invalid field by form order, not by error order", () => {
    expect(firstInvalidField({ message: "missing", email: "invalid" })).toBe("email");
    expect(firstInvalidField({})).toBeUndefined();
  });

  it("checks a single field, trimming first", () => {
    expect(fieldError("name", "   ")).toBe("missing");
    expect(fieldError("name", " Ada ")).toBeUndefined();
    expect(fieldError("subject", "")).toBeUndefined();
  });
});
