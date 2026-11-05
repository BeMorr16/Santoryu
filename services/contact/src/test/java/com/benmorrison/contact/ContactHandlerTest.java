package com.benmorrison.contact;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.amazonaws.services.lambda.runtime.events.APIGatewayV2HTTPEvent;
import com.amazonaws.services.lambda.runtime.events.APIGatewayV2HTTPResponse;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

class ContactHandlerTest {
  private static final String ORIGIN = "https://example.org";
  private static final String VALID =
      "{\"name\":\"Ada\",\"email\":\"ada@example.com\",\"message\":\"Hi\",\"challengeToken\":\"t\"}";

  private final JsonMapper json = JsonMapper.builder().build();
  private final List<String> lines = new ArrayList<>();
  private final List<Message> sent = new ArrayList<>();

  private ContactHandler handler() {
    return new ContactHandler(
        new ContactService(ORIGIN, json, token -> true, sent::add),
        new OutcomeLog(json, lines::add));
  }

  private static APIGatewayV2HTTPEvent event(
      String method, Map<String, String> headers, String body, boolean base64) {
    return APIGatewayV2HTTPEvent.builder()
        .withRequestContext(
            APIGatewayV2HTTPEvent.RequestContext.builder()
                .withHttp(
                    APIGatewayV2HTTPEvent.RequestContext.Http.builder().withMethod(method).build())
                .build())
        .withHeaders(headers)
        .withBody(body)
        .withIsBase64Encoded(base64)
        .build();
  }

  private static Map<String, String> jsonHeaders() {
    return Map.of("content-type", "application/json", "origin", ORIGIN);
  }

  private static void assertSafetyHeaders(APIGatewayV2HTTPResponse response) {
    assertEquals("no-store", response.getHeaders().get("cache-control"));
    assertEquals("nosniff", response.getHeaders().get("x-content-type-options"));
  }

  @Test
  void acceptsAPlainBody() {
    APIGatewayV2HTTPResponse response =
        handler().handleRequest(event("POST", jsonHeaders(), VALID, false), null);

    assertEquals(204, response.getStatusCode());
    assertEquals(1, sent.size());
    assertSafetyHeaders(response);
    assertNull(response.getHeaders().get("content-type"));
  }

  @Test
  void decodesABase64Body() {
    String encoded = Base64.getEncoder().encodeToString(VALID.getBytes(StandardCharsets.UTF_8));
    APIGatewayV2HTTPResponse response =
        handler().handleRequest(event("POST", jsonHeaders(), encoded, true), null);

    assertEquals(204, response.getStatusCode());
    assertEquals(1, sent.size());
  }

  @Test
  void checksTheSizeOfDecodedBytes() {
    String oversize = "語".repeat(ContactService.MAX_BODY_BYTES / 3 + 1);
    APIGatewayV2HTTPResponse response =
        handler().handleRequest(event("POST", jsonHeaders(), oversize, false), null);
    assertEquals(413, response.getStatusCode());
    assertSafetyHeaders(response);
  }

  @Test
  void aMethodFailureNamesTheAllowedMethod() {
    APIGatewayV2HTTPResponse response =
        handler().handleRequest(event("GET", null, null, false), null);

    assertEquals(405, response.getStatusCode());
    assertEquals("POST", response.getHeaders().get("allow"));
    assertSafetyHeaders(response);
  }

  @Test
  void theWeeklyPingGets405AndLogsNoFailure() {
    APIGatewayV2HTTPResponse response =
        handler().handleRequest(event("GET", null, null, false), null);

    assertEquals(405, response.getStatusCode());
    assertEquals(List.of(), sent);
    assertEquals(1, lines.size());
    assertTrue(lines.getFirst().contains("\"outcome\":\"methodNotAllowed\""));
  }

  @Test
  void aJsonResponseSaysSo() {
    APIGatewayV2HTTPResponse response =
        handler().handleRequest(event("POST", jsonHeaders(), "{}", false), null);

    assertEquals(400, response.getStatusCode());
    assertEquals("application/json", response.getHeaders().get("content-type"));
    assertSafetyHeaders(response);
  }

  @Test
  void anUnexpectedFailureBecomesACleanLogged503() {
    String malformed = "not base64 !!!";
    APIGatewayV2HTTPResponse response =
        handler().handleRequest(event("POST", jsonHeaders(), malformed, true), null);

    assertEquals(503, response.getStatusCode());
    assertEquals("{\"error\":\"unavailable\"}", response.getBody());
    assertSafetyHeaders(response);
    assertEquals(1, lines.size());
    assertTrue(lines.getFirst().contains("\"outcome\":\"unavailable\""));
    assertTrue(lines.getFirst().contains("\"stage\":\"handler\""));
    assertTrue(lines.getFirst().contains("\"errorClass\":\"IllegalArgumentException\""));
  }

  @Test
  void primingMakesNoCallAndStopsAtTheChallenge() {
    List<String> verifierCalls = new ArrayList<>();
    ContactService service =
        new ContactService(
            ORIGIN,
            json,
            token -> {
              verifierCalls.add(token);
              return true;
            },
            sent::add);

    ContactResponse primed = Production.prime(service, new OutcomeLog(json, lines::add));

    assertEquals("challenge", primed.outcome());
    assertEquals(List.of(), verifierCalls);
    assertEquals(List.of(), sent);
    assertEquals(List.of(), lines);
  }
}
