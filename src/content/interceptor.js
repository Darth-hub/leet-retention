const originalFetch = window.fetch;
window.fetch = async (...args) => {
  const response =
    await originalFetch(...args);
  try {
    const [url, options] = args;
    if (
      !url.includes("/graphql/")
    ) {
      return response;
    }
    if (!options?.body) {
      return response;
    }
    const requestBody =
      JSON.parse(options.body);
    if (
      requestBody.operationName !==
      "submissionDetails"
    ) {
      return response;
    }
    const clonedResponse =
      response.clone();
    const responseData =
      await clonedResponse.json();
    const submission =
      responseData?.data
        ?.submissionDetails;
    if (!submission) {
      return response;
    }
    window.postMessage(
      {
        type:
          "LEET_RETENTION_SUBMISSION",
        payload: {
          timestamp:
            submission.timestamp,
          statusCode:
            submission.statusCode,
          runtime:
            submission.runtime,
          topicTags:
            submission.topicTags,
          question:
            submission.question,
        },
      },
      "*"
    );
  } catch (error) {
    console.error(
      "Interceptor error:",
      error
    );
  }
  return response;
};