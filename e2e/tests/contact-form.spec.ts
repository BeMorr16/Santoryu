import { createHash } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { contactFormContent as content } from "../../web/src/content/contact.ts";
import { homeContent } from "../../web/src/content/home.ts";
import {
  contactSubmit,
  fillContactForm,
  gotoSettled,
  main,
  stubChallengeScript,
  tabKey,
} from "./support.ts";

declare global {
  interface Window {
    contactFormCspViolations: string[];
  }
}

const field = (page: Page, label: string) =>
  page.getByRole("textbox", { name: new RegExp(`^${label}`) });

const challengeRequests = (page: Page) => {
  const requests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("challenges.cloudflare.com")) requests.push(request.url());
  });
  return requests;
};

/** Answers the API with this response, and returns what was sent to it. */
async function stubApi(page: Page, status: number, json?: unknown) {
  const sent: { body: Buffer; headers: Record<string, string>; url: string }[] = [];
  await page.route("**/api/contact", async (route) => {
    const request = route.request();
    sent.push({
      body: request.postDataBuffer() ?? Buffer.alloc(0),
      headers: await request.allHeaders(),
      url: request.url(),
    });
    await route.fulfill(json === undefined ? { status } : { status, json });
  });
  return sent;
}

async function openForm(page: Page) {
  await stubChallengeScript(page);
  await gotoSettled(page, "/contact");
  await expect(contactSubmit(page)).toBeEnabled();
}

test.describe("sending (R3)", () => {
  test("sends one message, with the SHA-256 of its exact bytes, then shows the success panel (R3.1, R3.3)", async ({
    page,
  }) => {
    const sent = await stubApi(page, 204);
    await openForm(page);
    await fillContactForm(page);

    await contactSubmit(page).click();

    const heading = page.getByRole("heading", { name: content.successHeading });
    await expect(heading).toBeFocused();
    await expect(page.getByText(content.successText)).toBeVisible();
    expect(sent).toHaveLength(1);
    const [request] = sent;
    expect(new URL(request?.url ?? "").pathname).toBe("/api/contact");
    expect(request?.headers["content-type"]).toBe("application/json");
    expect(request?.headers["x-amz-content-sha256"]).toBe(
      createHash("sha256")
        .update(request?.body ?? "")
        .digest("hex"),
    );
    expect(JSON.parse(request?.body.toString("utf8") ?? "")).toEqual({
      name: "Ada Lovelace",
      email: "ada@example.com",
      subject: "",
      message: "Hello",
      challengeToken: "stub-token",
    });
  });

  test("gives an empty form with focus on Name after Send another (R3.4)", async ({ page }) => {
    await stubApi(page, 204);
    await openForm(page);
    await fillContactForm(page);
    await contactSubmit(page).click();

    await page.getByRole("button", { name: content.sendAnother }).click();

    await expect(field(page, content.labels.name)).toBeFocused();
    await expect(field(page, content.labels.name)).toHaveValue("");
    await expect(field(page, content.labels.message)).toHaveValue("");
  });

  test("shows sending, and sends once however often it's pressed (R3.2)", async ({ page }) => {
    let requests = 0;
    await page.route("**/api/contact", () => {
      requests++;
    });
    await openForm(page);
    await fillContactForm(page);

    await contactSubmit(page).click();

    const sending = page.getByRole("button", { name: content.sending });
    await expect(sending).toBeVisible();
    await expect(page.getByRole("status").filter({ hasText: content.sending })).toBeAttached();
    await expect.poll(() => requests).toBe(1);
    await sending.click();
    expect(requests).toBe(1);
  });

  for (const [name, status, json, message] of [
    ["a 503", 503, { error: "unavailable" }, content.sendFailed],
    ["a challenge rejection", 400, { error: "challenge" }, content.challengeFailed],
    ["the 404 a WAF block becomes", 404, undefined, content.sendFailed],
  ] as const) {
    test(`keeps the text and alerts with a LinkedIn link on ${name} (R3.5, R3.7)`, async ({
      page,
    }) => {
      await stubApi(page, status, json);
      await openForm(page);
      await fillContactForm(page);

      await contactSubmit(page).click();

      const alert = page.getByRole("alert");
      await expect(alert).toContainText(message.before.trim());
      await expect(alert.getByRole("link", { name: /LinkedIn/ })).toBeVisible();
      await expect(field(page, content.labels.message)).toHaveValue("Hello");
      await expect(contactSubmit(page)).toBeEnabled();
    });
  }

  test("shows the API's field errors on their fields, focusing the first (R3.6)", async ({
    page,
  }) => {
    await stubApi(page, 400, { error: "validation", fields: { email: "invalid" } });
    await openForm(page);
    await fillContactForm(page);

    await contactSubmit(page).click();

    await expect(field(page, content.labels.email)).toBeFocused();
    await expect(page.getByText(content.errors.email.invalid)).toBeVisible();
  });
});

