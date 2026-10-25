// Test support for the theme creator's tests (not a test file itself).
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { ThemeCreator } from "./ThemeCreator.tsx";

/**
 * Renders the editor in a router and a main, as the page does after hydration. jsdom has no media
 * queries, so the aside is in its narrow state; it's opened with "Show preview" unless asked not to.
 */
export async function renderCreator({ preview = true }: { preview?: boolean } = {}) {
  const user = userEvent.setup();
  const result = render(
    <MemoryRouter>
      <main>
        <ThemeCreator />
      </main>
    </MemoryRouter>,
  );
  if (preview) await user.click(screen.getByRole("button", { name: "Show preview" }));
  return { user, ...result };
}

/** The preview's themed page: where the draft's scheme and properties are set (R7.1). */
export function previewPage(): HTMLElement {
  const page = screen
    .getByRole("region", { name: "Preview" })
    .querySelector<HTMLElement>("[data-theme]");
  if (!page) throw new Error("no preview page");
  return page;
}

/** A custom property the preview sets inline, or "" when it's the built-in theme's. */
export const previewProperty = (name: string) => previewPage().style.getPropertyValue(name);

/** An editor section, by its h2. */
export const section = (name: string) => screen.getByRole("region", { name });

/** Opens a section's semantic or component disclosure. */
export async function openDisclosure(
  user: ReturnType<typeof userEvent.setup>,
  sectionName: string,
  label: "Semantic tokens" | "Component tokens",
) {
  await user.click(
    within(section(sectionName)).getByRole("button", { name: new RegExp(`^${label} \\(`) }),
  );
}

/** Replaces a ColorField's hex text, which commits as soon as it parses. */
export async function typeHex(
  user: ReturnType<typeof userEvent.setup>,
  group: HTMLElement,
  hex: string,
) {
  const field = within(group).getByRole("textbox", { name: "Hex" });
  await user.clear(field);
  await user.type(field, hex);
}
