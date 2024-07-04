import * as core from "@actions/core";
import { makeQaWolfSdk } from "@qawolf/ci-sdk";
import { coreLogDriver, stringifyUnknown } from "@qawolf/ci-utils";

import { extractRelevantDataFromEvent } from "./extractRelevantDataFromEvent";
import { validateInput } from "./validateInput";

async function runGitHubAction() {
  const relevantEventData = extractRelevantDataFromEvent();

  if (!relevantEventData.isValid) {
    core.setFailed(`${relevantEventData.error}. Aborting`);
    return;
  }

  core.debug("Validating input.");
  const validationResult = validateInput();

  if (!validationResult.isValid) {
    core.setFailed(`Input validation failed: ${validationResult.error}`);
    return;
  }

  const { apiKey } = validationResult;
  const { experimental_vcsBranchTesting } = makeQaWolfSdk(
    { apiKey },
    {
      // Replace default log driver with core logging.
      log: coreLogDriver,
    },
  );
  const { notifyVCSBranchBuildDeployed } = experimental_vcsBranchTesting;

  core.info("Attempting to notify QA Wolf of deployment.");
  const deployResult = await notifyVCSBranchBuildDeployed({
    ...relevantEventData,
    ...validationResult,
  });

  if (deployResult.outcome === "aborted") {
    core.setFailed(
      `Failed to notify QA Wolf of deployment with reason "${deployResult.abortReason}".`,
    );
    return;
  }

  core.info("Successfully notified QA Wolf of deployment.");
}

runGitHubAction().catch((error) => {
  core.setFailed(
    `Action failed with reason: ${stringifyUnknown(error) ?? "Unknown error"}`,
  );
});
