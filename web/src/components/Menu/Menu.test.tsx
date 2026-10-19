import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState, type ReactNode } from "react";
import { createRoutesStub } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { expectNoAxeViolations } from "../../../test/axe.ts";
import { expectHydratesCleanly } from "../../../test/component.tsx";
import {
  Menu,
  MenuCheckboxItem,
  MenuItem,
  MenuPopup,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuTrigger,
  type MenuProps,
} from "./Menu.tsx";
import styles from "./Menu.module.css";

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

/** Every part (refinement R5): radio group, separator, checkboxes, actions and link items. */
function FullFixture({
  onCheckedChange,
  menuProps,
  children,
}: {
  onCheckedChange?: (checked: boolean) => void;
  menuProps?: MenuProps;
  children?: ReactNode;
}) {
  return (
    <>
      <button type="button">Before</button>
      <Menu {...menuProps}>
        <MenuTrigger iconEnd="chevron-down">Options</MenuTrigger>
        <MenuPopup>
          <MenuRadioGroup label="View" defaultValue="grid">
            <MenuRadioItem value="grid">Grid</MenuRadioItem>
            <MenuRadioItem value="list">List</MenuRadioItem>
          </MenuRadioGroup>
          <MenuSeparator />
          <MenuCheckboxItem defaultChecked onCheckedChange={onCheckedChange}>
            Show descriptions
          </MenuCheckboxItem>
          <MenuCheckboxItem disabled>Show archived</MenuCheckboxItem>
          <MenuSeparator />
          <MenuItem icon="mail">Copy email address</MenuItem>
          <MenuItem icon="github" href="https://github.com/" newTab>
            GitHub
          </MenuItem>
          {children}
        </MenuPopup>
      </Menu>
      <button type="button">After</button>
    </>
  );
}

const trigger = () => screen.getByRole("button", { name: "Options" });
const checkbox = (name: string) => screen.getByRole("menuitemcheckbox", { name });
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
    expectHydratesCleanly(<FullFixture />);
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

  it("has no axe violations with every part, closed and open (refinement R5.6–R5.8)", async () => {
    const { container } = render(
      <main>
        <FullFixture />
      </main>,
    );
    await expectNoAxeViolations(container);

    await openWithClick();

    await expectNoAxeViolations(container);
  });
});

describe("Menu: pointer focus (refinement R5.3)", () => {
  it("focuses the item under a mouse, making it the only tab stop, and arrows continue from it", async () => {
    render(<Fixture />);
    const user = await openWithClick();

    await user.hover(item("Dark"));

    expect(item("Dark")).toHaveFocus();
    expect(allItems().filter((node) => node.tabIndex === 0)).toEqual([item("Dark")]);
    await user.keyboard("{ArrowDown}");
    expect(item("Download")).toHaveFocus();
  });

  it("focuses a disabled item under a mouse too, as the arrows do", async () => {
    render(<Fixture />);
    const user = await openWithClick();

    await user.hover(item("Delete"));

    expect(item("Delete")).toHaveFocus();
  });

  it("doesn't move focus for a touch pointer", async () => {
    render(<Fixture />);
    const user = await openWithClick();
    expect(item("Light")).toHaveFocus();

    await user.pointer([
      { keys: "[TouchA>]", target: item("System") },
      { pointerName: "TouchA", target: item("Dark") },
    ]);

    expect(item("Dark")).not.toHaveFocus();
  });
});

describe("Menu: open trigger (refinement R5.4)", () => {
  it("marks a trigger with an end chevron so it can flip", () => {
    render(<FullFixture />);

    expect(trigger()).toHaveClass(styles.chevron ?? "");
  });

  it("doesn't mark other end icons or a start chevron", () => {
    render(
      <>
        <Menu>
          <MenuTrigger iconEnd="arrow-right">Next</MenuTrigger>
          <MenuPopup>
            <MenuItem>One</MenuItem>
          </MenuPopup>
        </Menu>
        <Menu>
          <MenuTrigger iconStart="chevron-down" aria-label="More" />
          <MenuPopup>
            <MenuItem>One</MenuItem>
          </MenuPopup>
        </Menu>
      </>,
    );

    expect(screen.getByRole("button", { name: "Next" })).not.toHaveClass(styles.chevron ?? "");
    expect(screen.getByRole("button", { name: "More" })).not.toHaveClass(styles.chevron ?? "");
  });
});

