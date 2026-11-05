package com.benmorrison.contact;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import tools.jackson.databind.json.JsonMapper;

class ContactServiceTest {
  private static final String ORIGIN = "https://example.org";
  private static final String VALID =
      "{\"name\":\"Ada\",\"email\":\"ada@example.com\",\"subject\":\"Acme\",\"message\":\"Hi\","
          + "\"challengeToken\":\"token\"}";

  private final List<String> tokens = new ArrayList<>();
  private final List<Message> sent = new ArrayList<>();
  private boolean challengePasses = true;
  private ServiceUnavailableException challengeFailure;
  private ServiceUnavailableException mailFailure;

  private ContactService service() {
    return new ContactService(
        ORIGIN,
        JsonMapper.builder().build(),
        token -> {
          tokens.add(token);
          if (challengeFailure != null) {
            throw challengeFailure;
          }
          return challengePasses;
        },
        message -> {
          sent.add(message);
          if (mailFailure != null) {
            throw mailFailure;
          }
        });
  }

  private ContactResponse post(String body) {
    return service()
        .handle("POST", "application/json", ORIGIN, body.getBytes(StandardCharsets.UTF_8));
  }

  private void assertNothingCalled() {
    assertEquals(List.of(), tokens);
    assertEquals(List.of(), sent);
  }

  @Test
  void acceptsAValidMessageWith204AndSendsOneEmail() {
    ContactResponse response = post(VALID);

    assertEquals(204, response.status());
    assertEquals("", response.body());
    assertEquals("sent", response.outcome());
    assertEquals(List.of("token"), tokens);
    assertEquals(1, sent.size());
    assertEquals("Site contact: Acme", sent.getFirst().subject());
    assertEquals("ada@example.com", sent.getFirst().replyTo());
  }

  @Test
  void sendsTheTrimmedValues() {
    post(
        "{\"name\":\" Ada \",\"email\":\" ada@example.com \",\"message\":\" Hi \","
            + "\"challengeToken\":\"token\"}");
    assertEquals("Site contact: Ada", sent.getFirst().subject());
    assertEquals("ada@example.com", sent.getFirst().replyTo());
  }

  @ParameterizedTest
  @ValueSource(strings = {"GET", "PUT", "DELETE", "OPTIONS", "HEAD", "post"})
  void rejectsOtherMethodsWith405(String method) {
    ContactResponse response =
        service()
            .handle(method, "application/json", ORIGIN, VALID.getBytes(StandardCharsets.UTF_8));
    assertEquals(405, response.status());
    assertNothingCalled();
  }

  @ParameterizedTest
  @ValueSource(strings = {"text/plain", "application/x-www-form-urlencoded", "application/jsonp"})
  void rejectsOtherContentTypesWith415(String contentType) {
    ContactResponse response =
        service().handle("POST", contentType, ORIGIN, VALID.getBytes(StandardCharsets.UTF_8));
    assertEquals(415, response.status());
    assertNothingCalled();
  }

  @Test
  void rejectsAMissingContentTypeWith415() {
    assertEquals(
        415,
        service().handle("POST", null, ORIGIN, VALID.getBytes(StandardCharsets.UTF_8)).status());
  }

  @ParameterizedTest
  @ValueSource(
      strings = {"application/json; charset=utf-8", "Application/JSON", " application/json "})
  void acceptsJsonContentTypeVariants(String contentType) {
    assertEquals(
        204,
        service()
            .handle("POST", contentType, ORIGIN, VALID.getBytes(StandardCharsets.UTF_8))
            .status());
  }

  private static String paddedToBytes(int size) {
    String start = "{\"name\":\"Ada\",\"challengeToken\":\"token\",\"pad\":\"";
    String end = "\"}";
    return start + "x".repeat(size - start.length() - end.length()) + end;
  }

  @Test
  void aBodyOverThe32KbLimitGets413() {
    ContactResponse response = post(paddedToBytes(ContactService.MAX_BODY_BYTES + 1));
    assertEquals(413, response.status());
    assertNothingCalled();
  }

  @Test
  void aBodyAtThe32KbLimitIsRead() {
    ContactResponse response = post(paddedToBytes(ContactService.MAX_BODY_BYTES));
    assertEquals(400, response.status());
    assertEquals("validation", response.outcome());
  }

  @Test
  void acceptsTheLargestValidMessageOf5000ThreeByteCharacters() {
    String body =
        "{\"name\":\""
            + "n".repeat(100)
            + "\",\"email\":\"ada@example.com\",\"subject\":\""
            + "s".repeat(100)
            + "\",\"message\":\""
            + "語".repeat(5000)
            + "\",\"challengeToken\":\""
            + "t".repeat(2048)
            + "\"}";
    assertEquals(204, post(body).status());
  }

