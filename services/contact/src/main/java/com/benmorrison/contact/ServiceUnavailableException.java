package com.benmorrison.contact;

/**
 * A dependency failed, so the visitor gets a clean 503 (R6.7). Holds only a class name or error
 * code, never a cause: SDK exception messages can quote input (R9.2).
 */
final class ServiceUnavailableException extends Exception {
  private static final long serialVersionUID = 1L;

  ServiceUnavailableException(String errorClass) {
    super(errorClass);
  }

  static ServiceUnavailableException from(Throwable failure) {
    return new ServiceUnavailableException(failure.getClass().getSimpleName());
  }

  String errorClass() {
    return getMessage();
  }
}
