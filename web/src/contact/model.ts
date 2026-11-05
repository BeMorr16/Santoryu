/**
 * The form's values and rules (contact-form R2). `services/contact/.../Validator.java` implements
 * the same rules, and both test suites run `services/contact/contract/validation-cases.json`.
 */
export const fieldOrder = ["name", "email", "subject", "message"] as const;

export type Field = (typeof fieldOrder)[number];

export type FormValues = Record<Field, string>;

export type FieldErrorCode = "missing" | "invalid" | "tooLong";

export type FieldErrors = Partial<Record<Field, FieldErrorCode>>;

export const limits: Record<Field, number> = {
  name: 100,
  email: 254,
  subject: 100,
  message: 5000,
};

/** The HTML spec's email rule, plus a required dot in the domain and the 64-character local part. */
export const emailPattern =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]{1,64}@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export const emptyValues: FormValues = { name: "", email: "", subject: "", message: "" };

/** Control characters and Unicode line separators, which could add email headers (R7.2). */
function hasHeaderUnsafeCharacter(value: string): boolean {
  for (let index = 0; index < value.length; index++) {
    const code = value.charCodeAt(index);
    if (code <= 0x1f || (code >= 0x7f && code <= 0x9f) || code === 0x2028 || code === 0x2029) {
      return true;
    }
  }
  return false;
}

export function trimmed(values: FormValues): FormValues {
  return {
    name: values.name.trim(),
    email: values.email.trim(),
    subject: values.subject.trim(),
    message: values.message.trim(),
  };
}

function validateField(field: Field, value: string): FieldErrorCode | undefined {
  if (value === "") return field === "subject" ? undefined : "missing";
  if (value.length > limits[field]) return "tooLong";
  if (field === "message") return undefined;
  if (hasHeaderUnsafeCharacter(value)) return "invalid";
  if (field === "email" && !emailPattern.test(value)) return "invalid";
  return undefined;
}

/** Checks one field, trimming first. */
export function fieldError(field: Field, value: string): FieldErrorCode | undefined {
  return validateField(field, value.trim());
}

/** Checks the whole form, trimming first. Empty when it's valid. */
export function validate(values: FormValues): FieldErrors {
  const errors: FieldErrors = {};
  for (const field of fieldOrder) {
    const code = fieldError(field, values[field]);
    if (code) errors[field] = code;
  }
  return errors;
}

/** The field to focus after errors appear (R2.3). */
export function firstInvalidField(errors: FieldErrors): Field | undefined {
  return fieldOrder.find((field) => errors[field] !== undefined);
}
