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
  const { values, errors, status, alert, focusRequest, changeValue, submit, reset } =
    useContactForm({ challengeContainer: challengeRef });

  // After the commit that shows the errors or the panel, so their text is there to be read.
  useEffect(() => {
    if (!focusRequest) return;
    const targets = {
      heading: headingRef,
      name: nameRef,
      email: emailRef,
      subject: subjectRef,
      message: messageRef,
    };
    targets[focusRequest.target].current?.focus();
  }, [focusRequest]);

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

  const sending = status === "sending";
  return (
    <Card as="section" variant="outlined" aria-labelledby={headingId} className={styles.card}>
      <Stack gap="md">
        <Typography as="h2" id={headingId} ref={headingRef} tabIndex={-1}>
          {content.heading}
        </Typography>
        <noscript>
          <Typography>{content.noScript}</Typography>
        </noscript>
        <form noValidate onSubmit={handleSubmit}>
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
              <div ref={challengeRef} className={styles.challenge} />
              {alert === "failed" && <FailureAlert message={content.sendFailed} />}
              {alert === "challenge" && <FailureAlert message={content.challengeFailed} />}
              <div>
                <Button type="submit" variant="primary" onFocus={preloadChallenge}>
                  {sending ? content.sending : content.submit}
                </Button>
              </div>
              <VisuallyHidden role="status">{sending ? content.sending : ""}</VisuallyHidden>
            </Stack>
          </fieldset>
        </form>
      </Stack>
    </Card>
  );
}
