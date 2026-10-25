import { act, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DRAFT_KEY } from "./model/draft.ts";
import { exportTheme } from "./model/dtcg.ts";
import { resolveTheme } from "./model/resolve.ts";
import type { ThemeSource } from "./model/types.ts";
import { themeVars } from "./model/vars.ts";
import { previewProperty, renderCreator, typeHex } from "./theme-creator-test.tsx";

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

const nameField = () => screen.getByRole("textbox", { name: "Theme name" });

describe("theme bar: status and storage (theme-creator R2.7, R3.6, R9.6, R11)", () => {
  it("says what's being edited, unsaved changes and the contrast count, without announcing it (R3.6)", async () => {
    const { user } = await renderCreator();
    const status = screen.getByText(/^New theme/);
    expect(status).toHaveTextContent("New theme from Light · All contrast pairings pass");
    expect(status).not.toHaveAttribute("role");

    await typeHex(user, screen.getByRole("group", { name: "Second accent" }), "#f4f0fd");

    await waitFor(() => {
      expect(status).toHaveTextContent(
        /^New theme from Light · Unsaved changes · \d+ contrast issues?$/,
      );
    });
  });

  it("always says where themes are kept", async () => {
    await renderCreator();

    expect(
      screen.getByText("Themes are saved in this browser. Export one to keep a copy."),
    ).toBeVisible();
  });

  it("restores the draft after a reload, marked as unsaved (R11.1)", async () => {
    const first = await renderCreator();
    await first.user.type(nameField(), "Draft");
    await typeHex(first.user, screen.getByRole("group", { name: "Action" }), "#1e6b45");
    await waitFor(() => {
      expect(localStorage.getItem(DRAFT_KEY)).toContain("#1e6b45");
    });
    first.unmount();

    await renderCreator();

    expect(nameField()).toHaveValue("Draft");
    expect(screen.getByText(/Unsaved changes/)).toBeInTheDocument();
    expect(previewProperty("--color-action-background")).toBe("#1e6b45");
  });

  it("says edits and themes won't last when storage is refused (R9.6, R11.3)", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Storage is disabled", "SecurityError");
    });
    // The store probes storage once, so it gets a fresh copy.
    vi.resetModules();
    const { renderCreator: renderFresh } = await import("./theme-creator-test.tsx");

    await renderFresh();

    expect(screen.getByText(/isn’t allowing storage/)).toHaveTextContent(
      "This browser isn’t allowing storage: saved themes last only while this page is open, and edits won’t survive a reload.",
    );
  });
});

describe("theme bar: export (theme-creator R10.1, R10.2)", () => {
  it("downloads <name>.tokens.json through an object URL, then revokes it", async () => {
    const { user } = await renderCreator();
    await user.type(nameField(), "Ocean Deep");
    await typeHex(user, screen.getByRole("group", { name: "Action" }), "#1e6b45");
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

    await user.click(screen.getByRole("button", { name: "Export" }));

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

  it("copies every custom property as CSS, with the copy buttons' feedback", async () => {
    const { user } = await renderCreator();
    await typeHex(user, screen.getByRole("group", { name: "Action" }), "#1e6b45");
    // After userEvent.setup(), which installs its own clipboard.
    const writeText = vi.fn<(text: string) => Promise<void>>().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });

    await user.click(screen.getByRole("button", { name: "Copy CSS" }));

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
    expect(await screen.findByText("Copied")).toBeInTheDocument();
  });
});

describe("theme bar: import (theme-creator R10.3)", () => {
  const ocean: ThemeSource = {
    base: "dark",
    keys: { radius: 0 },
    overrides: { semantic: {}, component: {} },
  };
  const file = (text: string, name = "ocean.tokens.json") =>
    new File([text], name, { type: "application/json" });
  const fileInput = (container: HTMLElement) => {
    const input = container.querySelector<HTMLInputElement>("input[type='file']");
    if (!input) throw new Error("no file input");
    return input;
  };

  it("loads a valid file into the draft, unsaved, with its name", async () => {
    const { user, container } = await renderCreator();
    const text = JSON.stringify(exportTheme("Ocean", ocean, resolveTheme(ocean)));

    await user.upload(fileInput(container), file(text));

    expect(await screen.findByText(/^Imported Ocean\./)).toHaveAttribute("role", "status");
    expect(nameField()).toHaveValue("Ocean");
    expect(screen.getByRole("slider", { name: "Corner radius" })).toHaveValue("0");
    expect(screen.getByText(/Unsaved changes/)).toBeInTheDocument();
  });

  it("lists an invalid file's problems in an alert and changes nothing", async () => {
    const { user, container } = await renderCreator();
    await user.type(nameField(), "Mine");

    await user.upload(fileInput(container), file('{"color":{"nope":{"$value":1}}}'));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("The file couldn’t be imported:");
    expect(within(alert).getByRole("listitem")).toHaveTextContent(
      "color.nope isn't a token in this site's system",
    );
    expect(nameField()).toHaveValue("Mine");
  });

  it("asks before replacing unsaved changes", async () => {
    const { user, container } = await renderCreator();
    await user.type(nameField(), "Mine");
    const text = JSON.stringify(exportTheme("Ocean", ocean, resolveTheme(ocean)));

    await user.upload(fileInput(container), file(text));
    const confirm = await screen.findByRole("alertdialog", { name: "Import “Ocean”?" });
    expect(nameField()).toHaveValue("Mine");
    await act(async () => {
      await user.click(within(confirm).getByRole("button", { name: "Import" }));
    });

    expect(nameField()).toHaveValue("Ocean");
  });

  it("opens the file picker from the Import button", async () => {
    const { user, container } = await renderCreator();
    const click = vi.spyOn(fileInput(container), "click");

    await user.click(screen.getByRole("button", { name: "Import" }));

    expect(click).toHaveBeenCalledOnce();
  });
});
