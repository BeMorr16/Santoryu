package com.benmorrison.contact;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Set;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/** Checks a Turnstile token with Cloudflare's siteverify endpoint (R7.3). */
final class CloudflareVerifier implements ChallengeVerifier {
  static final URI SITEVERIFY =
      URI.create("https://challenges.cloudflare.com/turnstile/v0/siteverify");
  private static final String ACTION = "contact";
  private static final Duration TIMEOUT = Duration.ofSeconds(3);
  private static final Set<String> VISITOR_CODES =
      Set.of("invalid-input-response", "missing-input-response", "timeout-or-duplicate");

  private final HttpClient http;
  private final URI endpoint;
  private final JsonMapper json;
  private final TurnstileSecret secret;
  private final String hostname;

  CloudflareVerifier(
      HttpClient http, URI endpoint, JsonMapper json, TurnstileSecret secret, String hostname) {
    this.http = http;
    this.endpoint = endpoint;
    this.json = json;
    this.secret = secret;
    this.hostname = hostname;
  }

  static HttpClient defaultClient() {
    return HttpClient.newBuilder().connectTimeout(TIMEOUT).build();
  }

  @Override
  public boolean verify(String token) throws ServiceUnavailableException {
    String form = "secret=" + encode(secret.get()) + "&response=" + encode(token);
    HttpRequest request =
        HttpRequest.newBuilder(endpoint)
            .timeout(TIMEOUT)
            .header("content-type", "application/x-www-form-urlencoded")
            .POST(HttpRequest.BodyPublishers.ofString(form))
            .build();
    JsonNode result;
    try {
      result = json.readTree(http.send(request, HttpResponse.BodyHandlers.ofString()).body());
    } catch (IOException | JacksonException e) {
      throw ServiceUnavailableException.from(e);
    } catch (InterruptedException e) {
      Thread.currentThread().interrupt();
      throw ServiceUnavailableException.from(e);
    }
    return accept(result);
  }

  private boolean accept(JsonNode result) throws ServiceUnavailableException {
    if (result.path("success").asBoolean(false)) {
      return hostname.equals(result.path("hostname").asString(""))
          && ACTION.equals(result.path("action").asString(""));
    }
    // Any code that isn't plainly the visitor's is the site's, so it fails closed and alarms.
    JsonNode codes = result.path("error-codes");
    if (codes.isEmpty()) {
      throw new ServiceUnavailableException("SiteverifyNoErrorCode");
    }
    for (JsonNode code : codes) {
      if (!VISITOR_CODES.contains(code.asString(""))) {
        throw new ServiceUnavailableException(code.asString("SiteverifyUnknownCode"));
      }
    }
    return false;
  }

  private static String encode(String value) {
    return URLEncoder.encode(value, StandardCharsets.UTF_8);
  }
}
