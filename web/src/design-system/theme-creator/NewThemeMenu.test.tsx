import { act, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { exportTheme } from "./model/dtcg.ts";
import { resolveTheme } from "./model/resolve.ts";
import type { ThemeSource } from "./model/types.ts";
import {
  makeChange,
  newTheme,
  proposedName,
  renderCreator,
  saveNamed,
} from "./theme-creator-test.tsx";

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

const actionHex = () =>
  within(screen.getByRole("group", { name: "Action" })).getByRole("textbox", { name: "Hex" });

describe("New theme menu (theme-creator-controls R3)", () => {
  it("offers Light, Dark │ the presets │ Import file…, and no saved themes", async () => {
    const { user } = await renderCreator();
    await makeChange(user);
    await saveNamed(user, "Forest");

    await user.click(screen.getByRole("button", { name: "New theme" }));

    const menu = screen.getByRole("menu", { name: "New theme" });
    expect(
      [...menu.querySelectorAll("[role='menuitem'], [role='separator']")].map((item) =>
        item.getAttribute("role") === "separator" ? "│" : item.textContent,
      ),
    ).toEqual(["Light", "Dark", "│", "High contrast", "Soft", "Compact", "│", "Import file…"]);
  });

  it.each([
    ["Dark", "dark"],
    ["Compact", "dark"],
    ["Soft", "light"],
  ])("starts a new, unsaved draft from %s", async (item, scheme) => {
    const { user } = await renderCreator();

    await newTheme(user, item);

    expect(screen.getByText(new RegExp(`^New theme from ${item} · All contrast`))).toBeVisible();
    expect(screen.getByText(`Started from ${item}`)).toHaveAttribute("role", "status");
    expect(
      screen.getByRole("region", { name: "Preview" }).querySelector("[data-theme]"),
    ).toHaveAttribute("data-theme", scheme);
    expect(await proposedName(user)).toBe("");
  });

  it("confirms before replacing unsaved changes, and Keep editing keeps them", async () => {
    const { user } = await renderCreator();
    await makeChange(user);

    await newTheme(user, "Dark");
    const confirm = screen.getByRole("alertdialog", { name: "Start from Dark?" });
    expect(within(confirm).getByRole("button", { name: "Keep editing" })).toHaveFocus();
    await user.click(within(confirm).getByRole("button", { name: "Keep editing" }));

    expect(actionHex()).toHaveValue("#1e6b45");
    expect(screen.getByText(/^New theme from Light · Unsaved changes/)).toBeInTheDocument();
  });
});

describe("New theme → Import file… (theme-creator R10.3; theme-creator-controls R3.3)", () => {
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

  it("opens the file picker", async () => {
    const { user, container } = await renderCreator();
    const click = vi.spyOn(fileInput(container), "click");

    await newTheme(user, "Import file…");

    expect(click).toHaveBeenCalledOnce();
  });

  it("keeps the file input out of the Tab order and the accessibility tree", async () => {
    const { container } = await renderCreator();

    expect(fileInput(container)).toHaveAttribute("tabindex", "-1");
    expect(fileInput(container)).toHaveAttribute("aria-hidden", "true");
  });

  it("loads a valid file into the draft, unsaved, with its name", async () => {
    const { user, container } = await renderCreator();
    const text = JSON.stringify(exportTheme("Ocean", ocean, resolveTheme(ocean)));

    await user.upload(fileInput(container), file(text));

    expect(await screen.findByText(/^Imported Ocean\./)).toHaveAttribute("role", "status");
    expect(screen.getByRole("slider", { name: "Corner radius" })).toHaveValue("0");
    expect(screen.getByText(/Unsaved changes/)).toBeInTheDocument();
    expect(await proposedName(user)).toBe("Ocean");
  });

  it("lists an invalid file's problems in an alert in the library, and changes nothing", async () => {
    const { user, container } = await renderCreator();
    await makeChange(user);

    await user.upload(fileInput(container), file('{"color":{"nope":{"$value":1}}}'));

    const alert = await screen.findByRole("alert");
    expect(screen.getByRole("region", { name: "Your themes" })).toContainElement(alert);
    expect(alert).toHaveTextContent("The file couldn’t be imported:");
    expect(within(alert).getByRole("listitem")).toHaveTextContent(
      "color.nope isn't a token in this site's system",
    );
    expect(actionHex()).toHaveValue("#1e6b45");
  });

  it("refuses a file over 1 MB", async () => {
    const { user, container } = await renderCreator();

    await user.upload(fileInput(container), file("x".repeat(1024 * 1024 + 1)));

    expect(await screen.findByRole("alert")).toHaveTextContent("The file is larger than 1 MB.");
  });

  it("asks before replacing unsaved changes", async () => {
    const { user, container } = await renderCreator();
    await makeChange(user);
    const text = JSON.stringify(exportTheme("Ocean", ocean, resolveTheme(ocean)));

    await user.upload(fileInput(container), file(text));
    const confirm = await screen.findByRole("alertdialog", { name: "Import “Ocean”?" });
    expect(actionHex()).toHaveValue("#1e6b45");
    await act(async () => {
      await user.click(within(confirm).getByRole("button", { name: "Import" }));
    });

    expect(screen.getByRole("slider", { name: "Corner radius" })).toHaveValue("0");
    expect(await proposedName(user)).toBe("Ocean");
  });
});
