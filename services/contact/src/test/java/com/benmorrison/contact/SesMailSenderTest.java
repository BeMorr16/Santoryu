package com.benmorrison.contact;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import org.junit.jupiter.api.Test;
import software.amazon.awssdk.services.sesv2.SesV2Client;
import software.amazon.awssdk.services.sesv2.model.SendEmailRequest;
import software.amazon.awssdk.services.sesv2.model.SendEmailResponse;
import software.amazon.awssdk.services.sesv2.model.SesV2Exception;

class SesMailSenderTest {
  private static final Message MESSAGE =
      new Message("Site contact: Acme", "Body text", "visitor@example.com");

  private static final class StubClient implements SesV2Client {
    SendEmailRequest request;
    RuntimeException failure;

    @Override
    public SendEmailResponse sendEmail(SendEmailRequest sendEmailRequest) {
      request = sendEmailRequest;
      if (failure != null) {
        throw failure;
      }
      return SendEmailResponse.builder().messageId("id").build();
    }

    @Override
    public String serviceName() {
      return "ses";
    }

    @Override
    public void close() {}
  }

  @Test
  void sendsToTheOwnerOnlyWithReplyToTheVisitor() throws Exception {
    StubClient client = new StubClient();
    new SesMailSender(client, "contact@example.org", "owner@example.org").send(MESSAGE);

    SendEmailRequest sent = client.request;
    assertEquals("contact@example.org", sent.fromEmailAddress());
    assertEquals(List.of("owner@example.org"), sent.destination().toAddresses());
    assertTrue(sent.destination().ccAddresses().isEmpty());
    assertTrue(sent.destination().bccAddresses().isEmpty());
    assertEquals(List.of("visitor@example.com"), sent.replyToAddresses());
  }

  @Test
  void sendsPlainTextOnly() throws Exception {
    StubClient client = new StubClient();
    new SesMailSender(client, "contact@example.org", "owner@example.org").send(MESSAGE);

    var simple = client.request.content().simple();
    assertEquals("Site contact: Acme", simple.subject().data());
    assertEquals("Body text", simple.body().text().data());
    assertEquals("UTF-8", simple.body().text().charset());
    assertNull(simple.body().html());
  }

  @Test
  void aFailureCarriesOnlyTheClassName() {
    StubClient client = new StubClient();
    client.failure = SesV2Exception.builder().message("rejected visitor@example.com").build();
    SesMailSender sender = new SesMailSender(client, "contact@example.org", "owner@example.org");

    ServiceUnavailableException thrown =
        assertThrows(ServiceUnavailableException.class, () -> sender.send(MESSAGE));

    assertEquals("SesV2Exception", thrown.errorClass());
    assertFalse(thrown.getMessage().contains("visitor@example.com"));
    assertNull(thrown.getCause());
  }
}
