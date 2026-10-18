import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { expectNoAxeViolations } from "../../../test/axe.ts";
import { expectHydratesCleanly } from "../../../test/component.tsx";
import { Menu, MenuItem, MenuPopup, MenuRadioGroup, MenuRadioItem, MenuTrigger } from "./Menu.tsx";

function Fixture({
  onDownload = vi.fn(),
  onDelete = vi.fn(),
  defaultValue = "light" as string | null,
}) {
  return (
    <>
      <button type="button">Before</button>
      <Menu>
        <MenuTrigger>Options</MenuTrigger>
        <MenuPopup>
          <MenuRadioGroup label="Theme" defaultValue={defaultValue ?? undefined}>
            <MenuRadioItem value="system">System</MenuRadioItem>
            <MenuRadioItem value="light" icon="sun">
              Light
            </MenuRadioItem>
            <MenuRadioItem value="dark">Dark</MenuRadioItem>
          </MenuRadioGroup>
          <MenuItem onSelect={onDownload}>Download</MenuItem>
          <MenuItem onSelect={onDelete} disabled>
            Delete
          </MenuItem>
        </MenuPopup>
      </Menu>
      <button type="button">After</button>
    </>
  );
}

const trigger = () => screen.getByRole("button", { name: "Options" });
const item = (name: string) =>
  screen.queryByRole("menuitem", { name }) ?? screen.getByRole("menuitemradio", { name });
const allItems = () => [
  ...screen.queryAllByRole("menuitemradio"),
  ...screen.queryAllByRole("menuitem"),
];

async function openWithClick() {
  const user = userEvent.setup();
  await user.click(trigger());
  return user;
}

