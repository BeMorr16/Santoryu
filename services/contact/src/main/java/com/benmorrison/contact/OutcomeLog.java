package com.benmorrison.contact;

import java.util.function.Consumer;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ObjectNode;

/** Writes the one log line per request. It holds these four fields and nothing else (R9.2). */
final class OutcomeLog {
  private final JsonMapper json;
  private final Consumer<String> sink;

  OutcomeLog(JsonMapper json, Consumer<String> sink) {
    this.json = json;
    this.sink = sink;
  }

  void write(ContactResponse response) {
    sink.accept(line(response));
  }

  String line(ContactResponse response) {
    ObjectNode line = json.createObjectNode();
    line.put("outcome", response.outcome());
    line.put("status", response.status());
    line.put("stage", response.stage());
    line.put("errorClass", response.errorClass());
    return json.writeValueAsString(line);
  }
}
