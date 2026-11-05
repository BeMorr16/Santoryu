import { useState, type RefObject } from "react";
import { sendMessage as defaultSendMessage } from "./api.ts";
import {
  emptyValues,
  fieldError,
  firstInvalidField,
  trimmed,
  validate,
  type Field,
  type FieldErrorCode,
  type FieldErrors,
  type FormValues,
} from "./model.ts";
import { requestToken as defaultRequestToken } from "./turnstile.ts";

export type FormStatus = "editing" | "sending" | "sent";

export type FormAlert = "failed" | "challenge" | null;

/**
 * Where focus should go next. A new object each time, so asking twice moves focus twice. `code` is
 * the error to announce if that field already has focus, since focusing it again says nothing.
 */
export type FocusRequest = {
  target: Field | "heading" | "prompt" | "submit";
  code?: FieldErrorCode | undefined;
} | null;

export interface UseContactFormOptions {
  /** Where Cloudflare can show the widget if it needs the visitor to interact. */
  challengeContainer: RefObject<HTMLElement | null>;
  requestToken?: typeof defaultRequestToken;
  sendMessage?: typeof defaultSendMessage;
}

/** The form's state and the order of its steps (contact-form design §6). No rendering. */
export function useContactForm({
  challengeContainer,
  requestToken = defaultRequestToken,
  sendMessage = defaultSendMessage,
}: UseContactFormOptions) {
  const [values, setValues] = useState<FormValues>(emptyValues);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<FormStatus>("editing");
  const [alert, setAlert] = useState<FormAlert>(null);
  const [focusRequest, setFocusRequest] = useState<FocusRequest>(null);
  const [challengeWaiting, setChallengeWaiting] = useState(false);

  function showErrors(found: FieldErrors) {
    setErrors(found);
    const target = firstInvalidField(found);
    if (target) setFocusRequest({ target, code: found[target] });
  }

  /** A failure shows an alert, and the widget closing can drop focus to the page (WCAG 2.4.3). */
  function showAlert(next: "failed" | "challenge") {
    setAlert(next);
    setFocusRequest({ target: "submit" });
  }

  /** An error appears only after a submit attempt, then follows the field's value (R2.4, R2.5). */
  function changeValue(field: Field, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    if (errors[field]) {
      setErrors((current) => ({ ...current, [field]: fieldError(field, value) }));
    }
  }

  async function submit() {
    if (status === "sending") return;
    setAlert(null);
    const found = validate(values);
    if (firstInvalidField(found)) {
      showErrors(found);
      return;
    }
    setErrors({});
    setStatus("sending");

    const container = challengeContainer.current;
    let challengeToken: string;
    try {
      if (!container) throw new Error("The form isn't mounted.");
      challengeToken = await requestToken(container, {
        onInteractive: () => {
          setChallengeWaiting(true);
          setFocusRequest({ target: "prompt" });
        },
        onInteractiveEnd: () => {
          setChallengeWaiting(false);
        },
      });
    } catch {
      setChallengeWaiting(false);
      setStatus("editing");
      showAlert("challenge");
      return;
    }
    setChallengeWaiting(false);

    const result = await sendMessage({ ...trimmed(values), challengeToken });
    if (result.kind === "sent") {
      setStatus("sent");
      setFocusRequest({ target: "heading" });
      return;
    }
    setStatus("editing");
    if (result.kind === "fields") showErrors(result.errors);
    else showAlert(result.kind === "challenge" ? "challenge" : "failed");
  }

  function reset() {
    setValues(emptyValues);
    setErrors({});
    setAlert(null);
    setStatus("editing");
    setFocusRequest({ target: "name" });
  }

  return {
    values,
    errors,
    status,
    alert,
    focusRequest,
    challengeWaiting,
    changeValue,
    submit,
    reset,
  };
}
