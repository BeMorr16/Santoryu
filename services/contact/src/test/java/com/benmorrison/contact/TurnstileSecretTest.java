package com.benmorrison.contact;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;
import software.amazon.awssdk.services.ssm.model.SsmException;

class TurnstileSecretTest {
  @Test
  void readsNothingAtConstruction() {
    StubSsm ssm = new StubSsm();
    new TurnstileSecret(ssm, "/param");
    assertEquals(0, ssm.reads);
  }

  @Test
  void readsOnceAcrossTwoUsesWithDecryption() throws Exception {
    StubSsm ssm = new StubSsm();
    TurnstileSecret secret = new TurnstileSecret(ssm, "/param");

    assertEquals("the-secret", secret.get());
    assertEquals("the-secret", secret.get());

    assertEquals(1, ssm.reads);
    assertEquals("/param", ssm.lastRequest.name());
    assertTrue(ssm.lastRequest.withDecryption());
  }

  @Test
  void aFailedReadIsNotCached() throws Exception {
    StubSsm ssm = new StubSsm();
    ssm.failure = SsmException.builder().message("denied").build();
    TurnstileSecret secret = new TurnstileSecret(ssm, "/param");

    ServiceUnavailableException thrown =
        assertThrows(ServiceUnavailableException.class, secret::get);
    assertEquals("SsmException", thrown.errorClass());

    ssm.failure = null;
    assertEquals("the-secret", secret.get());
  }

  @Test
  void toStringHidesTheSecret() throws Exception {
    TurnstileSecret secret = new TurnstileSecret(new StubSsm(), "/param");
    secret.get();
    assertFalse(secret.toString().contains("the-secret"));
  }
}
