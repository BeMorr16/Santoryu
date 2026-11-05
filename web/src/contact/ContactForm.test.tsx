import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent, { type UserEvent } from "@testing-library/user-event";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { expectNoAxeViolations } from "../../test/axe.ts";
import { expectHydratesCleanly } from "../../test/component.tsx";
import { contactFormContent as content } from "../content/contact.ts";
import { linkedinUrl } from "../site.config.ts";
import cardStyles from "../components/Card/Card.module.css";
import { ContactForm } from "./ContactForm.tsx";
import styles from "./ContactForm.module.css";
import { loadTurnstile } from "./turnstile.ts";

const form = (
  <MemoryRouter>
    <ContactForm />
  </MemoryRouter>
);

type WidgetOptions = {
  callback: (token: string) => void;
  "error-callback": () => void;
  "before-interactive-callback": () => void;
  "after-interactive-callback": () => void;
};

/** What the fake widget does when rendered. */
let widgetBehavior: (options: WidgetOptions) => void;

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });

function stubApi(response: () => Response | Promise<Response>) {
  const fetchStub = vi.fn<typeof fetch>(() => Promise.resolve(response()));
  vi.stubGlobal("fetch", fetchStub);
  return fetchStub;
}

const field = (label: string) => screen.getByRole("textbox", { name: new RegExp(`^${label}`) });

async function fillValid(user: UserEvent) {
  await user.type(field(content.labels.name), "Ada");
  await user.type(field(content.labels.email), "ada@example.com");
  await user.type(field(content.labels.message), "Hello");
}

const submitButton = () => screen.getByRole("button", { name: content.submit });

beforeAll(async () => {
  // One load for the whole file: the module caches it, and jsdom doesn't fetch scripts.
  const loaded = loadTurnstile();
  document.querySelector('script[src*="challenges"]')?.dispatchEvent(new Event("load"));
  await loaded;
});

beforeEach(() => {
  widgetBehavior = (options) => {
    options.callback("token");
  };
  (window as unknown as { turnstile: unknown }).turnstile = {
    render: (_container: HTMLElement, options: WidgetOptions) => {
      queueMicrotask(() => {
        widgetBehavior(options);
      });
      return "widget";
    },
    remove: () => undefined,
  };
  stubApi(() => new Response(null, { status: 204 }));
});

afterEach(() => {
  vi.unstubAllGlobals();
  Reflect.deleteProperty(window, "turnstile");
});

