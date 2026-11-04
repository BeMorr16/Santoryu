package com.benmorrison.contact;

import java.util.Locale;
import java.util.Map;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ObjectNode;

/** The order of checks (R7.1) and the mapping to responses (R6). No 403 or 404 (R6.8). */
final class ContactService {
  static final int MAX_BODY_BYTES = 32 * 1024;
  private static final int MAX_TOKEN_LENGTH = 2048;
  private static final String BAD_REQUEST = "{\"error\":\"badRequest\"}";
  private static final String CHALLENGE = "{\"error\":\"challenge\"}";

  private final String allowedOrigin;
  private final JsonMapper json;
  private final ChallengeVerifier verifier;
  private final MailSender mail;

  ContactService(
      String allowedOrigin, JsonMapper json, ChallengeVerifier verifier, MailSender mail) {
    this.allowedOrigin = allowedOrigin;
    this.json = json;
    this.verifier = verifier;
    this.mail = mail;
  }

  String allowedOrigin() {
    return allowedOrigin;
  }

  ContactResponse handle(String method, String contentType, String origin, byte[] body) {
    if (!"POST".equals(method)) {
      return new ContactResponse(405, "", "methodNotAllowed", "method", null);
    }
    if (!isJson(contentType)) {
      return new ContactResponse(415, "", "unsupportedType", "contentType", null);
    }
    if (body.length > MAX_BODY_BYTES) {
      return new ContactResponse(413, "", "tooLarge", "size", null);
    }
    if (!allowedOrigin.equals(origin)) {
      return new ContactResponse(400, BAD_REQUEST, "badRequest", "origin", null);
    }
    ContactRequest request = parse(body);
    if (request == null) {
      return new ContactResponse(400, BAD_REQUEST, "badRequest", "body", null);
    }
    ContactRequest trimmed = request.trimmed();
    Map<String, FieldError> errors = Validator.validate(trimmed);
    if (!errors.isEmpty()) {
      return new ContactResponse(400, validationBody(errors), "validation", "fields", null);
    }
    String token = trimmed.challengeToken();
    if (token.isEmpty() || token.length() > MAX_TOKEN_LENGTH) {
      return new ContactResponse(400, CHALLENGE, "challenge", "challenge", null);
    }
    try {
      if (!verifier.verify(token)) {
        return new ContactResponse(400, CHALLENGE, "challenge", "challenge", null);
      }
    } catch (ServiceUnavailableException e) {
      return ContactResponse.unavailable("challenge", e.errorClass());
    }
    try {
      mail.send(Message.from(trimmed));
    } catch (ServiceUnavailableException e) {
      return ContactResponse.unavailable("ses", e.errorClass());
    }
    return new ContactResponse(204, "", "sent", "done", null);
  }

  private static boolean isJson(String contentType) {
    if (contentType == null) {
      return false;
    }
    int parameters = contentType.indexOf(';');
    String type = parameters < 0 ? contentType : contentType.substring(0, parameters);
    return type.strip().toLowerCase(Locale.ROOT).equals("application/json");
  }

  /** Returns null for a malformed body. Unknown properties are ignored (R6.1). */
  private ContactRequest parse(byte[] body) {
    JsonNode root;
    try {
      root = json.readTree(body);
    } catch (JacksonException e) {
      return null;
    }
    if (root == null || !root.isObject()) {
      return null;
    }
    String name = text(root, "name");
    String email = text(root, "email");
    String subject = text(root, "subject");
    String message = text(root, "message");
    String challengeToken = text(root, "challengeToken");
    if (name == null
        || email == null
        || subject == null
        || message == null
        || challengeToken == null) {
      return null;
    }
    return new ContactRequest(name, email, subject, message, challengeToken);
  }

  /** An absent or null property is empty, and any other non-string is malformed (null). */
  private static String text(JsonNode root, String field) {
    JsonNode node = root.get(field);
    if (node == null || node.isNull()) {
      return "";
    }
    return node.isString() ? node.asString() : null;
  }

  private String validationBody(Map<String, FieldError> errors) {
    ObjectNode body = json.createObjectNode();
    body.put("error", "validation");
    ObjectNode fields = body.putObject("fields");
    errors.forEach((field, error) -> fields.put(field, error.code()));
    return json.writeValueAsString(body);
  }
}
