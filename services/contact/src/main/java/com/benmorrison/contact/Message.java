package com.benmorrison.contact;

/** The email built from a validated, trimmed request (R7.4, R7.5). */
record Message(String subject, String body, String replyTo) {
  private static final String SUBJECT_PREFIX = "Site contact: ";

  static Message from(ContactRequest request) {
    String subject = request.subject().isEmpty() ? request.name() : request.subject();
    String role = request.subject().isEmpty() ? "Not given" : request.subject();
    String body =
        "Name: "
            + request.name()
            + "\nEmail: "
            + request.email()
            + "\nRole or company: "
            + role
            + "\n\n"
            + request.message()
            + "\n";
    return new Message(SUBJECT_PREFIX + subject, body, request.email());
  }

  @Override
  public String toString() {
    return "Message[redacted]";
  }
}
