package com.benmorrison.contact;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.URI;
import java.net.http.HttpClient;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import software.amazon.awssdk.services.ssm.model.SsmException;
import tools.jackson.databind.json.JsonMapper;

class CloudflareVerifierTest {
  private static final String GOOD =
      "{\"success\":true,\"hostname\":\"example.org\",\"action\":\"contact\"}";

  private HttpServer server;
  private String responseBody = GOOD;
  private int responseStatus = 200;
  private long delayMillis;
  private String requestBody;

  @BeforeEach
  void startServer() throws IOException {
    server = HttpServer.create(new InetSocketAddress(InetAddress.getLoopbackAddress(), 0), 0);
    server.createContext(
        "/siteverify",
        exchange -> {
          requestBody =
              new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
          if (delayMillis > 0) {
            try {
              Thread.sleep(delayMillis);
            } catch (InterruptedException e) {
              Thread.currentThread().interrupt();
            }
          }
          byte[] bytes = responseBody.getBytes(StandardCharsets.UTF_8);
          exchange.sendResponseHeaders(responseStatus, bytes.length);
          exchange.getResponseBody().write(bytes);
          exchange.close();
        });
    server.start();
  }

  @AfterEach
  void stopServer() {
    server.stop(0);
  }

  private CloudflareVerifier verifier() {
    return verifier(CloudflareVerifier.defaultClient(), endpoint());
  }

  private CloudflareVerifier verifier(HttpClient http, URI endpoint) {
    return new CloudflareVerifier(
        http,
        endpoint,
        JsonMapper.builder().build(),
        new TurnstileSecret(new StubSsm(), "/param"),
        "example.org");
  }

  private URI endpoint() {
    return URI.create("http://127.0.0.1:" + server.getAddress().getPort() + "/siteverify");
  }

  @Test
  void acceptsSuccessWithTheRightHostnameAndAction() throws Exception {
    assertTrue(verifier().verify("a token/with+symbols"));
    assertEquals("secret=the-secret&response=a+token%2Fwith%2Bsymbols", requestBody);
  }

  @Test
  void pointsAtCloudflare() {
    assertEquals(
        "https://challenges.cloudflare.com/turnstile/v0/siteverify",
        CloudflareVerifier.SITEVERIFY.toString());
  }

  @ParameterizedTest
  @ValueSource(
      strings = {
        "{\"success\":true,\"hostname\":\"evil.example\",\"action\":\"contact\"}",
        "{\"success\":true,\"hostname\":\"example.org\",\"action\":\"other\"}",
        "{\"success\":true,\"action\":\"contact\"}",
        "{\"success\":true,\"hostname\":\"example.org\"}"
      })
  void rejectsSuccessWithAWrongHostnameOrAction(String body) throws Exception {
    responseBody = body;
    assertFalse(verifier().verify("token"));
  }

  @ParameterizedTest
  @ValueSource(
      strings = {"invalid-input-response", "missing-input-response", "timeout-or-duplicate"})
  void mapsVisitorCodesToARejection(String code) throws Exception {
    responseStatus = 400;
    responseBody = "{\"success\":false,\"error-codes\":[\"" + code + "\"]}";
    assertFalse(verifier().verify("token"));
  }

  @ParameterizedTest
  @ValueSource(
      strings = {"invalid-input-secret", "missing-input-secret", "internal-error", "brand-new"})
  void mapsSiteCodesToUnavailable(String code) {
    responseStatus = 400;
    responseBody = "{\"success\":false,\"error-codes\":[\"" + code + "\"]}";
    ServiceUnavailableException thrown =
        assertThrows(ServiceUnavailableException.class, () -> verifier().verify("token"));
    assertEquals(code, thrown.errorClass());
  }

  @Test
  void aSiteCodeBesideAVisitorCodeIsUnavailable() {
    responseBody =
        "{\"success\":false,\"error-codes\":[\"timeout-or-duplicate\",\"internal-error\"]}";
    assertThrows(ServiceUnavailableException.class, () -> verifier().verify("token"));
  }

  @Test
  void aFailureWithNoCodeIsUnavailable() {
    responseBody = "{\"success\":false}";
    assertThrows(ServiceUnavailableException.class, () -> verifier().verify("token"));
  }

  @Test
  void anUnparseableResponseIsUnavailable() {
    responseBody = "<html>bad gateway</html>";
    assertThrows(ServiceUnavailableException.class, () -> verifier().verify("token"));
  }

  @Test
  void aNetworkErrorIsUnavailable() {
    URI closed = endpoint();
    server.stop(0);
    assertThrows(
        ServiceUnavailableException.class,
        () -> verifier(CloudflareVerifier.defaultClient(), closed).verify("token"));
  }

  @Test
  void aTimeoutIsUnavailable() {
    delayMillis = 3_500;
    ServiceUnavailableException thrown =
        assertThrows(ServiceUnavailableException.class, () -> verifier().verify("token"));
    assertEquals("HttpTimeoutException", thrown.errorClass());
  }

  @Test
  void aSecretFailureIsUnavailableAndSendsNothing() {
    StubSsm ssm = new StubSsm();
    ssm.failure = SsmException.builder().message("denied").build();
    CloudflareVerifier verifier =
        new CloudflareVerifier(
            CloudflareVerifier.defaultClient(),
            endpoint(),
            JsonMapper.builder().build(),
            new TurnstileSecret(ssm, "/param"),
            "example.org");

    ServiceUnavailableException thrown =
        assertThrows(ServiceUnavailableException.class, () -> verifier.verify("token"));

    assertEquals("SsmException", thrown.errorClass());
    assertNull(requestBody);
  }
}
