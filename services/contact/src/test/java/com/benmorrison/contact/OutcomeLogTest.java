package com.benmorrison.contact;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.amazonaws.services.lambda.runtime.events.APIGatewayV2HTTPEvent;
import java.io.ByteArrayOutputStream;
import java.io.PrintStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

class OutcomeLogTest {
  private static final String ORIGIN = "https://example.org";
  private static final List<String> SENTINELS =
      List.of(
          "SENTINEL-NAME",
          "sentinel-email",
          "SENTINEL-SUBJECT",
          "SENTINEL-MESSAGE",
          "SENTINEL-TOKEN");
  private static final String REQUEST =
      "{\"name\":\"SENTINEL-NAME\",\"email\":\"sentinel-email@example.com\","
          + "\"subject\":\"SENTINEL-SUBJECT\",\"message\":\"SENTINEL-MESSAGE\","
          + "\"challengeToken\":\"SENTINEL-TOKEN\"}";

  private final JsonMapper json = JsonMapper.builder().build();
  private final List<String> lines = new ArrayList<>();

  private static APIGatewayV2HTTPEvent event(String body) {
    return APIGatewayV2HTTPEvent.builder()
        .withRequestContext(
            APIGatewayV2HTTPEvent.RequestContext.builder()
                .withHttp(
                    APIGatewayV2HTTPEvent.RequestContext.Http.builder().withMethod("POST").build())
                .build())
        .withHeaders(Map.of("content-type", "application/json", "origin", ORIGIN))
        .withBody(body)
        .withIsBase64Encoded(false)
        .build();
  }

  /** Runs one request and returns everything it wrote, including stray stdout and stderr. */
  private String run(ChallengeVerifier verifier, MailSender mail, String body) {
    ContactHandler handler =
        new ContactHandler(
            new ContactService(ORIGIN, json, verifier, mail), new OutcomeLog(json, lines::add));
    PrintStream out = System.out;
    PrintStream err = System.err;
    ByteArrayOutputStream stray = new ByteArrayOutputStream();
    PrintStream capture = new PrintStream(stray, true, StandardCharsets.UTF_8);
    System.setOut(capture);
    System.setErr(capture);
    try {
      handler.handleRequest(event(body), null);
    } finally {
      System.setOut(out);
      System.setErr(err);
    }
    return stray.toString(StandardCharsets.UTF_8) + String.join("\n", lines);
  }

  private static void assertNoSentinels(String output) {
    for (String sentinel : SENTINELS) {
      assertFalse(output.contains(sentinel), sentinel);
    }
  }

  @Test
  void writesOneJsonLineWithExactlyTheFourFields() {
    run(token -> true, message -> {}, REQUEST);

    assertEquals(1, lines.size());
    assertFalse(lines.getFirst().contains("\n"));
    JsonNode line = json.readTree(lines.getFirst());
    assertEquals(Set.of("outcome", "status", "stage", "errorClass"), line.propertyNames());
    assertEquals("sent", line.get("outcome").asString());
    assertEquals(204, line.get("status").asInt());
    assertEquals("done", line.get("stage").asString());
    assertTrue(line.get("errorClass").isNull());
  }

  @Test
  void aFailedSendLogsTheClassForTheAlarmAndNoValues() {
    String output =
        run(
            token -> true,
            message -> {
              throw new ServiceUnavailableException("SesV2Exception");
            },
            REQUEST);

    assertNoSentinels(output);
    JsonNode line = json.readTree(lines.getFirst());
    assertEquals("unavailable", line.get("outcome").asString());
    assertEquals(503, line.get("status").asInt());
    assertEquals("ses", line.get("stage").asString());
    assertEquals("SesV2Exception", line.get("errorClass").asString());
  }

  @Test
  void anUnexpectedExceptionQuotingInputLeavesNoValues() {
    String output =
        run(
            token -> {
              throw new IllegalStateException("bad token SENTINEL-TOKEN from SENTINEL-NAME");
            },
            message -> {},
            REQUEST);

    assertNoSentinels(output);
    assertEquals(
        "IllegalStateException", json.readTree(lines.getFirst()).get("errorClass").asString());
  }

  @Test
  void aValidationFailureLeavesNoValues() {
    String output = run(token -> true, message -> {}, REQUEST.replace("@example.com", ""));
    assertNoSentinels(output);
  }

  @Test
  void aMalformedBodyLeavesNoValues() {
    String output = run(token -> true, message -> {}, "{\"name\":\"SENTINEL-NAME\",");
    assertNoSentinels(output);
    assertEquals("badRequest", json.readTree(lines.getFirst()).get("outcome").asString());
  }
}