describe("ContactForm: fields (R1)", () => {
  it("is an outlined card, capped in width, named by its h2", () => {
    render(form);

    const section = screen.getByRole("region", { name: content.heading });
    expect(within(section).getByRole("heading", { level: 2 })).toHaveTextContent(content.heading);
    expect(section).toHaveClass(cardStyles.outlined ?? "", styles.card ?? "");
  });

  it("has the fields in order, with required and optional cues and autocomplete (R1.3)", () => {
    render(form);

    const name = screen.getByRole("textbox", { name: content.labels.name });
    const email = screen.getByRole("textbox", { name: content.labels.email });
    const subject = screen.getByRole("textbox", { name: `${content.labels.subject} (optional)` });
    const message = screen.getByRole("textbox", { name: content.labels.message });

    expect(screen.getAllByRole("textbox")).toEqual([name, email, subject, message]);
    expect(name).toBeRequired();
    expect(name).toHaveAttribute("autocomplete", "name");
    expect(email).toBeRequired();
    expect(email).toHaveAttribute("type", "email");
    expect(email).toHaveAttribute("autocomplete", "email");
    expect(subject).not.toBeRequired();
    expect(subject).toHaveAttribute("autocomplete", "organization");
    expect(message).toBeRequired();
    expect(message.tagName).toBe("TEXTAREA");
    expect(screen.getAllByText("(required)")).toHaveLength(3);
  });

  it("shows the privacy line before the submit button (R1.4)", () => {
    render(form);

    const privacy = screen.getByText(content.privacy);
    expect(privacy.compareDocumentPosition(submitButton())).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it("sets no maxLength, so pasted text isn't silently cut off (R1.5)", () => {
    render(form);

    for (const input of screen.getAllByRole("textbox")) {
      expect(input).not.toHaveAttribute("maxlength");
    }
  });

  it("has no email address in its markup (R9.4)", () => {
    const { container } = render(form);

    expect(container.innerHTML).not.toContain("mailto:");
    expect(container.innerHTML).not.toContain("@ben-morrison.com");
  });
});

describe("ContactForm: before it's interactive (R4)", () => {
  it("prerenders its heading and fields, disabled, so it can't submit natively", () => {
    const holder = document.createElement("div");
    holder.innerHTML = renderToString(form);

    expect(holder.querySelector("h2")).toHaveTextContent(content.heading);
    expect(holder.querySelectorAll("input, textarea")).toHaveLength(4);
    expect(holder.querySelector("fieldset")).toBeDisabled();
    expect(holder.querySelector("form")).not.toHaveAttribute("action");
  });

  it("enables its controls after hydration", () => {
    render(form);

    expect(field(content.labels.name)).toBeEnabled();
    expect(submitButton()).toBeEnabled();
  });

  it("has the no-JavaScript message in the prerendered HTML", () => {
    expect(renderToString(form)).toContain(`<noscript>`);
    expect(renderToString(form).replaceAll("&#x27;", "'")).toContain(content.noScript);
  });

  it("hydrates cleanly, only enabling the form", () => {
    expectHydratesCleanly(form, (html) => html.replace('<fieldset disabled=""', "<fieldset"));
  });
});

describe("ContactForm: validation (R2)", () => {
  it("shows no errors at first, then every field's error, focusing the first (R2.1, R2.3, R2.5)", async () => {
    const user = userEvent.setup();
    const fetchStub = stubApi(() => new Response(null, { status: 204 }));
    render(form);
    expect(screen.queryByText(content.errors.name.missing)).toBeNull();

    await user.click(submitButton());

    const name = field(content.labels.name);
    expect(name).toBeInvalid();
    expect(name).toHaveFocus();
    expect(name).toHaveAccessibleDescription(content.errors.name.missing);
    expect(field(content.labels.email)).toHaveAccessibleDescription(content.errors.email.missing);
    expect(field(content.labels.message)).toHaveAccessibleDescription(
      content.errors.message.missing,
    );
    expect(field(content.labels.subject)).toBeValid();
    expect(fetchStub).not.toHaveBeenCalled();
  });

  it("focuses the first invalid field, not always the first field", async () => {
    const user = userEvent.setup();
    render(form);
    await user.type(field(content.labels.name), "Ada");
    await user.type(field(content.labels.email), "nope");

    await user.click(submitButton());

    expect(field(content.labels.email)).toHaveFocus();
    expect(field(content.labels.email)).toHaveAccessibleDescription(content.errors.email.invalid);
  });

  it("updates and clears an error as the field changes (R2.4)", async () => {
    const user = userEvent.setup();
    render(form);
    await user.click(submitButton());
    const email = field(content.labels.email);

    await user.type(email, "ada@");
    expect(email).toHaveAccessibleDescription(content.errors.email.invalid);

    await user.type(email, "example.com");
    expect(email).toBeValid();
    expect(email).not.toHaveAccessibleDescription();
  });

  it("explains an over-long value (R2.2)", async () => {
    const user = userEvent.setup();
    render(form);
    await user.click(field(content.labels.name));
    await user.paste("n".repeat(101));

    await user.click(submitButton());

    expect(field(content.labels.name)).toHaveAccessibleDescription(content.errors.name.tooLong);
  });
});

describe("ContactForm: sending (R3)", () => {
  it("submits with Enter in a single-line field, sending one message (R3.1)", async () => {
    const user = userEvent.setup();
    const fetchStub = stubApi(() => new Response(null, { status: 204 }));
    render(form);
    await fillValid(user);

    await user.click(field(content.labels.email));
    await user.keyboard("{Enter}");

    expect(await screen.findByRole("heading", { name: content.successHeading })).toBeVisible();
    expect(fetchStub).toHaveBeenCalledOnce();
  });

  it("doesn't submit with Enter in the message, which adds a line", async () => {
    const user = userEvent.setup();
    const fetchStub = stubApi(() => new Response(null, { status: 204 }));
    render(form);
    await fillValid(user);

    await user.click(field(content.labels.message));
    await user.keyboard("{Enter}");

    expect(fetchStub).not.toHaveBeenCalled();
    expect(field(content.labels.message)).toHaveValue("Hello\n");
  });

  it("shows and announces sending, and ignores another submit (R3.2)", async () => {
    const user = userEvent.setup();
    let respond: (response: Response) => void = () => undefined;
    const fetchStub = stubApi(
      () =>
        new Promise<Response>((resolve) => {
          respond = resolve;
        }),
    );
    render(form);
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
    await fillValid(user);

    await user.click(submitButton());

    const sending = await screen.findByRole("button", { name: content.sending });
    expect(screen.getByRole("status")).toHaveTextContent(content.sending);
    await waitFor(() => {
      expect(fetchStub).toHaveBeenCalledOnce();
    });

    await user.click(sending);
    respond(new Response(null, { status: 204 }));
    expect(await screen.findByRole("heading", { name: content.successHeading })).toBeVisible();
    // Checked after everything has settled, since a second send would come after its token.
    expect(fetchStub).toHaveBeenCalledOnce();
  });

  it("gives way to the success panel, with focus on its heading (R3.3)", async () => {
    const user = userEvent.setup();
    render(form);
    await fillValid(user);

    await user.click(submitButton());

    const heading = await screen.findByRole("heading", { name: content.successHeading });
    expect(heading).toHaveFocus();
    expect(screen.getByText(content.successText)).toBeVisible();
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.getByRole("region", { name: content.successHeading })).toHaveClass(
      cardStyles.outlined ?? "",
      styles.card ?? "",
    );
  });

  it("gives an empty form with focus on Name after Send another (R3.4)", async () => {
    const user = userEvent.setup();
    render(form);
    await fillValid(user);
    await user.click(submitButton());

    await user.click(await screen.findByRole("button", { name: content.sendAnother }));

    const name = field(content.labels.name);
    expect(name).toHaveValue("");
    expect(name).toHaveFocus();
    expect(field(content.labels.message)).toHaveValue("");
    expect(name).toHaveAttribute("aria-invalid", "false");
    expect(name).not.toHaveAccessibleDescription();
  });

  it.each([
    ["a network error", () => Promise.reject(new TypeError("offline"))],
    ["a 503", () => json(503, { error: "unavailable" })],
    ["the 404 page a WAF block becomes", () => new Response("<html>", { status: 404 })],
    ["a bad request", () => json(400, { error: "badRequest" })],
  ])("keeps the text and alerts with a LinkedIn link on %s (R3.5)", async (_name, response) => {
    const user = userEvent.setup();
    stubApi(response);
    render(form);
    await fillValid(user);

    await user.click(submitButton());

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(content.sendFailed.before.trim());
    const link = within(alert).getByRole("link", { name: /LinkedIn.*opens in new tab/ });
    expect(link).toHaveAttribute("href", linkedinUrl);
    // A new tab, so following it doesn't lose what the visitor wrote.
    expect(link).toHaveAttribute("target", "_blank");
    expect(field(content.labels.message)).toHaveValue("Hello");
    expect(submitButton()).toBeEnabled();
  });

  it("shows the API's field errors on their fields, focusing the first (R3.6)", async () => {
    const user = userEvent.setup();
    stubApi(() => json(400, { error: "validation", fields: { email: "invalid" } }));
    render(form);
    await fillValid(user);

    await user.click(submitButton());

    await waitFor(() => {
      expect(field(content.labels.email)).toHaveFocus();
    });
    expect(field(content.labels.email)).toHaveAccessibleDescription(content.errors.email.invalid);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it.each([
    ["the API rejects the token", () => stubApi(() => json(400, { error: "challenge" }))],
    [
      "the challenge errors",
      () => {
        widgetBehavior = (options) => {
          options["error-callback"]();
        };
        return stubApi(() => new Response(null, { status: 204 }));
      },
    ],
  ])(
    "keeps the text and alerts with a LinkedIn link when %s (R3.7, R5.4)",
    async (_name, arrange) => {
      const user = userEvent.setup();
      arrange();
      render(form);
      await fillValid(user);

      await user.click(submitButton());

      const alert = await screen.findByRole("alert");
      expect(alert).toHaveTextContent(content.challengeFailed.before.trim());
      expect(within(alert).getByRole("link", { name: /LinkedIn/ })).toHaveAttribute(
        "href",
        linkedinUrl,
      );
      expect(field(content.labels.message)).toHaveValue("Hello");
    },
  );

  it("makes the fields read-only while sending, and editable again after a failure", async () => {
    const user = userEvent.setup();
    let respond: (response: Response) => void = () => undefined;
    stubApi(
      () =>
        new Promise<Response>((resolve) => {
          respond = resolve;
        }),
    );
    render(form);
    await fillValid(user);
    expect(field(content.labels.message)).not.toHaveAttribute("readonly");

    await user.click(submitButton());

    await screen.findByRole("button", { name: content.sending });
    expect(field(content.labels.message)).toHaveAttribute("readonly");
    expect(field(content.labels.name)).toHaveAttribute("readonly");

    respond(json(503, { error: "unavailable" }));
    await screen.findByRole("alert");
    expect(field(content.labels.message)).not.toHaveAttribute("readonly");
  });

  it("doesn't mark a half-typed email invalid before any attempt (R2.5)", async () => {
    const user = userEvent.setup();
    render(form);

    await user.type(field(content.labels.email), "ada@");

    expect(field(content.labels.email)).toHaveAttribute("aria-invalid", "false");
  });

  it("clears the failure alert when the next attempt finds field errors", async () => {
    const user = userEvent.setup();
    stubApi(() => json(503, { error: "unavailable" }));
    render(form);
    await fillValid(user);
    await user.click(submitButton());
    await screen.findByRole("alert");

    await user.clear(field(content.labels.name));
    await user.click(submitButton());

    expect(screen.queryByRole("alert")).toBeNull();
    expect(field(content.labels.name)).toHaveFocus();
  });

  it("scrolls the alert and button into view, since Enter may have come from a top field", async () => {
    const user = userEvent.setup();
    const scroll = vi.spyOn(Element.prototype, "scrollIntoView");
    stubApi(() => json(503, { error: "unavailable" }));
    render(form);
    await fillValid(user);

    await user.click(submitButton());
    const alert = await screen.findByRole("alert");

    await waitFor(() => {
      expect(scroll).toHaveBeenCalledWith({ block: "nearest" });
    });
    expect(scroll.mock.contexts[0]).toContainElement(alert);
    expect(scroll.mock.contexts[0]).toContainElement(submitButton());
    scroll.mockRestore();
  });

  it("sends nothing when the challenge errors (R5.4)", async () => {
    const user = userEvent.setup();
    widgetBehavior = (options) => {
      options["error-callback"]();
    };
    const fetchStub = stubApi(() => new Response(null, { status: 204 }));
    render(form);
    await fillValid(user);

    await user.click(submitButton());

    await screen.findByRole("alert");
    expect(fetchStub).not.toHaveBeenCalled();
  });

  it("can send again after a failure, clearing the alert", async () => {
    const user = userEvent.setup();
    stubApi(() => json(503, { error: "unavailable" }));
    render(form);
    await fillValid(user);
    await user.click(submitButton());
    await screen.findByRole("alert");

    stubApi(() => new Response(null, { status: 204 }));
    await user.click(submitButton());

    expect(await screen.findByRole("heading", { name: content.successHeading })).toBeVisible();
  });
});

describe("ContactForm: announcing and focus (WCAG 4.1.3, 2.4.3)", () => {
  it("announces the error when the invalid field already has focus, every time", async () => {
    const user = userEvent.setup();
    render(form);
    const name = field(content.labels.name);
    await user.click(name);
    expect(screen.getByRole("status")).toBeEmptyDOMElement();

    await user.keyboard("{Enter}");

    expect(name).toHaveFocus();
    expect(screen.getByRole("status").textContent).toBe(content.errors.name.missing);

    // The text has to change, or a screen reader won't read it again.
    await user.keyboard("{Enter}");
    expect(screen.getByRole("status").textContent).toBe(`${content.errors.name.missing}\u00a0`);
  });

  it("doesn't use the status region when focus moves to the field, which reads the error", async () => {
    const user = userEvent.setup();
    render(form);

    await user.click(submitButton());

    expect(field(content.labels.name)).toHaveFocus();
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("announces a server's error on the field that has focus", async () => {
    const user = userEvent.setup();
    stubApi(() => json(400, { error: "validation", fields: { email: "invalid" } }));
    render(form);
    await fillValid(user);
    await user.click(field(content.labels.email));

    await user.keyboard("{Enter}");

    await waitFor(() => {
      expect(screen.getByRole("status").textContent).toBe(content.errors.email.invalid);
    });
    expect(field(content.labels.email)).toHaveFocus();
  });

  it("rescues focus the widget dropped, moving it to the submit button", async () => {
    const user = userEvent.setup();
    widgetBehavior = (options) => {
      // Closing the widget while focus is inside it leaves focus on the page.
      (document.activeElement as HTMLElement | null)?.blur();
      options["error-callback"]();
    };
    render(form);
    await fillValid(user);

    await user.click(submitButton());

    await screen.findByRole("alert");
    await waitFor(() => {
      expect(submitButton()).toHaveFocus();
    });
  });

  it("leaves focus alone after a failure if the visitor has moved on", async () => {
    const user = userEvent.setup();
    let respond: (response: Response) => void = () => undefined;
    stubApi(
      () =>
        new Promise<Response>((resolve) => {
          respond = resolve;
        }),
    );
    render(form);
    await fillValid(user);
    await user.click(submitButton());
    await screen.findByRole("button", { name: content.sending });

    await user.click(field(content.labels.subject));
    respond(json(503, { error: "unavailable" }));

    await screen.findByRole("alert");
    expect(field(content.labels.subject)).toHaveFocus();
  });

  describe("when Cloudflare needs the visitor (R5.3)", () => {
    const waitingForVisitor = () => {
      let widget: WidgetOptions | undefined;
      widgetBehavior = (options) => {
        widget = options;
        options["before-interactive-callback"]();
      };
      return () => widget as WidgetOptions;
    };

    it("says so, on screen and to screen readers, moves focus there, and changes the button", async () => {
      const user = userEvent.setup();
      waitingForVisitor();
      render(form);
      await fillValid(user);

      await user.click(submitButton());

      const prompt = await screen.findByText(content.challengePrompt, { selector: "p" });
      expect(prompt).toBeVisible();
      expect(prompt).toHaveFocus();
      expect(screen.getByRole("status")).toHaveTextContent(content.challengePrompt);
      expect(screen.getByRole("button", { name: content.waiting })).toBeInTheDocument();
    });

    it("goes back to sending when the check is done, then sends", async () => {
      const user = userEvent.setup();
      const widget = waitingForVisitor();
      const fetchStub = stubApi(() => new Response(null, { status: 204 }));
      render(form);
      await fillValid(user);
      await user.click(submitButton());
      await screen.findByText(content.challengePrompt, { selector: "p" });
      expect(fetchStub).not.toHaveBeenCalled();

      act(() => {
        widget()["after-interactive-callback"]();
        widget().callback("token");
      });

      expect(await screen.findByRole("heading", { name: content.successHeading })).toBeVisible();
      expect(fetchStub).toHaveBeenCalledOnce();
    });

    it("doesn't take focus from a visitor who has left the form", async () => {
      const user = userEvent.setup();
      render(
        <>
          <button type="button">Elsewhere</button>
          {form}
        </>,
      );
      await fillValid(user);
      let widget: WidgetOptions | undefined;
      widgetBehavior = (options) => {
        widget = options;
      };
      await user.click(submitButton());
      await waitFor(() => {
        expect(widget).toBeDefined();
      });

      const elsewhere = screen.getByRole("button", { name: "Elsewhere" });
      await user.click(elsewhere);
      act(() => {
        widget?.["before-interactive-callback"]();
      });

      await screen.findByText(content.challengePrompt, { selector: "p" });
      expect(elsewhere).toHaveFocus();
    });
  });
});

describe("ContactForm: accessibility (R1.6)", () => {
  it("has no axe violations when empty", async () => {
    const { container } = render(<main>{form}</main>);

    await expectNoAxeViolations(container);
  });

  it("has no axe violations with field errors", async () => {
    const user = userEvent.setup();
    const { container } = render(<main>{form}</main>);
    await user.click(submitButton());

    await expectNoAxeViolations(container);
  });

  it("has no axe violations with a failure alert", async () => {
    const user = userEvent.setup();
    stubApi(() => json(503, { error: "unavailable" }));
    const { container } = render(<main>{form}</main>);
    await fillValid(user);
    await user.click(submitButton());
    await screen.findByRole("alert");

    await expectNoAxeViolations(container);
  });

  it("has no axe violations while waiting for the visitor", async () => {
    const user = userEvent.setup();
    widgetBehavior = (options) => {
      options["before-interactive-callback"]();
    };
    const { container } = render(<main>{form}</main>);
    await fillValid(user);
    await user.click(submitButton());
    await screen.findByText(content.challengePrompt, { selector: "p" });

    await expectNoAxeViolations(container);
  });

  it("has no axe violations once sent", async () => {
    const user = userEvent.setup();
    const { container } = render(<main>{form}</main>);
    await fillValid(user);
    await user.click(submitButton());
    await screen.findByRole("heading", { name: content.successHeading });

    await expectNoAxeViolations(container);
  });
});
