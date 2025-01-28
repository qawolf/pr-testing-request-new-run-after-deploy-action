import * as core from "@actions/core";
import * as github from "@actions/github";
import {
  type CheckRunPullRequest,
  type DeploymentStatusCreatedEvent,
  type PullRequestEvent,
  type Repository,
  type SimplePullRequest,
} from "@octokit/webhooks-types";

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

type RelevantDataExtended =
  | (RelevantEventData & { isValid: true })
  | { error: string; isValid: false };

export const extractRelevantDataFromEvent =
  async (): Promise<RelevantDataExtended> => {
    if (
      github.context.eventName !== "pull_request" &&
      github.context.eventName !== "pull_request_target" &&
      github.context.eventName !== "deployment_status"
    ) {
      return {
        error:
          "This action requires to be run in a GitHub Workflow subscribing exclusively to 'pull_request', 'pull_request_target' or 'deployment_status' events. " +
          "For more info on pull_request events, see https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#pull_request. " +
          "For more info on pull_request_target events, see https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#pull_request_target" +
          "For more info on deployment_status events, see https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#deployment_status",
        isValid: false,
      };
    }

    if (github.context.eventName === "deployment_status")
      return extractRelevantDataFromDeployment();

    return extractRelevantDataFromPullRequest();
  };

export const extractRelevantDataFromPullRequest =
  async (): Promise<RelevantDataExtended> => {
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

    return extractRelevantData(event.repository, event.pull_request);
  };

export const extractRelevantDataFromDeployment =
  async (): Promise<RelevantDataExtended> => {
    const { context } = github;
    const event = context.payload as DeploymentStatusCreatedEvent;

    if (event.deployment_status.state !== "success") {
      return {
        error: `This action should only run if deployment_status is "success"`,
        isValid: false,
      };
    }

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- Technical debt
    const octokit = github.getOctokit(process.env.GITHUB_TOKEN!);

    const { data: pullRequests } =
      await octokit.rest.repos.listPullRequestsAssociatedWithCommit({
        commit_sha: event.deployment.sha,
        owner: context.repo.owner,
        repo: context.repo.repo,
      });

    // Sort pull request desc
    const sortedPullRequests = pullRequests.sort(
      (a, b) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
    );

    const pullRequest = sortedPullRequests[0];

    if (pullRequest === undefined) {
      return {
        error: "No pull requests found associated with the commit.",
        isValid: false,
      };
    }

    if (sortedPullRequests.length > 1) {
      core.debug(
        `More than one pull request associated with sha = ${event.deployment.sha}. Using pull request with title "${pullRequest.title}"`,
      );
    }

    return extractRelevantData(event.repository, pullRequest);
  };

const extractRelevantData = (
  repository: Repository,
  pullRequest: Pick<CheckRunPullRequest, "base" | "number"> &
    Pick<SimplePullRequest, "title"> & {
      head: Pick<CheckRunPullRequest["base"], "ref" | "sha">;
    },
): RelevantEventData & { isValid: true } => {
  const fullName = repository.full_name;
  const organization = fullName.substring(0, fullName.indexOf("/"));
  const repositoryName = fullName.substring(fullName.indexOf("/") + 1);

  const headEnvironmentAlias = pullRequestDetailsToEnvironmentAlias({
    codeHostingServiceOrganization: organization,
    codeHostingServiceRepositoryName: repositoryName,
    pullRequestIdentifier: String(pullRequest.number),
  });

  const baseVcsBranch = pullRequest.base.ref;
  const headVcsBranch = pullRequest.head.ref;
  const headVcsCommitId = pullRequest.head.sha;
  const headEnvironmentName = `PR ${pullRequest.number} - ${pullRequest.title}`;
  const headVcsCommitUrl = `https://github.com/${repository.full_name}/commit/${pullRequest.head.sha}`;
  const pullOrMergeRequestNumber = pullRequest.number;

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
