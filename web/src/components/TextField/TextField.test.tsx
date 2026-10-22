import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
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

  it("sets the size on the root, md by default, with className and style there too (R10.9)", () => {
    const { container, rerender } = render(<TextField label="A" />);
    const root = container.firstElementChild;
    expect(root).toHaveClass(styles.root ?? "", styles.md ?? "");

    rerender(<TextField label="A" size="sm" className="wide" style={{ maxWidth: "10em" }} />);
    expect(root).toHaveClass(styles.sm ?? "", "wide");
    expect(root).toHaveAttribute("style", "max-width: 10em;");
    expect(screen.getByRole("textbox")).not.toHaveClass("wide");
  });

  it("has no axe violations at rest, filled, with a hint and error, required, hidden label or disabled", async () => {
    const { container } = render(
      <main>
        <TextField label="Name" />
        <TextField label="Search" type="search" defaultValue="x" />
        <TextField label="Email" hint="Hint" error="Error" required />
        <TextField label="Hidden" hideLabel />
        <TextField label="Disabled" disabled />
      </main>,
    );

    await expectNoAxeViolations(container);
  });
});
