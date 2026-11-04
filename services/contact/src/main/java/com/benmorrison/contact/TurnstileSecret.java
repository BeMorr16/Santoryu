package com.benmorrison.contact;

import java.time.Duration;
import software.amazon.awssdk.core.exception.SdkException;
import software.amazon.awssdk.http.urlconnection.UrlConnectionHttpClient;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.ssm.SsmClient;
import software.amazon.awssdk.services.ssm.model.GetParameterRequest;

/**
 * Reads the secret on first use, after any SnapStart restore, so it's never in the snapshot. A
 * failed read isn't cached, so the next request tries again.
 */
final class TurnstileSecret {
  private static final Duration TIMEOUT = Duration.ofSeconds(2);

  private final SsmClient client;
  private final String parameterName;
  private String value;

  TurnstileSecret(SsmClient client, String parameterName) {
    this.client = client;
    this.parameterName = parameterName;
  }

  static SsmClient defaultClient(Region region) {
    return SsmClient.builder()
        .region(region)
        .httpClientBuilder(
            UrlConnectionHttpClient.builder().connectionTimeout(TIMEOUT).socketTimeout(TIMEOUT))
        .overrideConfiguration(config -> config.apiCallTimeout(TIMEOUT))
        .build();
  }

  String get() throws ServiceUnavailableException {
    if (value == null) {
      GetParameterRequest request =
          GetParameterRequest.builder().name(parameterName).withDecryption(true).build();
      try {
        value = client.getParameter(request).parameter().value();
      } catch (SdkException e) {
        throw ServiceUnavailableException.from(e);
      }
    }
    return value;
  }

  /** Redacted, so the secret can't reach a log (R5.6). */
  @Override
  public String toString() {
    return "TurnstileSecret[redacted]";
  }
}
