import { useEffect, useId, useRef, useSyncExternalStore, type SubmitEvent } from "react";
import { Button } from "../components/Button/Button.tsx";
import { Card } from "../components/Card/Card.tsx";
import { Icon } from "../components/Icon/Icon.tsx";
import { Link } from "../components/Link/Link.tsx";
import { Stack } from "../components/Stack/Stack.tsx";
import { TextField } from "../components/TextField/TextField.tsx";
import { Typography } from "../components/Typography/Typography.tsx";
import { VisuallyHidden } from "../components/VisuallyHidden/VisuallyHidden.tsx";
import { contactFormContent as content, type LinkedSentence } from "../content/contact.ts";
import { linkedinUrl } from "../site.config.ts";
import styles from "./ContactForm.module.css";
import type { Field, FieldErrorCode } from "./model.ts";
import { loadTurnstile } from "./turnstile.ts";
import { useContactForm } from "./useContactForm.ts";

const errorMessages: Record<Field, Partial<Record<FieldErrorCode, string>>> = content.errors;

const subscribeToNothing = () => () => undefined;

/** False in the prerendered HTML and during hydration, then true. */
function useHydrated() {
  return useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false,
  );
}

/** Different text from what's there, or a screen reader won't read a repeat. */
function announcement(text: string, current: string | null) {
  return current === text ? `${text}\u00a0` : text;
}

/** Starts loading Cloudflare's script. A failed load comes up again at submit (R5.1, R5.4). */
function preloadChallenge() {
  loadTurnstile().catch(() => undefined);
}

/** A failure message. The link opens a new tab, so what the visitor wrote stays here. */
function FailureAlert({ message }: { message: LinkedSentence }) {
  return (
    <Typography as="p" tone="error" role="alert" className={styles.alert}>
      <Icon name="warning" className={styles.alertIcon} />
      <span>
        {message.before}
        <Link href={linkedinUrl} newTab>
          {message.linkLabel}
        </Link>
        {message.after}
      </span>
    </Typography>
  );
}

/** The contact form, on an outlined card below the page's links (contact-form R1). */
export function ContactForm() {
  const headingId = useId();
  const hydrated = useHydrated();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const subjectRef = useRef<HTMLInputElement>(null);
  const messageRef = useRef<HTMLTextAreaElement>(null);
  const challengeRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const promptRef = useRef<HTMLParagraphElement>(null);
  const submitRef = useRef<HTMLButtonElement>(null);
  const submitAreaRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLElement>(null);
  const {
    values,
    errors,
    status,
    alert,
    focusRequest,
    challengeWaiting,
    changeValue,
    submit,
    reset,
  } = useContactForm({ challengeContainer: challengeRef });
  const sending = status === "sending";

  // The region's text is set here, not rendered, so the focus effect below can also use it.
  useEffect(() => {
    if (!statusRef.current) return;
    statusRef.current.textContent = challengeWaiting
      ? content.challengePrompt
      : sending
        ? content.sending
        : "";
  }, [sending, challengeWaiting]);

  // After the commit that shows the errors or the panel, so their text is there to be read.
  useEffect(() => {
    if (!focusRequest) return;
    const { target, code } = focusRequest;
    const targets = {
      heading: headingRef,
      prompt: promptRef,
      submit: submitRef,
      name: nameRef,
      email: emailRef,
      subject: subjectRef,
      message: messageRef,
    };
    const element = targets[target].current;
    if (!element) return;
    const active = document.activeElement;
    const focusLost = active === null || active === document.body;

    if (target === "submit") {
      // Only rescue focus the widget dropped; a visitor who has moved on stays where they are.
      if (focusLost) element.focus();
      return;
    }
    if (target === "prompt") {
      if (focusLost || formRef.current?.contains(active)) {
        element.focus();
        element.scrollIntoView({ block: "nearest" });
      }
      return;
    }
    if (element === active && code && target !== "heading" && statusRef.current) {
      // Focusing it again says nothing, so a screen reader needs this to hear the error (WCAG 4.1.3).
      statusRef.current.textContent = announcement(
        errorMessages[target][code] ?? "",
        statusRef.current.textContent,
      );
      return;
    }
    element.focus();
  }, [focusRequest]);

  // Enter in a top field leaves the alert and button off-screen otherwise (WCAG 2.4.7).
  useEffect(() => {
    if (alert) submitAreaRef.current?.scrollIntoView({ block: "nearest" });
  }, [alert]);

  const errorText = (field: Field) => {
    const code = errors[field];
    return code && errorMessages[field][code];
  };

  const fieldProps = (field: Field) => ({
    label: content.labels[field],
    name: field,
    value: values[field],
    error: errorText(field),
    onChange: (event: { target: { value: string } }) => {
      changeValue(field, event.target.value);
    },
    onFocus: preloadChallenge,
    // Without this, Chromium reports a half-typed email as invalid before any attempt (R2.5).
    "aria-invalid": false,
    // What's sent is fixed once it's sending, and success would discard any edit.
    readOnly: sending,
  });

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    void submit();
  }

  if (status === "sent") {
    return (
      <Card as="section" variant="outlined" aria-labelledby={headingId} className={styles.card}>
        <Stack gap="md">
          <Typography as="h2" id={headingId} ref={headingRef} tabIndex={-1}>
            {content.successHeading}
          </Typography>
          <Typography>{content.successText}</Typography>
          <div>
            <Button variant="secondary" onClick={reset}>
              {content.sendAnother}
            </Button>
          </div>
        </Stack>
      </Card>
    );
  }

  return (
    <Card as="section" variant="outlined" aria-labelledby={headingId} className={styles.card}>
      <Stack gap="md">
        <Typography as="h2" id={headingId} ref={headingRef} tabIndex={-1}>
          {content.heading}
        </Typography>
        <noscript>
          <Typography>{content.noScript}</Typography>
        </noscript>
        <form ref={formRef} noValidate onSubmit={handleSubmit}>
          {/* A disabled fieldset stops native submission, so a message can't end up in a URL (R4.1). */}
          <fieldset disabled={!hydrated} className={styles.controls}>
            <Stack gap="md">
              <TextField {...fieldProps("name")} ref={nameRef} autoComplete="name" required />
              <TextField
                {...fieldProps("email")}
                ref={emailRef}
                type="email"
                autoComplete="email"
                required
              />
              <TextField
                {...fieldProps("subject")}
                ref={subjectRef}
                autoComplete="organization"
                optional
              />
              <TextField {...fieldProps("message")} ref={messageRef} multiline required />
              <Typography variant="small" tone="muted">
                {content.privacy}
              </Typography>
              <Stack gap="md" ref={submitAreaRef}>
                {alert === "failed" && <FailureAlert message={content.sendFailed} />}
                {alert === "challenge" && <FailureAlert message={content.challengeFailed} />}
                {challengeWaiting && (
                  <Typography ref={promptRef} tabIndex={-1}>
                    {content.challengePrompt}
                  </Typography>
                )}
                <div>
                  <div
                    ref={challengeRef}
                    className={challengeWaiting ? styles.challengeWaiting : undefined}
                  />
                  <Button
                    ref={submitRef}
                    type="submit"
                    variant="primary"
                    onFocus={preloadChallenge}
                  >
                    {challengeWaiting
                      ? content.waiting
                      : sending
                        ? content.sending
                        : content.submit}
                  </Button>
                </div>
              </Stack>
              <VisuallyHidden role="status" ref={statusRef} />
            </Stack>
          </fieldset>
        </form>
      </Stack>
    </Card>
  );
}