describe("Menu: checkbox items (refinement R5.6)", () => {
  it("exposes menuitemcheckbox with aria-checked, and a disabled one", async () => {
    render(<FullFixture />);
    await openWithClick();

    expect(checkbox("Show descriptions")).toHaveAttribute("aria-checked", "true");
    expect(checkbox("Show archived")).toHaveAttribute("aria-checked", "false");
    expect(checkbox("Show archived")).toHaveAttribute("aria-disabled", "true");
  });

  it("toggles on click (uncontrolled), closes, and shows the new state next time", async () => {
    const onCheckedChange = vi.fn();
    render(<FullFixture onCheckedChange={onCheckedChange} />);
    const user = await openWithClick();

    await user.click(checkbox("Show descriptions"));
    expect(screen.queryByRole("menu")).toBeNull();
    await user.click(trigger());

    expect(onCheckedChange).toHaveBeenCalledWith(false);
    expect(checkbox("Show descriptions")).toHaveAttribute("aria-checked", "false");
  });

  it("follows a controlled checked, reporting through onCheckedChange", async () => {
    const onCheckedChange = vi.fn();
    const user = userEvent.setup();
    render(
      <Menu>
        <MenuTrigger>Options</MenuTrigger>
        <MenuPopup>
          <MenuCheckboxItem checked={false} onCheckedChange={onCheckedChange}>
            Wrap lines
          </MenuCheckboxItem>
        </MenuPopup>
      </Menu>,
    );
    await user.click(trigger());

    await user.keyboard(" ");

    expect(onCheckedChange).toHaveBeenCalledWith(true);
    expect(checkbox("Wrap lines")).toHaveAttribute("aria-checked", "false");
  });

  it("never toggles a disabled checkbox item", async () => {
    render(<FullFixture />);
    const user = await openWithClick();

    await user.click(checkbox("Show archived"));
    checkbox("Show archived").focus();
    await user.keyboard(" {Enter}");

    expect(checkbox("Show archived")).toHaveAttribute("aria-checked", "false");
    expect(screen.getByRole("menu")).toBeVisible();
  });
});

