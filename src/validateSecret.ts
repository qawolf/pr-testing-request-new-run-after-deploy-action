import * as github from "@actions/github";

import { githubTokenSchema } from "./types";

export const validateSecrets = ():
  | { isValid: true }
  | { error: string; isValid: false } => {
  const rawGithubToken = process.env.GITHUB_TOKEN;
  const githubToken = githubTokenSchema.safeParse(rawGithubToken);

  if (
    github.context.eventName === "deployment_status" &&
    !githubToken.success
  ) {
    return {
      error: `Invalid 'GITHUB_TOKEN' secret.GITHUB_TOKEN is required if trigger is "deployment_status".`,
      isValid: false,
    };
  }

  return { isValid: true };
};
