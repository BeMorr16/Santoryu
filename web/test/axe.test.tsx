import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "./axe.ts";

describe("expectNoAxeViolations", () => {
  it("fails on an image with no alt text, naming the rule and target", async () => {
    const container = document.createElement("div");
    const image = document.createElement("img");
    image.src = "/x.png";
    container.append(image);
    document.body.append(container);

    await expect(expectNoAxeViolations(container)).rejects.toThrow(/image-alt: img/);
    container.remove();
  });

  it("passes on accessible markup", async () => {
    const { container } = render(
      <main>
        <img src="/x.png" alt="A diagram" />
        <button type="button">Save</button>
      </main>,
    );

    await expect(expectNoAxeViolations(container)).resolves.toBeUndefined();
  });
});