describe("Menu: choosing and closing (refinement R5.9)", () => {
  it("toggles a checkbox item on Space and stays open with focus on it, then closes on Enter", async () => {
    render(<FullFixture />);
    const user = await openWithClick();
    checkbox("Show descriptions").focus();

    await user.keyboard(" ");
    expect(checkbox("Show descriptions")).toHaveAttribute("aria-checked", "false");
    expect(screen.getByRole("menu")).toBeVisible();
    expect(checkbox("Show descriptions")).toHaveFocus();

    await user.keyboard("{Enter}");
    expect(screen.queryByRole("menu")).toBeNull();
    expect(trigger()).toHaveFocus();
  });

  it("checks a radio item on Space and stays open, and closes on Enter", async () => {
    render(<Fixture />);
    const user = await openWithClick();

    await user.keyboard("{ArrowDown}");
    await user.keyboard(" ");
    expect(item("Dark")).toHaveAttribute("aria-checked", "true");
    expect(item("Dark")).toHaveFocus();
    expect(screen.getByRole("menu")).toBeVisible();

    await user.keyboard("{ArrowUp}{Enter}");
    expect(screen.queryByRole("menu")).toBeNull();
    await user.click(trigger());
    expect(item("Light")).toHaveAttribute("aria-checked", "true");
  });

  it("keeps the menu open with closeOnSelect={false}, and still closes on dismissal", async () => {
    const onSelect = vi.fn();
    render(
      <FullFixture>
        <MenuItem closeOnSelect={false} onSelect={onSelect}>
          Refresh
        </MenuItem>
      </FullFixture>,
    );
    const user = await openWithClick();

    await user.click(item("Refresh"));
    await user.keyboard("{Enter}");
    expect(onSelect).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("menu")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "After" }));
    expect(screen.queryByRole("menu")).toBeNull();

    await user.click(trigger());
    await user.click(item("Refresh"));
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("menu")).toBeNull();
    expect(trigger()).toHaveFocus();
  });

  it("closes on Tab after a choice that kept the menu open", async () => {
    render(<FullFixture />);
    const user = await openWithClick();
    checkbox("Show descriptions").focus();

    await user.keyboard(" ");
    expect(screen.getByRole("menu")).toBeVisible();
    await user.tab();

    expect(screen.queryByRole("menu")).toBeNull();
    expect(screen.getByRole("button", { name: "After" })).toHaveFocus();
  });

  it("makes any focused item the tab stop, so Shift+Tab still leaves the menu", async () => {
    render(<Fixture />);
    const user = await openWithClick();

    act(() => {
      item("Delete").focus();
    });
    expect(allItems().filter((node) => node.tabIndex === 0)).toEqual([item("Delete")]);
    await user.tab({ shift: true });

    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("closes a checkbox item on Space with closeOnSelect", async () => {
    const user = userEvent.setup();
    render(
      <Menu>
        <MenuTrigger>Options</MenuTrigger>
        <MenuPopup>
          <MenuCheckboxItem closeOnSelect>Wrap lines</MenuCheckboxItem>
        </MenuPopup>
      </Menu>,
    );
    await user.click(trigger());

    await user.keyboard(" ");

    expect(screen.queryByRole("menu")).toBeNull();
  });
});

describe("Menu: separators (refinement R5.7)", () => {
  it("renders role separator, never focusable, skipped by arrows, End and typeahead", async () => {
    render(<FullFixture />);
    const user = await openWithClick();
    const separators = screen.getAllByRole("separator");

    expect(separators).toHaveLength(2);
    for (const separator of separators) expect(separator).not.toHaveAttribute("tabindex");

    item("List").focus();
    await user.keyboard("{ArrowDown}");
    expect(checkbox("Show descriptions")).toHaveFocus();
    await user.keyboard("{End}");
    expect(screen.getByRole("menuitem", { name: "GitHub, opens in new tab" })).toHaveFocus();
    await user.keyboard("c");
    expect(item("Copy email address")).toHaveFocus();
  });
});

