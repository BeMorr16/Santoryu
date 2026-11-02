import { screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import buttonStyles from "../../components/shared/button-styles.module.css";
import { resolveTheme } from "./model/resolve.ts";
import { themeVars } from "./model/vars.ts";
import {
  makeChange,
  renderCreator,
  saveNamed,
  toolbarSave,
  typeHex,
} from "./theme-creator-test.tsx";

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

const toolbarControls = ["Discard changes", "Export", "Save as new", "Save"];
/** The toolbar's controls, in DOM order, up to its Save (the Preview bar's Save comes later). */
function controls() {
  const names = screen
    .getAllByRole("button")
    .map((button) => button.textContent)
    .filter((name) => toolbarControls.includes(name));
  return names.slice(0, names.indexOf("Save") + 1);
}

async function saveForest(user: Awaited<ReturnType<typeof renderCreator>>["user"]) {
  await makeChange(user);
  await saveNamed(user, "Forest");
}

async function chooseExport(user: Awaited<ReturnType<typeof renderCreator>>["user"], item: string) {
  await user.click(screen.getByRole("button", { name: "Export" }));
  await user.click(screen.getByRole("menuitem", { name: item }));
}

describe("draft toolbar: status (theme-creator-controls R4.2; theme-creator R3.6)", () => {
  it("says what's being edited, unsaved changes and the contrast count, without announcing it", async () => {
    const { user } = await renderCreator();
    const status = screen.getByText(/^New theme from/);
    expect(status).toHaveTextContent("New theme from Light · All contrast pairings pass");
    expect(status).not.toHaveAttribute("role");
    expect(status.closest("[aria-live]")).toBeNull();

    await typeHex(user, screen.getByRole("group", { name: "Second accent" }), "#f4f0fd");

    await waitFor(() => {
      expect(status).toHaveTextContent(
        /^New theme from Light · Unsaved changes · \d+ contrast issues?$/,
      );
    });
  });

  it("names the saved theme it edits", async () => {
    const { user } = await renderCreator();

    await saveForest(user);

    expect(screen.getByText(/^Editing Forest/)).toHaveTextContent(
      "Editing Forest · All contrast pairings pass",
    );
  });
});

describe("draft toolbar: actions (R4.3–R4.5)", () => {
  it("holds Discard changes, Export and Save, with Save the one primary button", async () => {
    await renderCreator();

    expect(controls()).toEqual(["Discard changes", "Export", "Save"]);
    expect(toolbarSave()).toHaveClass(buttonStyles.primary ?? "");
    for (const name of ["Discard changes", "Export"]) {
      expect(screen.getByRole("button", { name })).not.toHaveClass(buttonStyles.primary ?? "");
    }
  });

  it("adds Save as new before Save only while editing a saved theme", async () => {
    const { user } = await renderCreator();
    expect(screen.queryByRole("button", { name: "Save as new" })).toBeNull();

    await saveForest(user);

    expect(controls()).toEqual(["Discard changes", "Export", "Save as new", "Save"]);
    expect(screen.getByRole("button", { name: "Save as new" })).not.toHaveClass(
      buttonStyles.primary ?? "",
    );
  });

  it("disables Discard changes, with its reason, while there's nothing to discard", async () => {
    const { user } = await renderCreator();
    const discard = screen.getByRole("button", { name: "Discard changes" });
    expect(discard).toHaveAttribute("aria-disabled", "true");
    expect(discard).toHaveAccessibleDescription("No changes to discard");

    await makeChange(user);

    expect(discard).not.toHaveAttribute("aria-disabled");
  });
});

describe("draft toolbar: Export (R4.6; theme-creator R10.1, R10.2)", () => {
  it("offers Download tokens file and Copy CSS", async () => {
    const { user } = await renderCreator();

    await user.click(screen.getByRole("button", { name: "Export" }));

    const menu = screen.getByRole("menu", { name: "Export" });
    expect(
      within(menu)
        .getAllByRole("menuitem")
        .map((item) => item.textContent),
    ).toEqual(["Download tokens file", "Copy CSS"]);
  });

  it("downloads <name>.tokens.json through an object URL, then revokes it", async () => {
    const { user } = await renderCreator();
    await makeChange(user);
    await saveNamed(user, "Ocean Deep");
    const blobs: Blob[] = [];
    const create = vi.spyOn(URL, "createObjectURL").mockImplementation((blob) => {
      blobs.push(blob as Blob);
      return "blob:theme";
    });
    const revoke = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      expect(this.download).toBe("ocean-deep.tokens.json");
      expect(this.href).toBe("blob:theme");
    });

    await chooseExport(user, "Download tokens file");

    expect(create).toHaveBeenCalledOnce();
    expect(click).toHaveBeenCalledOnce();
    await waitFor(() => {
      expect(revoke).toHaveBeenCalledWith("blob:theme");
    });
    expect(blobs[0]?.type).toBe("application/design-tokens+json");
    const file = JSON.parse((await blobs[0]?.text()) ?? "") as {
      $extensions: Record<string, { name: string; keys: { action: string } }>;
    };
    expect(file.$extensions["personal-site.theme"]).toMatchObject({
      name: "Ocean Deep",
      keys: { action: "#1e6b45" },
    });
  });

  it("copies every custom property as CSS, and announces “Copied CSS”", async () => {
    const { user } = await renderCreator();
    await typeHex(user, screen.getByRole("group", { name: "Action" }), "#1e6b45");
    // After userEvent.setup(), which installs its own clipboard.
    const writeText = vi.fn<(text: string) => Promise<void>>().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });

    await chooseExport(user, "Copy CSS");

    const css = writeText.mock.calls[0]?.[0] ?? "";
    const expected = themeVars(
      resolveTheme({
        base: "light",
        keys: { action: "#1e6b45" },
        overrides: { semantic: {}, component: {} },
      }),
      "full",
    );
    expect(css.startsWith(":root {\n  color-scheme: light;\n")).toBe(true);
    for (const [name, value] of Object.entries(expected))
      expect(css).toContain(`  ${name}: ${value};\n`);
    expect(await screen.findByText("Copied CSS")).toHaveAttribute("role", "status");
  });

  it("announces a failure to copy", async () => {
    const { user } = await renderCreator();
    const writeText = vi
      .fn<(text: string) => Promise<void>>()
      .mockRejectedValue(new DOMException("Denied", "NotAllowedError"));
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });

    await chooseExport(user, "Copy CSS");

    expect(await screen.findByText("Couldn’t copy CSS")).toHaveAttribute("role", "status");
  });

  it("announces a repeat again: the notice is emptied, then filled (R6.3)", async () => {
    const { user } = await renderCreator();
    const writeText = vi.fn<(text: string) => Promise<void>>().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    await chooseExport(user, "Copy CSS");
    const notice = await screen.findByText("Copied CSS");

    const records: MutationRecord[] = [];
    const observer = new MutationObserver((list) => {
      records.push(...list);
    });
    observer.observe(notice, { childList: true, characterData: true, subtree: true });
    await chooseExport(user, "Copy CSS");
    await waitFor(() => {
      expect(writeText).toHaveBeenCalledTimes(2);
    });
    observer.disconnect();

    expect(records.some(({ removedNodes }) => removedNodes.length > 0)).toBe(true);
    expect(records.some(({ addedNodes }) => addedNodes.length > 0)).toBe(true);
    expect(notice).toHaveTextContent("Copied CSS");
  });
});
