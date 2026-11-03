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

/**
 * The toolbar's Save. jsdom has no media queries, so the narrow Preview bar's Save is there too,
 * after it in the DOM.
 */
export function toolbarSave(): HTMLElement {
  const [save] = screen.getAllByRole("button", { name: "Save" });
  if (!save) throw new Error("no Save button");
  return save;
}

/** The name dialog that Save opens for a theme that isn't saved yet. */
export const saveDialog = () => screen.getByRole("dialog", { name: "Save theme" });

/** Presses the toolbar's Save, then names the new theme in its dialog and saves it. */
export async function saveNamed(user: ReturnType<typeof userEvent.setup>, name: string) {
  await user.click(toolbarSave());
  const dialog = saveDialog();
  const field = within(dialog).getByRole("textbox", { name: "Theme name" });
  await user.clear(field);
  await user.type(field, name);
  await user.click(within(dialog).getByRole("button", { name: "Save" }));
}

/** The name Save proposes for a theme that isn't saved yet: read from its dialog, then canceled. */
export async function proposedName(user: ReturnType<typeof userEvent.setup>) {
  await user.click(toolbarSave());
  const dialog = saveDialog();
  const value = within(dialog).getByRole<HTMLInputElement>("textbox", { name: "Theme name" }).value;
  await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
  return value;
}

/** Gives the draft an unsaved change, through the Action color. */
export async function makeChange(user: ReturnType<typeof userEvent.setup>, hex = "#1e6b45") {
  await typeHex(user, screen.getByRole("group", { name: "Action" }), hex);
}

/** Chooses an item from the New theme menu. */
export async function newTheme(user: ReturnType<typeof userEvent.setup>, item: string) {
  await user.click(screen.getByRole("button", { name: "New theme" }));
  await user.click(screen.getByRole("menuitem", { name: item }));
}

/** Chooses an item from a saved theme's card menu. */
export async function cardAction(
  user: ReturnType<typeof userEvent.setup>,
  theme: string,
  item: string,
) {
  await user.click(screen.getByRole("button", { name: `More actions for ${theme}` }));
  await user.click(screen.getByRole("menuitem", { name: item }));
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