describe("Menu: link items (refinement R5.8)", () => {
  function renderInRouter(ui: ReactNode) {
    const Stub = createRoutesStub([
      { path: "/", Component: () => <main>{ui}</main> },
      { path: "/projects", Component: () => <h1>Projects page</h1> },
    ]);
    return render(<Stub initialEntries={["/"]} />);
  }

  function RoutedMenu({ onSelect }: { onSelect?: () => void }) {
    return (
      <Menu>
        <MenuTrigger>Options</MenuTrigger>
        <MenuPopup>
          <MenuItem>Copy link</MenuItem>
          <MenuItem href="/projects" onSelect={onSelect}>
            Projects
          </MenuItem>
          <MenuItem href="/projects" newTab disabled>
            Archive
          </MenuItem>
        </MenuPopup>
      </Menu>
    );
  }

  it("renders a new-tab link item with its target, merged rel and announced new tab", async () => {
    render(
      <Menu>
        <MenuTrigger>Options</MenuTrigger>
        <MenuPopup>
          <MenuItem href="https://github.com/" newTab rel="me">
            GitHub
          </MenuItem>
        </MenuPopup>
      </Menu>,
    );
    await openWithClick();
    const link = screen.getByRole("menuitem", { name: "GitHub, opens in new tab" });

    expect(link.tagName).toBe("A");
    expect(link).toHaveAttribute("href", "https://github.com/");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "me noopener noreferrer");
  });

  it("routes a path on click, running onSelect first and closing", async () => {
    const onSelect = vi.fn(() => {
      expect(screen.queryByRole("heading", { name: "Projects page" })).toBeNull();
    });
    renderInRouter(<RoutedMenu onSelect={onSelect} />);
    const user = await openWithClick();

    await user.click(item("Projects"));

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("heading", { name: "Projects page" })).toBeInTheDocument();
  });

  it.each(["{Enter}", " "])("follows the link on %j", async (key) => {
    renderInRouter(<RoutedMenu />);
    const user = await openWithClick();

    await user.keyboard("{ArrowDown}");
    expect(item("Projects")).toHaveFocus();
    await user.keyboard(key);

    expect(screen.getByRole("heading", { name: "Projects page" })).toBeInTheDocument();
  });

  it("closes after following a link while the menu stays mounted, and never marks aria-current", async () => {
    const Stub = createRoutesStub([
      {
        path: "*",
        Component: () => (
          <main>
            <Menu>
              <MenuTrigger>Options</MenuTrigger>
              <MenuPopup>
                <MenuItem href="/">Home</MenuItem>
                <MenuItem href="/projects">Projects</MenuItem>
              </MenuPopup>
            </Menu>
          </main>
        ),
      },
    ]);
    render(<Stub initialEntries={["/"]} />);
    const user = await openWithClick();
    expect(item("Home")).not.toHaveAttribute("aria-current");

    await user.click(item("Projects"));

    expect(screen.queryByRole("menu")).toBeNull();
    expect(trigger()).toHaveFocus();
  });

  it("renders a disabled link item with no href, and never follows it", async () => {
    renderInRouter(<RoutedMenu />);
    const user = await openWithClick();

    const archive = screen.getByRole("menuitem", { name: "Archive, opens in new tab" });
    expect(archive).not.toHaveAttribute("href");
    expect(archive).not.toHaveAttribute("target");
    expect(archive).not.toHaveAttribute("rel");
    await user.click(archive);
    await user.keyboard(" {Enter}");

    expect(screen.queryByRole("heading", { name: "Projects page" })).toBeNull();
    expect(screen.getByRole("menu")).toBeVisible();
  });

  it("is found by typeahead", async () => {
    renderInRouter(<RoutedMenu />);
    const user = await openWithClick();

    await user.keyboard("p");

    expect(item("Projects")).toHaveFocus();
  });
});

describe("Menu: item icons (refinement R5.10)", () => {
  it("renders MenuItem's icon hidden from assistive technology", async () => {
    render(<FullFixture />);
    await openWithClick();

    const icon = item("Copy email address").querySelector("svg");
    expect(icon).toHaveAttribute("aria-hidden", "true");
  });
});

