package com.benmorrison.contact;

import software.amazon.awssdk.services.ssm.SsmClient;
import software.amazon.awssdk.services.ssm.model.GetParameterRequest;
import software.amazon.awssdk.services.ssm.model.GetParameterResponse;

final class StubSsm implements SsmClient {
  int reads;
  GetParameterRequest lastRequest;
  RuntimeException failure;

  @Override
  public GetParameterResponse getParameter(GetParameterRequest request) {
    reads++;
    lastRequest = request;
    if (failure != null) {
      throw failure;
    }
    return GetParameterResponse.builder().parameter(p -> p.value("the-secret")).build();
  }

  @Override
  public String serviceName() {
    return "ssm";
  }

  @Override
  public void close() {}
}
