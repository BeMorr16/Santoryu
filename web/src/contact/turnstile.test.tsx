import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type Options = {
  sitekey: string;
  action: string;
  appearance: string;
  retry: string;
  theme: string;
  callback: (token: string) => void;
  "error-callback": () => void;
  "expired-callback": () => void;
  "timeout-callback": () => void;
  "before-interactive-callback": () => void;
  "after-interactive-callback": () => void;
  size: string;
  "refresh-timeout": string;
};

const scriptSelector = 'script[src*="challenges.cloudflare.com"]';

/** A fresh copy of the module, so each test starts with nothing loaded. */
async function loadModule() {
  vi.resetModules();
  return import("./turnstile.ts");
}

function loadedScript() {
  const script = document.querySelector<HTMLScriptElement>(scriptSelector);
  script?.dispatchEvent(new Event("load"));
}

function failedScript() {
  document.querySelector(scriptSelector)?.dispatchEvent(new Event("error"));
}

function fakeTurnstile() {
  const render = vi.fn<(container: HTMLElement, options: Options) => string>(() => "widget-1");
  const remove = vi.fn<(id: string) => void>();
  (window as unknown as { turnstile: unknown }).turnstile = { render, remove };
  return { render, remove };
}

/** Starts a token request and waits until the widget is rendered. */
async function started() {
  const { requestToken } = await loadModule();
  const fake = fakeTurnstile();
  const token = requestToken(document.createElement("div"));
  loadedScript();
  await vi.waitFor(() => {
    expect(fake.render).toHaveBeenCalledOnce();
  });
  const options = fake.render.mock.calls[0]?.[1] as Options;
  return { ...fake, token, options };
}

beforeEach(() => {
  document.head.innerHTML = "";
});

afterEach(() => {
  vi.useRealTimers();
  Reflect.deleteProperty(window, "turnstile");
  document.documentElement.style.colorScheme = "";
});

describe("loadTurnstile (R5.1, R5.4)", () => {
  it("adds nothing until it's called", async () => {
    await loadModule();
    expect(document.querySelector(scriptSelector)).toBeNull();
  });

  it("adds one explicit-render script across repeated loads", async () => {
    const { loadTurnstile } = await loadModule();

    const first = loadTurnstile();
    const second = loadTurnstile();

    expect(document.querySelectorAll(scriptSelector)).toHaveLength(1);
    expect(document.querySelector<HTMLScriptElement>(scriptSelector)?.src).toBe(
      "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit",
    );
    loadedScript();
    await expect(Promise.all([first, second])).resolves.toBeDefined();
    await loadTurnstile();
    expect(document.querySelectorAll(scriptSelector)).toHaveLength(1);
  });

  it("can retry after a failed load", async () => {
    const { loadTurnstile } = await loadModule();

    const first = loadTurnstile();
    failedScript();
    await expect(first).rejects.toThrow("failed to load");
    expect(document.querySelector(scriptSelector)).toBeNull();

    const second = loadTurnstile();
    expect(document.querySelectorAll(scriptSelector)).toHaveLength(1);
    loadedScript();
    await expect(second).resolves.toBeUndefined();
  });
});

