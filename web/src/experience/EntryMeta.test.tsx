import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { experienceContent } from "../content/experience.ts";
import { EntryMeta } from "./EntryMeta.tsx";

const times = (container: HTMLElement) => [...container.querySelectorAll("time")];

describe("EntryMeta (resume R4.2; experience-skills R2.2)", () => {
  it("shows the start in a <time>, then Present when there's no end", () => {
    const { container } = render(<EntryMeta start="2025-04" extras={[]} />);

    expect(times(container).map((time) => time.getAttribute("datetime"))).toEqual(["2025-04"]);
    expect(container).toHaveTextContent(`Apr 2025 – ${experienceContent.present}`);
  });

  it("shows both dates in yyyy-mm <time>s", () => {
    const { container } = render(<EntryMeta start="2023-01" end="2024-12" extras={[]} />);

    expect(times(container).map((time) => time.getAttribute("datetime"))).toEqual([
      "2023-01",
      "2024-12",
    ]);
    expect(times(container).map((time) => time.textContent)).toEqual(["Jan 2023", "Dec 2024"]);
  });

  it("joins the extras after the dates with middle dots", () => {
    const { container } = render(
      <EntryMeta start="2023-01" end="2024-12" extras={["Remote", "Part-time"]} />,
    );

    expect(container.textContent).toBe("Jan 2023 – Dec 2024 · Remote · Part-time");
  });

  it("adds nothing after the dates with no extras", () => {
    const { container } = render(<EntryMeta start="2023-01" end="2024-12" extras={[]} />);

    expect(container.textContent).toBe("Jan 2023 – Dec 2024");
  });
});
