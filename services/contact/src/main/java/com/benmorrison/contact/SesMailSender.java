package com.benmorrison.contact;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import software.amazon.awssdk.core.exception.SdkException;
import software.amazon.awssdk.http.urlconnection.UrlConnectionHttpClient;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.sesv2.SesV2Client;
import software.amazon.awssdk.services.sesv2.model.Body;
import software.amazon.awssdk.services.sesv2.model.Content;
import software.amazon.awssdk.services.sesv2.model.Destination;
import software.amazon.awssdk.services.sesv2.model.EmailContent;
import software.amazon.awssdk.services.sesv2.model.SendEmailRequest;

/** Sends one plain-text email to the owner, and only to the owner (R7.4, R7.6). */
final class SesMailSender implements MailSender {
  private static final Duration TIMEOUT = Duration.ofSeconds(4);

  private final SesV2Client client;
  private final String from;
  private final String to;

  SesMailSender(SesV2Client client, String from, String to) {
    this.client = client;
    this.from = from;
    this.to = to;
  }

  static SesV2Client defaultClient(Region region) {
    return SesV2Client.builder()
        .region(region)
        .httpClientBuilder(
            UrlConnectionHttpClient.builder().connectionTimeout(TIMEOUT).socketTimeout(TIMEOUT))
        .overrideConfiguration(config -> config.apiCallTimeout(TIMEOUT))
        .build();
  }

  @Override
  public void send(Message message) throws ServiceUnavailableException {
    SendEmailRequest request =
        SendEmailRequest.builder()
            .fromEmailAddress(from)
            .destination(Destination.builder().toAddresses(to).build())
            .replyToAddresses(message.replyTo())
            .content(
                EmailContent.builder()
                    .simple(
                        simple ->
                            simple
                                .subject(utf8(message.subject()))
                                .body(Body.builder().text(utf8(message.body())).build()))
                    .build())
            .build();
    try {
      client.sendEmail(request);
    } catch (SdkException e) {
      throw ServiceUnavailableException.from(e);
    }
  }

  private static Content utf8(String value) {
    return Content.builder().data(value).charset(StandardCharsets.UTF_8.name()).build();
  }
}
