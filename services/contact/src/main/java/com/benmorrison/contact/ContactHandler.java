package com.benmorrison.contact;

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.RequestHandler;
import com.amazonaws.services.lambda.runtime.events.APIGatewayV2HTTPEvent;
import com.amazonaws.services.lambda.runtime.events.APIGatewayV2HTTPResponse;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;

/** The Lambda entry point. Wiring only: {@link ContactService} makes the decisions. */
public final class ContactHandler
    implements RequestHandler<APIGatewayV2HTTPEvent, APIGatewayV2HTTPResponse> {
  private final ContactService service;
  private final OutcomeLog log;

  public ContactHandler() {
    this(Production.Live.SERVICE, Production.Live.LOG);
  }

  ContactHandler(ContactService service, OutcomeLog log) {
    this.service = service;
    this.log = log;
  }

  @Override
  public APIGatewayV2HTTPResponse handleRequest(APIGatewayV2HTTPEvent event, Context context) {
    ContactResponse response;
    try {
      Map<String, String> headers = event.getHeaders() == null ? Map.of() : event.getHeaders();
      response =
          service.handle(
              event.getRequestContext().getHttp().getMethod(),
              headers.get("content-type"),
              headers.get("origin"),
              body(event));
    } catch (RuntimeException e) {
      // Rethrowing would log the exception's message, which can quote input (R9.2). A clean 503
      // reaches the alarm through the outcome line instead (R12.2).
      response = ContactResponse.unavailable("handler", e.getClass().getSimpleName());
    }
    log.write(response);
    return toHttp(response);
  }

  private static byte[] body(APIGatewayV2HTTPEvent event) {
    if (event.getBody() == null) {
      return new byte[0];
    }
    return event.getIsBase64Encoded()
        ? Base64.getDecoder().decode(event.getBody())
        : event.getBody().getBytes(StandardCharsets.UTF_8);
  }

  /** Sets its own headers, because viewer-response functions skip origin 4xx and 5xx (R6.9). */
  private static APIGatewayV2HTTPResponse toHttp(ContactResponse response) {
    Map<String, String> headers = new HashMap<>();
    headers.put("cache-control", "no-store");
    headers.put("x-content-type-options", "nosniff");
    if (!response.body().isEmpty()) {
      headers.put("content-type", "application/json");
    }
    if (response.status() == 405) {
      headers.put("allow", "POST");
    }
    return APIGatewayV2HTTPResponse.builder()
        .withStatusCode(response.status())
        .withHeaders(headers)
        .withBody(response.body())
        .withIsBase64Encoded(false)
        .build();
  }
}