  @ParameterizedTest
  @ValueSource(
      strings = {"https://evil.example", "http://example.org", "https://www.example.org", ""})
  void rejectsAWrongOrigin(String origin) {
    ContactResponse response =
        service()
            .handle("POST", "application/json", origin, VALID.getBytes(StandardCharsets.UTF_8));
    assertEquals(400, response.status());
    assertEquals("{\"error\":\"badRequest\"}", response.body());
    assertNothingCalled();
  }

  @Test
  void rejectsAMissingOrigin() {
    ContactResponse response =
        service().handle("POST", "application/json", null, VALID.getBytes(StandardCharsets.UTF_8));
    assertEquals("{\"error\":\"badRequest\"}", response.body());
    assertNothingCalled();
  }

  @ParameterizedTest
  @ValueSource(
      strings = {
        "",
        "not json",
        "[]",
        "\"text\"",
        "null",
        "{\"name\":1}",
        "{\"message\":{\"a\":1}}",
        "{\"challengeToken\":[]}",
        "{\"name\":\"unterminated"
      })
  void rejectsAMalformedBody(String body) {
    ContactResponse response = post(body);
    assertEquals(400, response.status());
    assertEquals("{\"error\":\"badRequest\"}", response.body());
    assertNothingCalled();
  }

  @Test
  void anEmptyObjectGetsFieldErrorsNotBadRequest() {
    ContactResponse response = post("{}");
    assertEquals(400, response.status());
    assertEquals(
        "{\"error\":\"validation\",\"fields\":{\"name\":\"missing\",\"email\":\"missing\","
            + "\"message\":\"missing\"}}",
        response.body());
    assertNothingCalled();
  }

  @Test
  void ignoresUnknownProperties() {
    assertEquals(204, post(VALID.replace("{", "{\"extra\":{\"a\":[1]},")).status());
  }

  @Test
  void treatsNullAsAbsent() {
    assertEquals(204, post(VALID.replace("\"Acme\"", "null")).status());
  }

  @Test
  void reportsFieldErrorsBeforeTheChallenge() {
    ContactResponse response =
        post(
            "{\"name\":\"Ada\",\"email\":\"nope\",\"message\":\"Hi\",\"challengeToken\":\"token\"}");
    assertEquals(400, response.status());
    assertEquals("{\"error\":\"validation\",\"fields\":{\"email\":\"invalid\"}}", response.body());
    assertNothingCalled();
  }

  @Test
  void aMissingTokenGetsChallengeWithoutCallingCloudflare() {
    ContactResponse response = post(VALID.replace("\"challengeToken\":\"token\"", "\"x\":\"y\""));
    assertEquals(400, response.status());
    assertEquals("{\"error\":\"challenge\"}", response.body());
    assertNothingCalled();
  }

  @Test
  void anOverlongTokenGetsChallengeWithoutCallingCloudflare() {
    ContactResponse response = post(VALID.replace("\"token\"", "\"" + "t".repeat(2049) + "\""));
    assertEquals("{\"error\":\"challenge\"}", response.body());
    assertNothingCalled();
  }

  @Test
  void aRejectedTokenGetsChallengeAndSendsNothing() {
    challengePasses = false;
    ContactResponse response = post(VALID);
    assertEquals(400, response.status());
    assertEquals("{\"error\":\"challenge\"}", response.body());
    assertEquals(List.of(), sent);
  }

  @Test
  void aCloudflareFailureGets503AndSendsNothing() {
    challengeFailure = new ServiceUnavailableException("internal-error");
    ContactResponse response = post(VALID);
    assertEquals(503, response.status());
    assertEquals("{\"error\":\"unavailable\"}", response.body());
    assertEquals("unavailable", response.outcome());
    assertEquals("challenge", response.stage());
    assertEquals("internal-error", response.errorClass());
    assertEquals(List.of(), sent);
  }

  @Test
  void anSesFailureGets503WithNoInternalDetail() {
    mailFailure = new ServiceUnavailableException("SesV2Exception");
    ContactResponse response = post(VALID);
    assertEquals(503, response.status());
    assertEquals("{\"error\":\"unavailable\"}", response.body());
    assertEquals("ses", response.stage());
    assertEquals("SesV2Exception", response.errorClass());
  }

  @Test
  void noPathReturns403Or404() {
    List<ContactResponse> responses =
        List.of(
            post(VALID),
            post("{}"),
            post("nope"),
            service().handle("GET", null, null, new byte[0]),
            service().handle("POST", null, null, new byte[0]),
            service().handle("POST", "application/json", null, new byte[0]));
    for (ContactResponse response : responses) {
      assertNotEquals(403, response.status());
      assertNotEquals(404, response.status());
    }
  }
}
