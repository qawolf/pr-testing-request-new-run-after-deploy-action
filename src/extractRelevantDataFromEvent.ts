import * as github from "@actions/github";
import { type PullRequestEvent } from "@octokit/webhooks-types";
import {
  type NotifyBuildDeployedInput,
  pullRequestDetailsToEnvironmentAlias,
} from "@qawolf/ci-sdk";

type RelevantEventData = Pick<
  NotifyBuildDeployedInput,
  | "baseVcsBranch"
  | "headVcsBranch"
  | "headVcsCommitId"
  | "headEnvironmentName"
  | "headEnvironmentAlias"
  | "headVcsCommitUrl"
  | "pullOrMergeRequestNumber"
>;

export const extractRelevantDataFromEvent = ():
  | (RelevantEventData & { isValid: true })
  | { error: string; isValid: false } => {
  if (
    github.context.eventName !== "pull_request" &&
    github.context.eventName !== "pull_request_target"
  )
    return {
      error:
        "This action requires to be run in a GitHub Workflow subscribing exclusively to 'pull_request' or 'pull_request_target' events. " +
        "For more info on pull_request events, see https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#pull_request. " +
        "For more info on pull_request_target events, see https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#pull_request_target",
      isValid: false,
    };
  const event = github.context.payload as PullRequestEvent;
  if (event.action === "closed") {
    return {
      error:
        "This action should not be run when a pull request is closed. " +
        "See https://docs.github.com/en/webhooks/webhook-events-and-payloads?actionType=closed#pull_request",
      isValid: false,
    };
  }

  if (event.pull_request.base.repo.full_name !== event.repository.full_name) {
    return {
      error:
        "This action should not be run when a pull request is from a forked repository",
      isValid: false,
    };
  }

  const fullName = event.repository.full_name;
  const organization = fullName.substring(0, fullName.indexOf("/"));
  const repository = fullName.substring(fullName.indexOf("/") + 1);
  const headEnvironmentAlias = pullRequestDetailsToEnvironmentAlias({
    codeHostingServiceOrganization: organization,
    codeHostingServiceRepositoryName: repository,
    pullRequestIdentifier: String(event.pull_request.number),
  });

  const baseVcsBranch = event.pull_request.base.ref;
  const headVcsBranch = event.pull_request.head.ref;
  const headVcsCommitId = event.pull_request.head.sha;
  const headEnvironmentName = `PR ${event.pull_request.number} - ${event.pull_request.title}`;
  const headVcsCommitUrl = `https://github.com/${event.repository.full_name}/commit/${event.pull_request.head.sha}`;
  const pullOrMergeRequestNumber = event.pull_request.number;

  return {
    baseVcsBranch,
    headEnvironmentAlias,
    headEnvironmentName,
    headVcsBranch,
    headVcsCommitId,
    headVcsCommitUrl,
    isValid: true,
    pullOrMergeRequestNumber,
  };
};
