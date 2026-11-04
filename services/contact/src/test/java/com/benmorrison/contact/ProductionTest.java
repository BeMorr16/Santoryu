package com.benmorrison.contact;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.util.HashMap;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import tools.jackson.databind.json.JsonMapper;

class ProductionTest {
  private static final Map<String, String> ENV =
      Map.of(
          "AWS_REGION", "us-east-1",
          "SITE_ORIGIN", "https://example.org",
          "TURNSTILE_SECRET_PARAMETER", "/param",
          "CONTACT_FROM", "contact@example.org",
          "CONTACT_TO", "owner@example.org");

  @Test
  void wiresFromTheEnvironmentAndPrimesWithNoNetworkOrCredentials() {
    ContactService service = Production.service(ENV);
    JsonMapper json = JsonMapper.builder().build();

    ContactResponse primed = Production.prime(service, new OutcomeLog(json, line -> {}));

    assertEquals("https://example.org", service.allowedOrigin());
    assertEquals("challenge", primed.outcome());
  }

  @ParameterizedTest
  @ValueSource(
      strings = {
        "AWS_REGION",
        "SITE_ORIGIN",
        "TURNSTILE_SECRET_PARAMETER",
        "CONTACT_FROM",
        "CONTACT_TO"
      })
  void aMissingVariableFailsInitNamingOnlyTheVariable(String name) {
    Map<String, String> env = new HashMap<>(ENV);
    env.remove(name);

    NullPointerException thrown =
        assertThrows(NullPointerException.class, () -> Production.service(env));

    assertEquals(name, thrown.getMessage());
  }
}
