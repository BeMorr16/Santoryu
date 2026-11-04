package com.benmorrison.contact;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

class ValidatorTest {
  private static final JsonNode CONTRACT = readContract();

  private static JsonNode readContract() {
    try {
      return JsonMapper.builder()
          .build()
          .readTree(Files.readString(Path.of("contract/validation-cases.json")));
    } catch (IOException e) {
      throw new IllegalStateException(e);
    }
  }

  static Stream<Arguments> cases() {
    List<Arguments> arguments = new ArrayList<>();
    for (JsonNode testCase : CONTRACT.get("cases")) {
      arguments.add(Arguments.of(testCase.get("description").asString(), testCase));
    }
    return arguments.stream();
  }

  @ParameterizedTest(name = "{0}")
  @MethodSource("cases")
  void followsTheSharedCase(String description, JsonNode testCase) {
    ContactRequest request = requestFrom(testCase.get("input")).trimmed();

    Map<String, String> actual = new HashMap<>();
    Validator.validate(request).forEach((field, error) -> actual.put(field, error.code()));
    Map<String, String> expected = new HashMap<>();
    testCase
        .get("errors")
        .properties()
        .forEach(e -> expected.put(e.getKey(), e.getValue().asString()));
    assertEquals(expected, actual);

    if (testCase.has("trimmed")) {
      Map<String, String> trimmed =
          Map.of(
              "name", request.name(),
              "email", request.email(),
              "subject", request.subject(),
              "message", request.message());
      testCase
          .get("trimmed")
          .properties()
          .forEach(e -> assertEquals(e.getValue().asString(), trimmed.get(e.getKey()), e.getKey()));
    }
  }

  @Test
  void limitsAndEmailRuleMatchTheContract() {
    JsonNode limits = CONTRACT.get("limits");
    assertEquals(limits.get("name").asInt(), Validator.NAME_LIMIT);
    assertEquals(limits.get("email").asInt(), Validator.EMAIL_LIMIT);
    assertEquals(limits.get("subject").asInt(), Validator.SUBJECT_LIMIT);
    assertEquals(limits.get("message").asInt(), Validator.MESSAGE_LIMIT);
    assertEquals(CONTRACT.get("emailPattern").asString(), Validator.EMAIL_PATTERN);
  }

  @Test
  void toStringHidesEveryField() {
    ContactRequest request =
        new ContactRequest("n-secret", "e-secret", "s-secret", "m-secret", "t-secret");
    assertEquals("ContactRequest[redacted]", request.toString());
  }

  private static ContactRequest requestFrom(JsonNode input) {
    return new ContactRequest(
        value(input, "name"),
        value(input, "email"),
        value(input, "subject"),
        value(input, "message"),
        "");
  }

  private static String value(JsonNode input, String field) {
    JsonNode node = input.has(field) ? input.get(field) : CONTRACT.get("base").get(field);
    if (node.isString()) {
      return node.asString();
    }
    return node.path("prefix").asString("")
        + node.get("repeat").asString().repeat(node.get("times").asInt())
        + node.path("suffix").asString("");
  }
}