test.describe("validation, from the keyboard (R2)", () => {
  test("submits with Enter, focuses the first invalid field, and updates its error", async ({
    page,
  }) => {
    const sent = await stubApi(page, 204);
    await openForm(page);
    const name = field(page, content.labels.name);
    await expect(page.getByText(content.errors.name.missing)).toBeHidden();

    await name.focus();
    await page.keyboard.press("Enter");

    await expect(name).toBeFocused();
    await expect(name).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByText(content.errors.name.missing)).toBeVisible();
    expect(sent).toHaveLength(0);

    await page.keyboard.type("Ada");
    await expect(page.getByText(content.errors.name.missing)).toBeHidden();
  });

  test("tabs through the fields in order, then the submit button", async ({
    page,
    browserName,
  }) => {
    await openForm(page);
    await field(page, content.labels.name).focus();

    for (const next of [
      field(page, content.labels.email),
      field(page, content.labels.subject),
      field(page, content.labels.message),
      contactSubmit(page),
    ]) {
      await page.keyboard.press(tabKey(browserName));
      await expect(next).toBeFocused();
    }
  });
});

test.describe("the challenge (R5, R10)", () => {
  test("makes no request to Cloudflare until a control in the form has focus (R5.1)", async ({
    page,
  }) => {
    const requests = challengeRequests(page);
    await openForm(page);
    await main(page).getByRole("heading", { level: 1 }).scrollIntoViewIfNeeded();
    expect(requests).toEqual([]);

    await field(page, content.labels.name).focus();

    await expect.poll(() => requests.length).toBe(1);
    expect(requests[0]).toBe(
      "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit",
    );
  });

  test("makes no request to Cloudflare from another page, though the policy allows it (R10.2)", async ({
    page,
  }) => {
    const requests = challengeRequests(page);
    await stubChallengeScript(page);

    await gotoSettled(page, "/");
    await gotoSettled(page, "/experience");

    expect(requests).toEqual([]);
  });

  const watchCsp = async (page: Page) => {
    await page.addInitScript(() => {
      window.contactFormCspViolations = [];
      document.addEventListener("securitypolicyviolation", (event) => {
        window.contactFormCspViolations.push(`${event.violatedDirective}: ${event.blockedURI}`);
      });
    });
  };

  const expectSendWorks = async (page: Page) => {
    const sent = await stubApi(page, 204);
    await fillContactForm(page);
    await contactSubmit(page).click();

    await expect(page.getByRole("heading", { name: content.successHeading })).toBeVisible();
    expect(sent).toHaveLength(1);
    expect(await page.evaluate(() => "turnstile" in window)).toBe(true);
    expect(await page.evaluate(() => window.contactFormCspViolations)).toEqual([]);
  };

  test("runs under the real CSP on a direct load of /contact (R10.1, R10.4)", async ({ page }) => {
    await watchCsp(page);
    await openForm(page);

    await expectSendWorks(page);
  });

  test("runs under the policy of the page a visitor came from, after clicking through (R10.4)", async ({
    page,
  }) => {
    await watchCsp(page);
    await stubChallengeScript(page);
    await gotoSettled(page, "/");
    await page.evaluate(() => {
      (window as unknown as { sameDocument: boolean }).sameDocument = true;
    });

    await main(page).getByRole("link", { name: homeContent.contactLabel }).click();

    await expect(page).toHaveURL(/\/contact$/);
    // Still the document Home loaded, so its CSP is the one in force.
    expect(
      await page.evaluate(() => (window as unknown as { sameDocument?: boolean }).sameDocument),
    ).toBe(true);
    await expect(contactSubmit(page)).toBeEnabled();
    await expectSendWorks(page);
  });

  test("shows the challenge alert and sends nothing when the script is blocked (R5.4)", async ({
    page,
  }) => {
    await page.route("https://challenges.cloudflare.com/**", (route) => route.abort());
    const sent = await stubApi(page, 204);
    await gotoSettled(page, "/contact");
    await expect(contactSubmit(page)).toBeEnabled();
    await fillContactForm(page);

    await contactSubmit(page).click();

    await expect(page.getByRole("alert")).toContainText(content.challengeFailed.before.trim());
    expect(sent).toHaveLength(0);
    await expect(field(page, content.labels.message)).toHaveValue("Hello");
  });
});

