package com.benmorrison.contact;

interface ChallengeVerifier {
  /**
   * Returns whether the token is good. A false is the visitor's problem, and a thrown exception is
   * the site's (design §3).
   */
  boolean verify(String token) throws ServiceUnavailableException;
}
