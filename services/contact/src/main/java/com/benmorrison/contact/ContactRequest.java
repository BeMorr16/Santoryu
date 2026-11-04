package com.benmorrison.contact;

/** The parsed request body. All fields are non-null: an absent property is an empty string. */
record ContactRequest(
    String name, String email, String subject, String message, String challengeToken) {

  ContactRequest trimmed() {
    return new ContactRequest(
        Validator.trim(name),
        Validator.trim(email),
        Validator.trim(subject),
        Validator.trim(message),
        challengeToken);
  }

  /** Redacted, so a stray log statement or exception message can't carry visitor data (R9.2). */
  @Override
  public String toString() {
    return "ContactRequest[redacted]";
  }
}
