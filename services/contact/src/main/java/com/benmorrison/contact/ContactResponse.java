package com.benmorrison.contact;

/**
 * What the service decided: the HTTP status and body, plus the fields of the outcome log line. The
 * body is empty when the response has none. The error class is null unless a dependency failed.
 */
record ContactResponse(int status, String body, String outcome, String stage, String errorClass) {
  static final String UNAVAILABLE_BODY = "{\"error\":\"unavailable\"}";

  static ContactResponse unavailable(String stage, String errorClass) {
    return new ContactResponse(503, UNAVAILABLE_BODY, "unavailable", stage, errorClass);
  }
}
