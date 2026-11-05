package com.benmorrison.contact;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

class MessageTest {
  private static ContactRequest request(String subject) {
    return new ContactRequest("Ada", "ada@example.com", subject, "Line one\nLine two", "token");
  }

  @Test
  void subjectUsesRoleOrCompanyWhenGiven() {
    assertEquals("Site contact: Acme", Message.from(request("Acme")).subject());
  }

  @Test
  void subjectFallsBackToTheName() {
    assertEquals("Site contact: Ada", Message.from(request("")).subject());
  }

  @Test
  void bodyHoldsEveryFieldAsPlainText() {
    assertEquals(
        """
        Name: Ada
        Email: ada@example.com
        Role or company: Acme

        Line one
        Line two
        """,
        Message.from(request("Acme")).body());
  }

  @Test
  void bodySaysWhenRoleOrCompanyIsEmpty() {
    assertTrue(Message.from(request("")).body().contains("Role or company: Not given\n"));
  }

  @Test
  void bodyNeverHoldsTheToken() {
    assertFalse(Message.from(request("Acme")).body().contains("token"));
  }

  @Test
  void repliesGoToTheVisitor() {
    assertEquals("ada@example.com", Message.from(request("")).replyTo());
  }

  @Test
  void toStringHidesTheContents() {
    assertEquals("Message[redacted]", Message.from(request("Acme")).toString());
  }
}