describe("requestToken (R5.2–R5.5)", () => {
  it("renders managed, interaction-only, for the contact action, with no automatic retry", async () => {
    const { options, token } = await started();

    expect(options).toMatchObject({
      action: "contact",
      appearance: "interaction-only",
      retry: "never",
    });
    options.callback("t");
    await token;
  });

  it("uses Cloudflare's test key in development, never the real one", async () => {
    const { options, token } = await started();

    expect(options.sitekey).toBe("1x00000000000000000000AA");
    options.callback("t");
    await token;
  });

  it("resolves with the token, and removes the widget", async () => {
    const { options, token, remove } = await started();

    options.callback("the-token");

    await expect(token).resolves.toBe("the-token");
    expect(remove).toHaveBeenCalledExactlyOnceWith("widget-1");
  });

  it.each(["error-callback", "expired-callback", "timeout-callback"] as const)(
    "rejects on %s, and removes the widget",
    async (name) => {
      const { options, token, remove } = await started();

      options[name]();

      await expect(token).rejects.toThrow("challenge failed");
      expect(remove).toHaveBeenCalledExactlyOnceWith("widget-1");
    },
  );

  it("renders one widget per token", async () => {
    const { requestToken } = await loadModule();
    const { render, remove } = fakeTurnstile();
    const container = document.createElement("div");

    const first = requestToken(container);
    loadedScript();
    await vi.waitFor(() => {
      expect(render).toHaveBeenCalledTimes(1);
    });
    (render.mock.calls[0]?.[1] as Options).callback("one");
    await first;

    const second = requestToken(container);
    await vi.waitFor(() => {
      expect(render).toHaveBeenCalledTimes(2);
    });
    (render.mock.calls[1]?.[1] as Options).callback("two");

    await expect(second).resolves.toBe("two");
    expect(remove).toHaveBeenCalledTimes(2);
  });

  it("uses the compact widget where the normal one wouldn't fit, and normal otherwise (WCAG 1.4.10)", async () => {
    const { requestToken } = await loadModule();
    const { render } = fakeTurnstile();
    const sized = (width: number) => {
      const container = document.createElement("div");
      Object.defineProperty(container, "clientWidth", { value: width });
      return container;
    };

    void requestToken(sized(258));
    void requestToken(sized(300));
    loadedScript();
    await vi.waitFor(() => {
      expect(render).toHaveBeenCalledTimes(2);
    });

    expect(render.mock.calls.map(([, options]) => options.size)).toEqual(["compact", "normal"]);
  });

  it("lets Cloudflare refresh its own check instead of failing the visitor (WCAG 2.2.1)", async () => {
    const { options, token } = await started();

    expect(options["refresh-timeout"]).toBe("auto");
    options.callback("t");
    await token;
  });

  it("reports when Cloudflare starts and stops waiting for the visitor", async () => {
    const { requestToken } = await loadModule();
    const { render } = fakeTurnstile();
    const onInteractive = vi.fn();
    const onInteractiveEnd = vi.fn();
    const token = requestToken(document.createElement("div"), { onInteractive, onInteractiveEnd });
    loadedScript();
    await vi.waitFor(() => {
      expect(render).toHaveBeenCalledOnce();
    });
    const options = render.mock.calls[0]?.[1] as Options;

    options["before-interactive-callback"]();
    expect(onInteractive).toHaveBeenCalledOnce();
    expect(onInteractiveEnd).not.toHaveBeenCalled();
    options["after-interactive-callback"]();
    expect(onInteractiveEnd).toHaveBeenCalledOnce();

    options.callback("t");
    await expect(token).resolves.toBe("t");
  });

  it("sets no time limit while the visitor is working on the check, then starts one again (WCAG 2.2.1)", async () => {
    vi.useFakeTimers();
    const { requestToken } = await loadModule();
    const { render, remove } = fakeTurnstile();
    const token = requestToken(document.createElement("div"));
    const outcome = expect(token).rejects.toThrow("challenge failed");
    loadedScript();
    await vi.advanceTimersByTimeAsync(0);
    const options = render.mock.calls[0]?.[1] as Options;

    options["before-interactive-callback"]();
    await vi.advanceTimersByTimeAsync(600_000);
    expect(remove).not.toHaveBeenCalled();

    options["after-interactive-callback"]();
    await vi.advanceTimersByTimeAsync(120_000);
    await outcome;
    expect(remove).toHaveBeenCalledOnce();
  });

  it("rejects when the script stalls and neither loads nor fails (R5.4)", async () => {
    vi.useFakeTimers();
    const { requestToken } = await loadModule();
    const { render } = fakeTurnstile();
    const token = requestToken(document.createElement("div"));
    const outcome = expect(token).rejects.toThrow("challenge failed");

    await vi.advanceTimersByTimeAsync(120_000);

    await outcome;
    expect(render).not.toHaveBeenCalled();
  });

  it("doesn't render a widget if the script loads after the limit passed", async () => {
    vi.useFakeTimers();
    const { requestToken } = await loadModule();
    const { render } = fakeTurnstile();
    const token = requestToken(document.createElement("div"));
    const outcome = expect(token).rejects.toThrow("challenge failed");
    await vi.advanceTimersByTimeAsync(120_000);
    await outcome;

    loadedScript();
    await vi.advanceTimersByTimeAsync(0);

    expect(render).not.toHaveBeenCalled();
  });

  it("rejects when no callback fires within the overall limit", async () => {
    vi.useFakeTimers();
    const { requestToken } = await loadModule();
    const { render, remove } = fakeTurnstile();
    const token = requestToken(document.createElement("div"));
    const outcome = expect(token).rejects.toThrow("challenge failed");
    loadedScript();
    await vi.advanceTimersByTimeAsync(0);
    expect(render).toHaveBeenCalledOnce();

    await vi.advanceTimersByTimeAsync(119_999);
    expect(remove).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);

    await outcome;
    expect(remove).toHaveBeenCalledOnce();
  });

  it("rejects when the script fails to load, without rendering", async () => {
    const { requestToken } = await loadModule();
    const { render } = fakeTurnstile();

    const token = requestToken(document.createElement("div"));
    failedScript();

    await expect(token).rejects.toThrow("failed to load");
    expect(render).not.toHaveBeenCalled();
  });

  it("rejects when the script loads but offers no API", async () => {
    const { requestToken } = await loadModule();

    const token = requestToken(document.createElement("div"));
    loadedScript();

    await expect(token).rejects.toThrow("isn't available");
  });

  it.each([
    ["dark", "dark"],
    ["light", "light"],
    ["", "auto"],
  ])("gives the widget a theme for color-scheme %j: %s", async (scheme, theme) => {
    document.documentElement.style.colorScheme = scheme;
    const { options, token } = await started();

    expect(options.theme).toBe(theme);
    options.callback("t");
    await token;
  });
});