describe("Menu: ARIA wiring (R12.1, R12.2)", () => {
  it("renders a closed menu button", () => {
    render(<Fixture />);

    expect(trigger()).toHaveAttribute("aria-haspopup", "menu");
    expect(trigger()).toHaveAttribute("aria-expanded", "false");
    expect(trigger()).toHaveAttribute("aria-controls");
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("opens a menu labelled by its trigger and controlled by it", async () => {
    render(<Fixture />);
    await openWithClick();

    const menu = screen.getByRole("menu", { name: "Options" });
    expect(trigger()).toHaveAttribute("aria-expanded", "true");
    expect(trigger()).toHaveAttribute("aria-controls", menu.id);
  });

  it("exposes the radio group by its label, with aria-checked on each item", async () => {
    render(<Fixture />);
    await openWithClick();

    const group = screen.getByRole("group", { name: "Theme" });
    const radios = within(group).getAllByRole("menuitemradio");
    expect(radios.map((radio) => [radio.textContent, radio.getAttribute("aria-checked")])).toEqual([
      ["System", "false"],
      ["Light", "true"],
      ["Dark", "false"],
    ]);
    expect(screen.getByRole("menuitem", { name: "Download" })).toBeInTheDocument();
  });

  it("marks disabled items aria-disabled but keeps them visible (R12.7)", async () => {
    render(<Fixture />);
    await openWithClick();

    expect(item("Delete")).toHaveAttribute("aria-disabled", "true");
    expect(item("Download")).not.toHaveAttribute("aria-disabled");
  });

  it("decorates radio items with icons that stay hidden from assistive technology", async () => {
    render(<Fixture />);
    await openWithClick();

    for (const svg of item("Light").querySelectorAll("svg")) {
      expect(svg).toHaveAttribute("aria-hidden", "true");
    }
  });
});

describe("Menu: opening from the trigger (R12.3)", () => {
  it("focuses the checked radio item when opened by click", async () => {
    render(<Fixture />);
    await openWithClick();

    expect(item("Light")).toHaveFocus();
  });

  it.each(["{Enter}", " "])("opens with %j and focuses the checked item", async (key) => {
    const user = userEvent.setup();
    render(<Fixture />);

    trigger().focus();
    await user.keyboard(key);

    expect(screen.getByRole("menu")).toBeVisible();
    expect(item("Light")).toHaveFocus();
  });

  it("focuses the first item when nothing is checked", async () => {
    render(<Fixture defaultValue={null} />);
    await openWithClick();

    expect(item("System")).toHaveFocus();
  });

  it("opens with ArrowDown on the first item and ArrowUp on the last", async () => {
    const user = userEvent.setup();
    render(<Fixture />);

    trigger().focus();
    await user.keyboard("{ArrowDown}");
    expect(item("System")).toHaveFocus();
    await user.keyboard("{Escape}");
    await user.keyboard("{ArrowUp}");
    expect(item("Delete")).toHaveFocus();
  });

  it("closes when the trigger is clicked again, keeping focus on it", async () => {
    const user = await (async () => {
      render(<Fixture />);
      return openWithClick();
    })();

    await user.click(trigger());

    expect(screen.queryByRole("menu")).toBeNull();
    expect(trigger()).toHaveFocus();
  });
});

describe("Menu: moving focus (R12.4)", () => {
  it("moves with arrows, wrapping, and Home/End", async () => {
    render(<Fixture />);
    const user = await openWithClick();

    await user.keyboard("{ArrowDown}");
    expect(item("Dark")).toHaveFocus();
    await user.keyboard("{ArrowDown}{ArrowDown}");
    expect(item("Delete")).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(item("System")).toHaveFocus();
    await user.keyboard("{ArrowUp}");
    expect(item("Delete")).toHaveFocus();
    await user.keyboard("{Home}");
    expect(item("System")).toHaveFocus();
    await user.keyboard("{End}");
    expect(item("Delete")).toHaveFocus();
  });

  it("moves to the next item starting with a typed character, cycling", async () => {
    render(<Fixture />);
    const user = await openWithClick();

    await user.keyboard("d");
    expect(item("Dark")).toHaveFocus();
    await user.keyboard("d");
    expect(item("Download")).toHaveFocus();
    await user.keyboard("D");
    expect(item("Delete")).toHaveFocus();
    await user.keyboard("d");
    expect(item("Dark")).toHaveFocus();
    await user.keyboard("x");
    expect(item("Dark")).toHaveFocus();
  });

  it("keeps only the focused item in the tab sequence (roving tabindex)", async () => {
    render(<Fixture />);
    const user = await openWithClick();
    await user.keyboard("{ArrowDown}");

    const tabbable = allItems().filter((element) => element.getAttribute("tabindex") === "0");
    expect(tabbable).toEqual([item("Dark")]);
  });
});

describe("Menu: activation (R12.5, R12.7)", () => {
  it.each(["{Enter}", " "])(
    "runs an action on %j, closes, and refocuses the trigger",
    async (key) => {
      const onDownload = vi.fn();
      render(<Fixture onDownload={onDownload} />);
      const user = await openWithClick();

      await user.keyboard("{End}{ArrowUp}");
      await user.keyboard(key);

      expect(onDownload).toHaveBeenCalledTimes(1);
      expect(screen.queryByRole("menu")).toBeNull();
      expect(trigger()).toHaveFocus();
    },
  );

  it("runs an action on click", async () => {
    const onDownload = vi.fn();
    render(<Fixture onDownload={onDownload} />);
    const user = await openWithClick();

    await user.click(item("Download"));

    expect(onDownload).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("menu")).toBeNull();
    expect(trigger()).toHaveFocus();
  });

  it("selects a radio value (uncontrolled), closes, and shows it checked next time", async () => {
    render(<Fixture />);
    const user = await openWithClick();

    await user.click(item("Dark"));
    expect(screen.queryByRole("menu")).toBeNull();
    await user.click(trigger());

    expect(item("Dark")).toHaveAttribute("aria-checked", "true");
    expect(item("Light")).toHaveAttribute("aria-checked", "false");
    expect(item("Dark")).toHaveFocus();
  });

  it("follows a controlled value, reporting choices through onValueChange", async () => {
    const onValueChange = vi.fn();
    function Controlled() {
      const [value, setValue] = useState("system");
      return (
        <Menu>
          <MenuTrigger>Theme</MenuTrigger>
          <MenuPopup>
            <MenuRadioGroup
              label="Theme"
              value={value}
              onValueChange={(next) => {
                onValueChange(next);
                if (next !== "dark") setValue(next);
              }}
            >
              <MenuRadioItem value="system">System</MenuRadioItem>
              <MenuRadioItem value="light">Light</MenuRadioItem>
              <MenuRadioItem value="dark">Dark</MenuRadioItem>
            </MenuRadioGroup>
          </MenuPopup>
        </Menu>
      );
    }
    const user = userEvent.setup();
    render(<Controlled />);
    const open = () => user.click(screen.getByRole("button", { name: "Theme" }));

    await open();
    await user.click(item("Light"));
    await open();
    expect(item("Light")).toHaveAttribute("aria-checked", "true");
    await user.click(item("Dark"));
    await open();

    expect(onValueChange.mock.calls).toEqual([["light"], ["dark"]]);
    expect(item("Light")).toHaveAttribute("aria-checked", "true");
    expect(item("Dark")).toHaveAttribute("aria-checked", "false");
  });

  it("never activates a disabled item, by click, Enter or Space, and stays open", async () => {
    const onDelete = vi.fn();
    render(<Fixture onDelete={onDelete} />);
    const user = await openWithClick();

    await user.keyboard("{End}");
    expect(item("Delete")).toHaveFocus();
    await user.keyboard("{Enter}");
    await user.keyboard(" ");
    await user.click(item("Delete"));

    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.getByRole("menu")).toBeVisible();
  });
});

