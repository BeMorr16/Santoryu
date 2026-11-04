package com.benmorrison.contact;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.Objects;
import software.amazon.awssdk.regions.Region;
import tools.jackson.databind.json.JsonMapper;

/** The real wiring from environment variables. No network call and no secret read (design §3). */
final class Production {
  private static final JsonMapper JSON = JsonMapper.builder().build();

  private Production() {}

  /**
   * Loaded by {@link ContactHandler}'s public constructor, which Lambda calls during init. So these
   * clients, and the classes {@code prime} loads, are in the SnapStart snapshot.
   */
  static final class Live {
    static final ContactService SERVICE = service(System.getenv());
    // Lambda turns each stdout line into one log event.
    static final OutcomeLog LOG = new OutcomeLog(JSON, line -> System.out.println(line));

    static {
      prime(SERVICE, LOG);
    }

    private Live() {}
  }

  static ContactService service(Map<String, String> env) {
    Region region = Region.of(required(env, "AWS_REGION"));
    String origin = required(env, "SITE_ORIGIN");
    TurnstileSecret secret =
        new TurnstileSecret(
            TurnstileSecret.defaultClient(region), required(env, "TURNSTILE_SECRET_PARAMETER"));
    ChallengeVerifier verifier =
        new CloudflareVerifier(
            CloudflareVerifier.defaultClient(),
            CloudflareVerifier.SITEVERIFY,
            JSON,
            secret,
            URI.create(origin).getHost());
    MailSender mail =
        new SesMailSender(
            SesMailSender.defaultClient(region),
            required(env, "CONTACT_FROM"),
            required(env, "CONTACT_TO"));
    return new ContactService(origin, JSON, verifier, mail);
  }

  /** A valid request with no token stops before the challenge, so nothing leaves the process. */
  static ContactResponse prime(ContactService service, OutcomeLog log) {
    String sample =
        "{\"name\":\"a\",\"email\":\"a@example.com\",\"subject\":\"b\",\"message\":\"c\"}";
    ContactResponse response =
        service.handle(
            "POST",
            "application/json",
            service.allowedOrigin(),
            sample.getBytes(StandardCharsets.UTF_8));
    log.line(response);
    Message.from(new ContactRequest("a", "a@example.com", "", "c", ""));
    return response;
  }

  private static String required(Map<String, String> env, String name) {
    return Objects.requireNonNull(env.get(name), name);
  }
}