test.describe("before it's interactive (R4)", () => {
  test.describe("without JavaScript", () => {
    test.use({ javaScriptEnabled: false });

    test("shows the message in place of the controls, and the links still work (R4.2)", async ({
      page,
    }) => {
      await page.goto("/contact");

      // Playwright's text search skips <noscript>, so this finds it by element.
      const message = page.locator("main noscript p");
      await expect(message).toBeVisible();
      await expect(message).toHaveText(content.noScript);
      await expect(page.getByRole("button", { name: content.submit })).toBeHidden();
      await expect(page.locator("main fieldset")).toBeHidden();
      await expect(main(page).getByRole("link", { name: "LinkedIn" })).toBeVisible();
    });
  });

  test("can't submit natively before hydration, so a message never reaches a URL (R4.1)", async ({
    page,
  }) => {
    // The app's scripts never load, so the page stays as prerendered.
    await page.route("**/assets/**.js", (route) => route.abort());
    await page.goto("/contact");

    await expect(page.locator("main fieldset")).toHaveAttribute("disabled");
    await expect(page.locator("main fieldset input").first()).toBeDisabled();
    await expect(page.locator("main fieldset textarea")).toBeDisabled();
    await expect(page.locator("main form button")).toBeDisabled();
    await page.locator("main form button").click({ force: true });

    await expect(page).toHaveURL(/\/contact$/);
  });
});

test("serves security.txt through the edge, as plain text, with the security headers (R14.1)", async ({
  request,
}) => {
  const response = await request.get("/.well-known/security.txt");

  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toBe("text/plain; charset=utf-8");
  expect(response.headers()["x-content-type-options"]).toBe("nosniff");
  const text = await response.text();
  expect(text).toMatch(/^Contact: https:\/\/.+\/contact$/m);
  expect(text).toMatch(/^Expires: \d{4}-\d{2}-\d{2}T/m);
  expect(text).toMatch(/^Preferred-Languages: en$/m);
});

test.describe("the card's width (R1.1)", () => {
  const widths = (page: Page) =>
    page.getByRole("region", { name: content.heading }).evaluate((card) => {
      const column = card.parentElement;
      if (!column) throw new Error("no column");
      return {
        card: card.getBoundingClientRect().width,
        column: column.getBoundingClientRect().width,
        borderStyle: getComputedStyle(card).borderTopStyle,
        borderWidth: parseFloat(getComputedStyle(card).borderTopWidth),
      };
    });

  test.describe("at 1280×720", () => {
    test.use({ viewport: { width: 1280, height: 720 } });

    test("is outlined, and narrower than the page's column", async ({ page }) => {
      await openForm(page);

      const { card, column, borderStyle, borderWidth } = await widths(page);
      expect(card).toBeLessThan(column);
      expect(borderStyle).toBe("solid");
      expect(borderWidth).toBeGreaterThan(0);
    });
  });

  test.describe("at 375×740", () => {
    test.use({ viewport: { width: 375, height: 740 } });

    test("fills the page's column", async ({ page }) => {
      await openForm(page);

      const { card, column } = await widths(page);
      expect(card).toBeCloseTo(column, 0);
    });
  });
});

test.describe("at 320×640 (R1)", () => {
  test.use({ viewport: { width: 320, height: 640 } });

  test("never scrolls sideways, in any state", async ({ page }) => {
    const noHorizontalScroll = () =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      );
    await stubApi(page, 503, { error: "unavailable" });
    await openForm(page);
    expect(await noHorizontalScroll()).toBe(true);

    await contactSubmit(page).click();
    await expect(page.getByText(content.errors.name.missing)).toBeVisible();
    expect(await noHorizontalScroll()).toBe(true);

    await fillContactForm(page);
    await contactSubmit(page).click();
    await expect(page.getByRole("alert")).toBeVisible();
    expect(await noHorizontalScroll()).toBe(true);
  });
});
