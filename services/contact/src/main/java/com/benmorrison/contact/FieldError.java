package com.benmorrison.contact;

enum FieldError {
  MISSING("missing"),
  INVALID("invalid"),
  TOO_LONG("tooLong");

  private final String code;

  FieldError(String code) {
    this.code = code;
  }

  String code() {
    return code;
  }
}
