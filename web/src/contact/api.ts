import {
  fieldOrder,
  type Field,
  type FieldErrorCode,
  type FieldErrors,
  type FormValues,
} from "./model.ts";

export type SendPayload = FormValues & { challengeToken: string };

export type SendResult =
  | { kind: "sent" }
  | { kind: "fields"; errors: FieldErrors }
  | { kind: "challenge" }
  | { kind: "failed" };

const TIMEOUT_MS = 20_000;
const codes: readonly string[] = ["missing", "invalid", "tooLong"] satisfies FieldErrorCode[];

/** Origin Access Control requires the SHA-256 of the exact bytes sent (R3.1). */
async function sha256Hex(bytes: Uint8Array<ArrayBuffer>): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** The field errors in a response, or null if any of it isn't what the API sends. */
function readFieldErrors(fields: unknown): FieldErrors | null {
  if (typeof fields !== "object" || fields === null) return null;
  const errors: FieldErrors = {};
  for (const [field, code] of Object.entries(fields)) {
    if (!fieldOrder.includes(field as Field) || !codes.includes(code as string)) return null;
    errors[field as Field] = code as FieldErrorCode;
  }
  return Object.keys(errors).length > 0 ? errors : null;
}

async function readResult(response: Response): Promise<SendResult> {
  if (response.status === 204) return { kind: "sent" };
  // Everything else is a failure, including the 404 page CloudFront serves for a WAF block (R3.5).
  if (response.status !== 400) return { kind: "failed" };
  const body = (await response.json()) as { error?: unknown; fields?: unknown } | null;
  if (body?.error === "challenge") return { kind: "challenge" };
  if (body?.error === "validation") {
    const errors = readFieldErrors(body.fields);
    if (errors) return { kind: "fields", errors };
  }
  return { kind: "failed" };
}

/** Sends one message. Never rejects: every failure is a result. */
export async function sendMessage(payload: SendPayload): Promise<SendResult> {
  try {
    const bytes = new TextEncoder().encode(JSON.stringify(payload));
    const response = await fetch("/api/contact", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-amz-content-sha256": await sha256Hex(bytes),
      },
      body: bytes,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    return await readResult(response);
  } catch {
    return { kind: "failed" };
  }
}