describe("Menu: controlled open state (refinement R5.11)", () => {
  function Controlled({
    open,
    onOpenChange,
  }: {
    open: boolean;
    onOpenChange?: (open: boolean) => void;
  }) {
    return <FullFixture menuProps={{ open, onOpenChange }} />;
  }

  it("opens from outside on the checked item, and closes from outside back to the trigger", () => {
    const { rerender } = render(<Controlled open={false} />);

    rerender(<Controlled open />);
    expect(screen.getByRole("menu")).toBeVisible();
    expect(item("Grid")).toHaveFocus();

    rerender(<Controlled open={false} />);
    expect(screen.queryByRole("menu")).toBeNull();
    expect(trigger()).toHaveFocus();
  });

  it("only reports requests while the parent ignores them", async () => {
    const onOpenChange = vi.fn();
    const user = userEvent.setup();
    const { rerender } = render(<Controlled open={false} onOpenChange={onOpenChange} />);

    await user.click(trigger());
    expect(onOpenChange).toHaveBeenLastCalledWith(true);
    expect(screen.queryByRole("menu")).toBeNull();

    rerender(<Controlled open onOpenChange={onOpenChange} />);
    await user.click(screen.getByRole("button", { name: "After" }));
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
    expect(screen.getByRole("menu")).toBeVisible();
  });

  it("opens and closes with a parent that applies onOpenChange", async () => {
    function Stateful() {
      const [open, setOpen] = useState(false);
      return <Controlled open={open} onOpenChange={setOpen} />;
    }
    render(<Stateful />);
    const user = await openWithClick();
    expect(item("Grid")).toHaveFocus();

    await user.keyboard("{ArrowDown}{ArrowDown}{Enter}");
    expect(screen.queryByRole("menu")).toBeNull();
    expect(trigger()).toHaveFocus();

    await user.keyboard("{ArrowUp}");
    expect(screen.getByRole("menuitem", { name: "GitHub, opens in new tab" })).toHaveFocus();
    await user.click(screen.getByRole("button", { name: "Before" }));
    expect(screen.queryByRole("menu")).toBeNull();
  });

  /** Lets a request the parent ignored expire (it lasts until the next task). */
  const nextTask = () =>
    act(
      () =>
        new Promise((resolve) => {
          setTimeout(resolve, 0);
        }),
    );

  it("forgets an ignored close: a later outside close with focus inside still refocuses the trigger", async () => {
    const onOpenChange = vi.fn();
    const user = userEvent.setup();
    const { rerender } = render(<Controlled open={false} onOpenChange={onOpenChange} />);
    rerender(<Controlled open onOpenChange={onOpenChange} />);

    await user.click(screen.getByRole("button", { name: "After" }));
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
    await user.hover(item("List"));
    expect(item("List")).toHaveFocus();
    await nextTask();
    rerender(<Controlled open={false} onOpenChange={onOpenChange} />);

    expect(trigger()).toHaveFocus();
  });

  it("forgets an ignored open: a later outside open focuses the checked item", async () => {
    const onOpenChange = vi.fn();
    const user = userEvent.setup();
    const { rerender } = render(<Controlled open={false} onOpenChange={onOpenChange} />);
    trigger().focus();

    await user.keyboard("{ArrowUp}");
    expect(onOpenChange).toHaveBeenLastCalledWith(true);
    await nextTask();
    rerender(<Controlled open onOpenChange={onOpenChange} />);

    expect(item("Grid")).toHaveFocus();
  });

  it("reports changes uncontrolled too, once each", async () => {
    const onOpenChange = vi.fn();
    render(<FullFixture menuProps={{ onOpenChange }} />);
    const user = await openWithClick();

    await user.keyboard("{Escape}");

    expect(onOpenChange.mock.calls).toEqual([[true], [false]]);
  });
});

describe("Menu: placement (refinement R5.12)", () => {
  it("renders the side and alignment, bottom and start by default", async () => {
    const user = userEvent.setup();
    render(
      <>
        <Menu>
          <MenuTrigger>Default</MenuTrigger>
          <MenuPopup aria-label="Default menu">
            <MenuItem>One</MenuItem>
          </MenuPopup>
        </Menu>
        <Menu>
          <MenuTrigger>Top end</MenuTrigger>
          <MenuPopup side="top" align="end" aria-label="Top end menu">
            <MenuItem>One</MenuItem>
          </MenuPopup>
        </Menu>
      </>,
    );

    await user.click(screen.getByRole("button", { name: "Default" }));
    expect(screen.getByRole("menu")).toHaveAttribute("data-side", "bottom");
    expect(screen.getByRole("menu")).toHaveAttribute("data-align", "start");
    await user.click(screen.getByRole("button", { name: "Top end" }));
    expect(screen.getByRole("menu")).toHaveAttribute("data-side", "top");
    expect(screen.getByRole("menu")).toHaveAttribute("data-align", "end");
  });
});
