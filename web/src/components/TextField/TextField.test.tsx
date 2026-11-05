import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState, type SyntheticEvent } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { expectNoAxeViolations } from "../../../test/axe.ts";
import { Icon } from "../Icon/Icon.tsx";
import hiddenStyles from "../VisuallyHidden/VisuallyHidden.module.css";
import type { IconName } from "../Icon/registry.ts";
import { TextField } from "./TextField.tsx";
import styles from "./TextField.module.css";

function svgMarkup(name: IconName) {
  const holder = document.createElement("div");
  holder.innerHTML = renderToString(<Icon name={name} />);
  return holder.querySelector("svg")?.innerHTML;
}

/** The decorative start icon's markup, if there is one. */
function startIcon(container: HTMLElement) {
  const input = container.querySelector("input");
  const svg = input?.previousElementSibling;
  return svg?.tagName.toLowerCase() === "svg" ? svg.innerHTML : undefined;
}

describe("TextField (ds-tokens R10)", () => {
  it("renders a native input named by its visible, associated label (R10.2)", () => {
    render(<TextField label="Email" />);

    const input = screen.getByRole("textbox", { name: "Email" });
    expect(input.tagName).toBe("INPUT");
    expect(input).toHaveAttribute("type", "text");
    const label = screen.getByText("Email");
    expect(label.tagName).toBe("LABEL");
    expect(label).toHaveAttribute("for", input.id);
    expect(label).toBeVisible();
  });

  it("keeps a hidden label as the accessible name (R10.2)", () => {
    render(<TextField label="Search tokens" type="search" hideLabel />);

    expect(screen.getByRole("searchbox", { name: "Search tokens" })).toBeInTheDocument();
    expect(screen.getByText("Search tokens").closest("label")?.parentElement).toHaveClass(
      hiddenStyles.root ?? "",
    );
  });

  it("leaves a field with an empty label unnamed: the type requires a label, not a guard", () => {
    render(<TextField label="" />);

    expect(screen.getByRole("textbox")).toHaveAccessibleName("");
  });

  it("describes the input by its hint, then its error, and marks it invalid (R10.4, R10.5)", () => {
    render(
      <TextField
        label="Email"
        hint="We'll only use it to reply."
        error="Enter an email address"
        aria-describedby="extra"
      />,
    );

    const input = screen.getByRole("textbox", { name: "Email" });
    expect(input).toHaveAttribute("aria-invalid", "true");
    const [hintId, errorId, extra] = (input.getAttribute("aria-describedby") ?? "").split(" ");
    expect(document.getElementById(hintId ?? "")).toHaveTextContent("We'll only use it to reply.");
    expect(document.getElementById(errorId ?? "")).toHaveTextContent("Enter an email address");
    expect(extra).toBe("extra");
    expect(document.getElementById(errorId ?? "")?.querySelector("svg")?.innerHTML).toBe(
      svgMarkup("warning"),
    );
  });

  it("references only descriptions that exist, and isn't invalid without an error", () => {
    render(<TextField label="Name" />);

    const input = screen.getByRole("textbox", { name: "Name" });
    expect(input).not.toHaveAttribute("aria-describedby");
    expect(input).not.toHaveAttribute("aria-invalid");
  });

  it("sets native required with a visible indicator that isn't announced twice (R10.6)", () => {
    render(<TextField label="Email" required />);

    const input = screen.getByRole("textbox", { name: "Email" });
    expect(input).toBeRequired();
    const indicator = screen.getByText("(required)");
    expect(indicator).toBeVisible();
    expect(indicator).toHaveAttribute("aria-hidden", "true");
    expect(indicator).toHaveClass(styles.cue ?? "");
    expect(input).toHaveAccessibleName("Email");
  });

  it("uses a caller's id on the input, keeping its label tied to it", () => {
    render(<TextField label="Email" id="email" />);

    const input = screen.getByRole("textbox", { name: "Email" });
    expect(input).toHaveAttribute("id", "email");
    expect(screen.getByText("Email")).toHaveAttribute("for", "email");
  });

  it("can't be cleared while read-only", async () => {
    const user = userEvent.setup();
    render(<TextField label="Search" type="search" defaultValue="x" readOnly />);

    expect(screen.queryByRole("button")).toBeNull();
    await user.click(screen.getByRole("searchbox"));
    await user.keyboard("{Escape}");
    expect(screen.getByRole("searchbox")).toHaveValue("x");
  });

  it("keeps a search field's icon on focus when its label is hidden: it's the only visible cue", () => {
    const { container } = render(<TextField label="Search" type="search" hideLabel />);

    expect(container.querySelector(`.${styles.control ?? ""}`)).not.toHaveClass(
      styles.searchIcon ?? "",
    );
  });

  it("uses native disabled, with no clear button (R10.6)", () => {
    render(<TextField label="Search" type="search" disabled defaultValue="x" />);

    expect(screen.getByRole("searchbox")).toBeDisabled();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it.each(["text", "search", "email", "url", "tel"] as const)(
    "supports type=%s (R10.3)",
    (type) => {
      render(<TextField label="Field" type={type} />);

      expect(screen.getByLabelText("Field")).toHaveAttribute("type", type);
    },
  );

  it("supports type=number, passing min, max and step to the input (theme-creator R6.1)", () => {
    render(<TextField label="Radius" hint="px" type="number" min={0} max={48} step={1} />);

    const input = screen.getByRole("spinbutton", { name: "Radius" });
    expect(input).toHaveAttribute("type", "number");
    expect(input).toHaveAttribute("min", "0");
    expect(input).toHaveAttribute("max", "48");
    expect(input).toHaveAttribute("step", "1");
    expect(input).toHaveAccessibleDescription("px");
  });

  it("works uncontrolled, passing native props and the ref to the input (R10.3)", async () => {
    const user = userEvent.setup();
    const ref = createRef<HTMLInputElement>();
    const onChange = vi.fn();
    render(
      <TextField
        label="Name"
        name="name"
        autoComplete="name"
        placeholder="Ada"
        defaultValue="A"
        ref={ref}
        onChange={onChange}
      />,
    );
    const input = screen.getByRole("textbox", { name: "Name" });

    await user.type(input, "da");

    expect(ref.current).toBe(input);
    expect(input).toHaveValue("Ada");
    expect(input).toHaveAttribute("name", "name");
    expect(input).toHaveAttribute("autocomplete", "name");
    expect(input).toHaveAttribute("placeholder", "Ada");
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it("works controlled (R10.3)", async () => {
    const user = userEvent.setup();
    function Controlled() {
      const [value, setValue] = useState("");
      return (
        <>
          <TextField
            label="Name"
            value={value}
            onChange={(event) => {
              setValue(event.target.value.toUpperCase());
            }}
          />
          <output>{value}</output>
        </>
      );
    }
    render(<Controlled />);

    await user.type(screen.getByRole("textbox", { name: "Name" }), "ada");

    expect(screen.getByRole("textbox", { name: "Name" })).toHaveValue("ADA");
    expect(screen.getByRole("status")).toHaveTextContent("ADA");
  });

  describe("search fields and icons (R10.7)", () => {
    it("gives a search field a decorative search icon", () => {
      const { container } = render(<TextField label="Search" type="search" />);

      expect(startIcon(container)).toBe(svgMarkup("search"));
      expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
      expect(container.querySelector(`.${styles.control ?? ""}`)).toHaveClass(
        styles.searchIcon ?? "",
      );
    });

    it("lets iconStart replace the search icon", () => {
      const { container } = render(<TextField label="Email" type="search" iconStart="mail" />);

      expect(startIcon(container)).toBe(svgMarkup("mail"));
    });

    it("gives other types no icon unless iconStart is set, and never hides it on focus", () => {
      const { container, rerender } = render(<TextField label="Email" type="email" />);
      expect(startIcon(container)).toBeUndefined();

      rerender(<TextField label="Email" type="email" iconStart="mail" />);
      expect(startIcon(container)).toBe(svgMarkup("mail"));
      expect(container.querySelector(`.${styles.control ?? ""}`)).not.toHaveClass(
        styles.searchIcon ?? "",
      );
    });
  });

  describe("clearing (R10.8)", () => {
    it("shows a search field's clear button only while it has a value", async () => {
      const user = userEvent.setup();
      render(<TextField label="Search tokens" type="search" />);
      expect(screen.queryByRole("button")).toBeNull();

      await user.type(screen.getByRole("searchbox"), "m");

      const clear = screen.getByRole("button", { name: "Clear Search tokens" });
      expect(clear.nextElementSibling).toHaveTextContent("Clear Search tokens");
    });

    it("gives other types a clear button only with clearable, named by clearLabel", () => {
      const { rerender } = render(<TextField label="Name" defaultValue="Ada" />);
      expect(screen.queryByRole("button")).toBeNull();

      rerender(<TextField label="Name" defaultValue="Ada" clearable clearLabel="Clear name" />);
      expect(screen.getByRole("button", { name: "Clear name" })).toBeInTheDocument();
    });

    it("empties the field through onChange and returns focus to the input", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      function Controlled() {
        const [value, setValue] = useState("muted");
        return (
          <TextField
            label="Search"
            type="search"
            value={value}
            onChange={(event) => {
              onChange(event.target.value);
              setValue(event.target.value);
            }}
          />
        );
      }
      render(<Controlled />);

      await user.click(screen.getByRole("button", { name: "Clear Search" }));

      const input = screen.getByRole("searchbox", { name: "Search" });
      expect(onChange).toHaveBeenCalledExactlyOnceWith("");
      expect(input).toHaveValue("");
      expect(input).toHaveFocus();
      expect(screen.queryByRole("button")).toBeNull();
    });

    it("comes after the input in Tab order", async () => {
      const user = userEvent.setup();
      render(<TextField label="Search" type="search" defaultValue="x" />);

      await user.tab();
      expect(screen.getByRole("searchbox")).toHaveFocus();
      await user.tab();
      expect(screen.getByRole("button", { name: "Clear Search" })).toHaveFocus();
    });

    it("clears on Escape, keeping focus, and leaves Escape alone when empty", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<TextField label="Search" type="search" defaultValue="x" onChange={onChange} />);
      const input = screen.getByRole("searchbox");

      await user.click(input);
      await user.keyboard("{Escape}");
      expect(input).toHaveValue("");
      expect(input).toHaveFocus();
      expect(onChange).toHaveBeenCalledOnce();

      expect(fireEvent.keyDown(input, { key: "Escape" })).toBe(true);
      expect(onChange).toHaveBeenCalledOnce();
    });

    it("keeps a clearing Escape from reaching a surrounding handler", async () => {
      const user = userEvent.setup();
      // A stand-in for a dialog that closes on Escape.
      const onKeyDown = vi.fn();
      document.addEventListener("keydown", onKeyDown);
      render(<TextField label="Search" type="search" defaultValue="x" />);

      await user.click(screen.getByRole("searchbox"));
      await user.keyboard("{Escape}");
      expect(onKeyDown).not.toHaveBeenCalled();
      await user.keyboard("{Escape}");
      expect(onKeyDown).toHaveBeenCalledOnce();
      document.removeEventListener("keydown", onKeyDown);
    });

    it("doesn't clear on Escape unless clearable", async () => {
      const user = userEvent.setup();
      render(<TextField label="Name" defaultValue="Ada" />);

      await user.click(screen.getByRole("textbox"));
      await user.keyboard("{Escape}");

      expect(screen.getByRole("textbox")).toHaveValue("Ada");
    });
  });

  describe("multiline (contact-form R15.1)", () => {
    it("renders a native textarea named by its visible, associated label", () => {
      render(<TextField label="Message" multiline />);

      const field = screen.getByRole("textbox", { name: "Message" });
      expect(field.tagName).toBe("TEXTAREA");
      expect(screen.getByText("Message")).toHaveAttribute("for", field.id);
      expect(field).toHaveClass(styles.input ?? "", styles.multiline ?? "");
    });

    it("shows 6 rows unless told otherwise", () => {
      const { rerender } = render(<TextField label="Message" multiline />);
      expect(screen.getByRole("textbox")).toHaveAttribute("rows", "6");

      rerender(<TextField label="Message" multiline rows={3} />);
      expect(screen.getByRole("textbox")).toHaveAttribute("rows", "3");
    });

    it("describes the field by its hint, then its error, and marks it invalid", () => {
      render(
        <TextField
          label="Message"
          multiline
          hint="A few lines is plenty."
          error="Enter a message."
          aria-describedby="extra"
        />,
      );

      const field = screen.getByRole("textbox", { name: "Message" });
      expect(field).toBeInvalid();
      const [hintId, errorId, extra] = (field.getAttribute("aria-describedby") ?? "").split(" ");
      expect(document.getElementById(hintId ?? "")).toHaveTextContent("A few lines is plenty.");
      expect(document.getElementById(errorId ?? "")).toHaveTextContent("Enter a message.");
      expect(extra).toBe("extra");
    });

    it("adds a line on Enter, without submitting the form", async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn((event: SyntheticEvent) => {
        event.preventDefault();
      });
      render(
        <form onSubmit={onSubmit}>
          <TextField label="Message" multiline />
        </form>,
      );
      const field = screen.getByRole("textbox", { name: "Message" });

      await user.type(field, "one{Enter}two");

      expect(field).toHaveValue("one\ntwo");
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it("sets native required, with the visible indicator hidden from screen readers", () => {
      render(<TextField label="Message" multiline required />);

      expect(screen.getByRole("textbox", { name: "Message" })).toBeRequired();
      expect(screen.getByText("(required)")).toHaveAttribute("aria-hidden", "true");
    });

    it("passes the ref and native textarea props to the textarea", async () => {
      const user = userEvent.setup();
      const ref = createRef<HTMLTextAreaElement>();
      const onChange = vi.fn();
      render(
        <TextField
          label="Message"
          multiline
          name="message"
          placeholder="Hello"
          defaultValue="A"
          ref={ref}
          onChange={onChange}
        />,
      );
      const field = screen.getByRole("textbox");

      await user.type(field, "b");

      expect(ref.current).toBe(field);
      expect(field).toHaveValue("Ab");
      expect(field).toHaveAttribute("name", "message");
      expect(field).toHaveAttribute("placeholder", "Hello");
      expect(onChange).toHaveBeenCalledOnce();
    });

    it("works controlled", async () => {
      const user = userEvent.setup();
      function Controlled() {
        const [value, setValue] = useState("");
        return (
          <TextField
            label="Message"
            multiline
            value={value}
            onChange={(event) => {
              setValue(event.target.value.toUpperCase());
            }}
          />
        );
      }
      render(<Controlled />);

      await user.type(screen.getByRole("textbox"), "hi");

      expect(screen.getByRole("textbox")).toHaveValue("HI");
    });

    it("has no clear button, and Escape leaves its text alone", async () => {
      const user = userEvent.setup();
      render(<TextField label="Message" multiline defaultValue="Keep me" />);

      expect(screen.queryByRole("button")).toBeNull();
      await user.click(screen.getByRole("textbox"));
      await user.keyboard("{Escape}");
      expect(screen.getByRole("textbox")).toHaveValue("Keep me");
    });

    it("uses native disabled, and puts className and style on the wrapper", () => {
      const { container } = render(
        <TextField
          label="Message"
          multiline
          disabled
          className="wide"
          style={{ maxWidth: "9em" }}
        />,
      );
      const field = screen.getByRole("textbox");

      expect(field).toBeDisabled();
      expect(field).not.toHaveClass("wide");
      expect(container.firstElementChild).toHaveClass("wide");
      expect(container.firstElementChild).toHaveAttribute("style", "max-width: 9em;");
    });

    it("uses a caller's id on the textarea, keeping its label tied to it", () => {
      render(<TextField label="Message" multiline id="message" />);

      expect(screen.getByRole("textbox", { name: "Message" })).toHaveAttribute("id", "message");
    });
  });

  describe("optional (contact-form R15.3)", () => {
    it("shows the cue, and keeps it in the accessible name since nothing else announces it", () => {
      render(<TextField label="Role or company" optional />);

      const input = screen.getByRole("textbox", { name: "Role or company (optional)" });
      expect(input).not.toBeRequired();
      const cue = screen.getByText("(optional)");
      expect(cue).toBeVisible();
      expect(cue).not.toHaveAttribute("aria-hidden");
      expect(cue).toHaveClass(styles.cue ?? "");
      expect(cue.closest("label")).toHaveAttribute("for", input.id);
    });

    it("shows no cue unless asked", () => {
      render(<TextField label="Name" />);

      expect(screen.queryByText(/optional/)).toBeNull();
      expect(screen.getByRole("textbox")).toHaveAccessibleName("Name");
    });

    it("doesn't change the clear button's name", () => {
      render(<TextField label="Role" optional clearable defaultValue="x" />);

      expect(screen.getByRole("button", { name: "Clear Role" })).toBeInTheDocument();
    });

    it("works on a multiline field too", () => {
      render(<TextField label="Notes" multiline optional />);

      expect(screen.getByRole("textbox", { name: "Notes (optional)" }).tagName).toBe("TEXTAREA");
    });
  });

  it("sets the size on the root, md by default, with className and style there too (R10.9)", () => {
    const { container, rerender } = render(<TextField label="A" />);
    const root = container.firstElementChild;
    expect(root).toHaveClass(styles.root ?? "", styles.md ?? "");

    rerender(<TextField label="A" size="sm" className="wide" style={{ maxWidth: "10em" }} />);
    expect(root).toHaveClass(styles.sm ?? "", "wide");
    expect(root).toHaveAttribute("style", "max-width: 10em;");
    expect(screen.getByRole("textbox")).not.toHaveClass("wide");
  });

  it("has no axe violations at rest, filled, with a hint and error, required, optional, hidden label, disabled or multiline", async () => {
    const { container } = render(
      <main>
        <TextField label="Name" />
        <TextField label="Search" type="search" defaultValue="x" />
        <TextField label="Email" hint="Hint" error="Error" required />
        <TextField label="Hidden" hideLabel />
        <TextField label="Disabled" disabled />
        <TextField label="Role" optional />
        <TextField label="Message" multiline hint="Hint" error="Error" required />
      </main>,
    );

    await expectNoAxeViolations(container);
  });
});
