import { createHash } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { sendMessage, type SendPayload } from "./api.ts";

const payload: SendPayload = {
  name: "Ada 語",
  email: "ada@example.com",
  subject: "",
  message: "Line one\nLine two 😀",
  challengeToken: "token",
};

function stubFetch(response: Response | Error) {
  const fetchStub = vi.fn<typeof fetch>(() =>
    response instanceof Error ? Promise.reject(response) : Promise.resolve(response),
  );
  vi.stubGlobal("fetch", fetchStub);
  return fetchStub;
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("sendMessage (R3.1, R3.5, R6)", () => {
  it("posts JSON to the API, with the SHA-256 of the exact bytes it sends", async () => {
    const fetchStub = stubFetch(new Response(null, { status: 204 }));

    await sendMessage(payload);

    const [url, init] = fetchStub.mock.calls[0] ?? [];
    expect(url).toBe("/api/contact");
    expect(init?.method).toBe("POST");
    const body = init?.body as Uint8Array;
    const headers = init?.headers as Record<string, string>;
    expect(headers["content-type"]).toBe("application/json");
    expect(headers["x-amz-content-sha256"]).toBe(createHash("sha256").update(body).digest("hex"));
    expect(JSON.parse(new TextDecoder().decode(body))).toEqual(payload);
  });

  it("gives up after 20 seconds", async () => {
    const timeout = vi.spyOn(AbortSignal, "timeout");
    const fetchStub = stubFetch(new Response(null, { status: 204 }));

    await sendMessage(payload);

    expect(timeout).toHaveBeenCalledWith(20_000);
    expect(fetchStub.mock.calls[0]?.[1]?.signal).toBe(timeout.mock.results[0]?.value);
  });

  it("maps a 204 to sent", async () => {
    stubFetch(new Response(null, { status: 204 }));
    expect(await sendMessage(payload)).toEqual({ kind: "sent" });
  });

  it("maps a validation 400 to its field errors", async () => {
    stubFetch(json(400, { error: "validation", fields: { email: "invalid", name: "tooLong" } }));
    expect(await sendMessage(payload)).toEqual({
      kind: "fields",
      errors: { email: "invalid", name: "tooLong" },
    });
  });

  it("maps a challenge 400 to challenge", async () => {
    stubFetch(json(400, { error: "challenge" }));
    expect(await sendMessage(payload)).toEqual({ kind: "challenge" });
  });

  it.each([
    ["a badRequest 400", () => json(400, { error: "badRequest" })],
    ["a validation 400 with no fields", () => json(400, { error: "validation" })],
    ["a validation 400 with empty fields", () => json(400, { error: "validation", fields: {} })],
    [
      "a validation 400 naming an unknown field",
      () => json(400, { error: "validation", fields: { other: "missing" } }),
    ],
    [
      "a validation 400 with an unknown code",
      () => json(400, { error: "validation", fields: { name: "odd" } }),
    ],
    ["a 400 with an unknown error", () => json(400, { error: "other" })],
    ["a 400 whose JSON is null", () => json(400, null)],
    ["a 400 with invalid JSON", () => new Response("not json", { status: 400 })],
    ["a 503", () => json(503, { error: "unavailable" })],
    ["a 429", () => new Response(null, { status: 429 })],
    [
      "a 404 HTML page, which is what a WAF block becomes",
      () => new Response("<html>", { status: 404 }),
    ],
    ["an unexpected 200", () => json(200, { ok: true })],
  ])("maps %s to failed", async (_name, response) => {
    stubFetch(response());
    expect(await sendMessage(payload)).toEqual({ kind: "failed" });
  });

  it("maps a network error to failed", async () => {
    stubFetch(new TypeError("Failed to fetch"));
    expect(await sendMessage(payload)).toEqual({ kind: "failed" });
  });

  it("maps a timeout to failed", async () => {
    stubFetch(new DOMException("timed out", "TimeoutError"));
    expect(await sendMessage(payload)).toEqual({ kind: "failed" });
  });
});
