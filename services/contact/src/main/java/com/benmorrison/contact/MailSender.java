package com.benmorrison.contact;

interface MailSender {
  void send(Message message) throws ServiceUnavailableException;
}
