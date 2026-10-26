import { describe, expect, it } from "vitest";
import { homeContent, homeTitle, principles, workCards } from "./home.ts";

describe("home content (home R1.4)", () => {
  it("keeps the meta description within 160 characters (R6.3)", () => {
    expect(homeContent.description.length).toBeLessThanOrEqual(160);
  });

  it("titles Home with the name and role (R6.2)", () => {
    expect(homeTitle).toBe("Ben Morrison · Full Stack Software Engineer");
  });

  it("gives every work card and principle a unique id", () => {
    expect(new Set(workCards.map((card) => card.id)).size).toBe(workCards.length);
    expect(new Set(principles.map((principle) => principle.id)).size).toBe(principles.length);
  });

  it("has exactly one placeholder work card, Experience (R3.2)", () => {
    const placeholders = workCards.filter((card) => !("href" in card));
    expect(placeholders.map((card) => card.title)).toEqual(["Experience"]);
  });
});
