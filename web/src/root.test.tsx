import { render, screen, within } from "@testing-library/react";
import { createRoutesStub } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { ErrorBoundary } from "./root.tsx";

describe("root ErrorBoundary", () => {
  it("renders a Something went wrong page inside the site shell", async () => {
    // React logs the thrown error; keep the test output readable.
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const Stub = createRoutesStub([
      {
        path: "/",
        Component: () => {
          throw new Error("boom");
        },
        ErrorBoundary,
      },
    ]);

    render(<Stub initialEntries={["/"]} />);

    expect(
      await screen.findByRole("heading", { level: 1, name: "Something went wrong" }),
    ).toBeVisible();
    expect(screen.getByRole("main")).toHaveTextContent("An unexpected error occurred.");
    expect(
      within(screen.getByRole("banner")).getByRole("link", { name: "BM, Ben Morrison, home" }),
    ).toBeInTheDocument();
    vi.restoreAllMocks();
  });
});
