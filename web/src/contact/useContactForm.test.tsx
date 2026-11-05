import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { SendResult } from "./api.ts";
import type { Field } from "./model.ts";
import { useContactForm } from "./useContactForm.ts";

const valid: Record<Field, string> = {
  name: "Ada",
  email: "ada@example.com",
  subject: "",
  message: "Hello",
};

function setup(result: SendResult | Promise<SendResult> = { kind: "sent" }) {
  const requestToken = vi.fn<(container: HTMLElement) => Promise<string>>(() =>
    Promise.resolve("token"),
  );
  const sendMessage = vi.fn(() => Promise.resolve(result));
  const challengeContainer = { current: document.createElement("div") };
  const hook = renderHook(() => useContactForm({ challengeContainer, requestToken, sendMessage }));
  const fill = (values: Partial<Record<Field, string>> = valid) => {
    act(() => {
      for (const [field, value] of Object.entries(values)) {
        hook.result.current.changeValue(field as Field, value);
      }
    });
  };
  const submit = () =>
    act(async () => {
      await hook.result.current.submit();
    });
  return { ...hook, requestToken, sendMessage, challengeContainer, fill, submit };
}

describe("useContactForm", () => {
  describe("errors (R2.1–R2.5)", () => {
    it("shows no errors before the first attempt, however a field changes", () => {
      const { result, fill } = setup();

      fill({ email: "nope" });

      expect(result.current.errors).toEqual({});
    });

    it("sets every field's error on an attempt, and asks to focus the first, sending nothing", async () => {
      const { result, submit, requestToken, sendMessage, fill } = setup();
      fill({ email: "nope" });

      await submit();

      expect(result.current.errors).toEqual({
        name: "missing",
        email: "invalid",
        message: "missing",
      });
      expect(result.current.focusRequest).toEqual({ target: "name" });
      expect(result.current.status).toBe("editing");
      expect(requestToken).not.toHaveBeenCalled();
      expect(sendMessage).not.toHaveBeenCalled();
    });

    it("updates a field's error as it changes, then clears it", async () => {
      const { result, submit, fill } = setup();
      await submit();
      expect(result.current.errors.email).toBe("missing");

      fill({ email: "ada@" });
      expect(result.current.errors.email).toBe("invalid");

      fill({ email: "ada@example.com" });
      expect(result.current.errors.email).toBeUndefined();
    });

    it("leaves a field with no error alone until the next attempt", async () => {
      const { result, submit, fill } = setup();
      fill({ ...valid, email: "" });
      await submit();

      fill({ name: "" });

      expect(result.current.errors).toEqual({ email: "missing" });
    });

    it("asks to focus again on a repeat attempt, even for the same field", async () => {
      const { result, submit } = setup();
      await submit();
      const first = result.current.focusRequest;

      await submit();

      expect(result.current.focusRequest).toEqual(first);
      expect(result.current.focusRequest).not.toBe(first);
    });
  });

  describe("sending (R3, R5.4, R5.5)", () => {
    it("gets a token in the container, then sends trimmed values with it", async () => {
      const { submit, requestToken, sendMessage, fill, challengeContainer } = setup();
      fill({ ...valid, name: "  Ada  ", subject: " Acme " });

      await submit();

      expect(requestToken).toHaveBeenCalledExactlyOnceWith(challengeContainer.current);
      expect(sendMessage).toHaveBeenCalledExactlyOnceWith({
        name: "Ada",
        email: "ada@example.com",
        subject: "Acme",
        message: "Hello",
        challengeToken: "token",
      });
    });

    it("shows sending, and ignores a second submit meanwhile", async () => {
      let finish: (result: SendResult) => void = () => undefined;
      const pending = new Promise<SendResult>((resolve) => {
        finish = resolve;
      });
      const { result, requestToken, sendMessage, fill } = setup(pending);
      fill();

      let first: Promise<void> = Promise.resolve();
      act(() => {
        first = result.current.submit();
      });
      expect(result.current.status).toBe("sending");

      await act(async () => {
        await result.current.submit();
      });
      expect(requestToken).toHaveBeenCalledOnce();

      await act(async () => {
        finish({ kind: "sent" });
        await first;
      });
      expect(sendMessage).toHaveBeenCalledOnce();
      expect(result.current.status).toBe("sent");
    });

    it("on success shows sent, and asks to focus the heading", async () => {
      const { result, submit, fill } = setup();
      fill();

      await submit();

      expect(result.current.status).toBe("sent");
      expect(result.current.focusRequest).toEqual({ target: "heading" });
    });

    it("never sends without a token, keeping the text and showing the challenge alert", async () => {
      const { result, submit, requestToken, sendMessage, fill } = setup();
      requestToken.mockRejectedValue(new Error("blocked"));
      fill();

      await submit();

      expect(sendMessage).not.toHaveBeenCalled();
      expect(result.current.alert).toBe("challenge");
      expect(result.current.status).toBe("editing");
      expect(result.current.values).toEqual(valid);
    });

    it("doesn't try the challenge if the container is gone", async () => {
      const { result, submit, requestToken, fill, challengeContainer } = setup();
      fill();
      (challengeContainer as { current: HTMLElement | null }).current = null;

      await submit();

      expect(requestToken).not.toHaveBeenCalled();
      expect(result.current.alert).toBe("challenge");
    });

    it.each([
      [{ kind: "failed" } as const, "failed"],
      [{ kind: "challenge" } as const, "challenge"],
    ])("keeps the text on a %j result, and shows the %s alert", async (sendResult, alert) => {
      const { result, submit, fill } = setup(sendResult);
      fill();

      await submit();

      expect(result.current.alert).toBe(alert);
      expect(result.current.status).toBe("editing");
      expect(result.current.values).toEqual(valid);
    });

    it("shows the API's field errors, and asks to focus the first (R3.6)", async () => {
      const { result, submit, fill } = setup({
        kind: "fields",
        errors: { message: "tooLong", email: "invalid" },
      });
      fill();

      await submit();

      expect(result.current.errors).toEqual({ message: "tooLong", email: "invalid" });
      expect(result.current.focusRequest).toEqual({ target: "email" });
      expect(result.current.status).toBe("editing");
      expect(result.current.values).toEqual(valid);
      expect(result.current.alert).toBeNull();
    });

    it("uses a new token for each attempt, and clears the alert when it retries", async () => {
      let attempt = 0;
      const { result, submit, requestToken, sendMessage, fill } = setup({ kind: "failed" });
      requestToken.mockImplementation(() => Promise.resolve(`token-${String(++attempt)}`));
      fill();
      await submit();
      expect(result.current.alert).toBe("failed");

      sendMessage.mockResolvedValue({ kind: "sent" });
      await submit();

      expect(result.current.alert).toBeNull();
      expect(sendMessage).toHaveBeenLastCalledWith(
        expect.objectContaining({ challengeToken: "token-2" }),
      );
    });
  });

  describe("sending another (R3.4)", () => {
    it("empties the form, and asks to focus Name", async () => {
      const { result, submit, fill } = setup();
      fill();
      await submit();

      act(() => {
        result.current.reset();
      });

      expect(result.current.status).toBe("editing");
      expect(result.current.values).toEqual({ name: "", email: "", subject: "", message: "" });
      expect(result.current.errors).toEqual({});
      expect(result.current.focusRequest).toEqual({ target: "name" });
    });
  });
});
