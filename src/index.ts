import * as core from "@actions/core";
import { makeQaWolfSdk } from "@qawolf/ci-sdk";
import { coreLogDriver, stringifyUnknown } from "@qawolf/ci-utils";

import { extractRelevantDataFromEvent } from "./extractRelevantDataFromEvent";
import { validateInput } from "./validateInput";
import { validateSecrets } from "./validateSecret";

async function runGitHubAction() {
  core.debug("Validating input.");
  const validateInputResult = validateInput();

  if (!validateInputResult.isValid) {
    core.setFailed(`Input validation failed: ${validateInputResult.error}`);
    return;
  }

  core.debug("Validating secret.");
  const validateSecretsResult = validateSecrets();

  if (!validateSecretsResult.isValid) {
    core.setFailed(`Secrets validation failed: ${validateSecretsResult.error}`);
    return;
  }

  core.debug("Extracting information from event.");
  const relevantEventData = await extractRelevantDataFromEvent();

  if (!relevantEventData.isValid) {
    core.setFailed(`${relevantEventData.error}. Aborting`);
    return;
  }

  const { apiKey } = validateInputResult;
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
    ...validateInputResult,
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