describe("Menu: closing (R12.6)", () => {
  it("closes on Escape and refocuses the trigger", async () => {
    render(<Fixture />);
    const user = await openWithClick();

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("menu")).toBeNull();
    expect(trigger()).toHaveAttribute("aria-expanded", "false");
    expect(trigger()).toHaveFocus();
  });

  it("closes on Tab and lets focus move on normally", async () => {
    render(<Fixture />);
    const user = await openWithClick();

    await user.tab();

    expect(screen.queryByRole("menu")).toBeNull();
    expect(screen.getByRole("button", { name: "After" })).toHaveFocus();
  });

  it("closes on Shift+Tab, with focus going back to the trigger", async () => {
    render(<Fixture />);
    const user = await openWithClick();

    await user.tab({ shift: true });

    expect(screen.queryByRole("menu")).toBeNull();
    expect(trigger()).toHaveFocus();
  });

  it("closes on a click outside without moving focus to the trigger", async () => {
    render(<Fixture />);
    const user = await openWithClick();

    await user.click(screen.getByRole("button", { name: "Before" }));

    expect(screen.queryByRole("menu")).toBeNull();
    expect(screen.getByRole("button", { name: "Before" })).toHaveFocus();
  });

  it("closes on a click on non-focusable content outside", async () => {
    render(
      <>
        <p>Page text</p>
        <Fixture />
      </>,
    );
    const user = await openWithClick();

    await user.click(screen.getByText("Page text"));

    expect(screen.queryByRole("menu")).toBeNull();
    expect(trigger()).not.toHaveFocus();
  });
});

describe("Menu: edge cases from review", () => {
  it("never opens a disabled trigger, by click, Enter, Space or arrows (R4.5)", async () => {
    const user = userEvent.setup();
    render(
      <Menu>
        <MenuTrigger disabled>Options</MenuTrigger>
        <MenuPopup>
          <MenuItem>Download</MenuItem>
        </MenuPopup>
      </Menu>,
    );

    await user.click(trigger());
    await user.keyboard("{Enter} {ArrowDown}{ArrowUp}");

    expect(trigger()).toHaveAttribute("aria-disabled", "true");
    expect(trigger()).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("doesn't stick open after a press on the trigger that never becomes a click", async () => {
    render(<Fixture />);
    const user = await openWithClick();

    // Pressed on the trigger, released elsewhere: no click on the trigger.
    await user.pointer([
      { keys: "[MouseLeft>]", target: trigger() },
      { target: screen.getByRole("button", { name: "After" }) },
      { keys: "[/MouseLeft]" },
    ]);

    await waitFor(() => {
      expect(screen.queryByRole("menu")).toBeNull();
    });
    await user.click(trigger());
    await user.tab();
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("lets a consumer's own onKeyDown inside the menu see Escape", async () => {
    const onKeyDown = vi.fn<(key: string) => void>();
    const user = userEvent.setup();
    render(
      <Menu>
        <MenuTrigger>Options</MenuTrigger>
        <MenuPopup
          onKeyDown={(event) => {
            onKeyDown(event.key);
          }}
        >
          <MenuItem>Download</MenuItem>
        </MenuPopup>
      </Menu>,
    );
    await user.click(trigger());

    await user.keyboard("{Escape}");

    expect(onKeyDown).toHaveBeenCalledWith("Escape");
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("closes on Escape while focus is on the trigger, without the key going further", async () => {
    const onKeyDown = vi.fn();
    document.addEventListener("keydown", onKeyDown);
    render(<Fixture />);
    await openWithClick();

    fireEvent.keyDown(trigger(), { key: "Escape" });
    document.removeEventListener("keydown", onKeyDown);

    expect(screen.queryByRole("menu")).toBeNull();
    expect(onKeyDown).not.toHaveBeenCalled();
  });
});

describe("Menu: shared conventions", () => {
  it("puts refs and rest props on each part's root (R3.2, R3.3)", async () => {
    const rootRef = createRef<HTMLDivElement>();
    const triggerRef = createRef<HTMLButtonElement>();
    const popupRef = createRef<HTMLDivElement>();
    render(
      <Menu ref={rootRef} data-part="root" className="root-extra">
        <MenuTrigger ref={triggerRef} variant="ghost" className="trigger-extra">
          Options
        </MenuTrigger>
        <MenuPopup ref={popupRef} data-part="popup">
          <MenuItem data-part="item">Download</MenuItem>
        </MenuPopup>
      </Menu>,
    );
    const user = userEvent.setup();
    await user.click(trigger());

    expect(rootRef.current).toHaveAttribute("data-part", "root");
    expect(rootRef.current).toHaveClass("root-extra");
    expect(triggerRef.current).toBe(trigger());
    expect(trigger()).toHaveClass("trigger-extra");
    expect(popupRef.current).toBe(screen.getByRole("menu"));
    expect(screen.getByRole("menu")).toHaveAttribute("data-part", "popup");
    expect(item("Download")).toHaveAttribute("data-part", "item");
  });

  it("renders no style attribute while closed (R3.5)", () => {
    const { container } = render(<Fixture />);

    expect(container.querySelector("[style]")).toBeNull();
  });

  it("hydrates prerendered markup with no mismatch (R3.6)", () => {
    expectHydratesCleanly(<Fixture />);
  });

  it("has no axe violations when closed or open (R3.9)", async () => {
    const { container } = render(
      <main>
        <Fixture />
      </main>,
    );
    await expectNoAxeViolations(container);

    await openWithClick();
    await expectNoAxeViolations(container);
  });
});
