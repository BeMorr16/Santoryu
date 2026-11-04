package com.benmorrison.contact;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.regex.Pattern;

/**
 * The field rules (R2.2, R7.2). {@code web/src/contact/model.ts} implements the same rules, and
 * both test suites run {@code contract/validation-cases.json}.
 */
final class Validator {
  static final int NAME_LIMIT = 100;
  static final int EMAIL_LIMIT = 254;
  static final int SUBJECT_LIMIT = 100;
  static final int MESSAGE_LIMIT = 5000;

  /**
   * The HTML spec's email rule, plus a required dot in the domain and the 64-character local part.
   */
  static final String EMAIL_PATTERN =
      "^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]{1,64}"
          + "@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?"
          + "(?:\\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$";

  private static final Pattern EMAIL = Pattern.compile(EMAIL_PATTERN);
  private static final Pattern HEADER_UNSAFE =
      Pattern.compile("[\\x00-\\x1F\\x7F-\\x9F\\x{2028}\\x{2029}]");

  private Validator() {}

  /** Checks a request whose fields are already trimmed. Keys are the API's field names. */
  static Map<String, FieldError> validate(ContactRequest request) {
    Map<String, FieldError> errors = new LinkedHashMap<>();
    singleLine(request.name(), NAME_LIMIT, true, errors, "name");
    singleLine(request.email(), EMAIL_LIMIT, true, errors, "email");
    if (!errors.containsKey("email") && !EMAIL.matcher(request.email()).matches()) {
      errors.put("email", FieldError.INVALID);
    }
    singleLine(request.subject(), SUBJECT_LIMIT, false, errors, "subject");
    if (request.message().isEmpty()) {
      errors.put("message", FieldError.MISSING);
    } else if (request.message().length() > MESSAGE_LIMIT) {
      errors.put("message", FieldError.TOO_LONG);
    }
    return errors;
  }

  private static void singleLine(
      String value, int limit, boolean required, Map<String, FieldError> errors, String field) {
    if (value.isEmpty()) {
      if (required) {
        errors.put(field, FieldError.MISSING);
      }
    } else if (value.length() > limit) {
      errors.put(field, FieldError.TOO_LONG);
    } else if (HEADER_UNSAFE.matcher(value).find()) {
      errors.put(field, FieldError.INVALID);
    }
  }

  /** Trims what JavaScript's {@code trim()} trims, which neither of Java's own methods matches. */
  static String trim(String value) {
    int start = 0;
    int end = value.length();
    while (start < end && isTrimmable(value.charAt(start))) {
      start++;
    }
    while (end > start && isTrimmable(value.charAt(end - 1))) {
      end--;
    }
    return value.substring(start, end);
  }

  private static boolean isTrimmable(char c) {
    return switch (c) {
      case 0x09,
          0x0A,
          0x0B,
          0x0C,
          0x0D,
          0x20,
          0xA0,
          0x1680,
          0x2028,
          0x2029,
          0x202F,
          0x205F,
          0x3000,
          0xFEFF ->
          true;
      default -> c >= 0x2000 && c <= 0x200A;
    };
  }
}
