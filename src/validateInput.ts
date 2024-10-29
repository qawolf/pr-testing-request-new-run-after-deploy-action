import * as core from "@actions/core";

import { type NotifyBuildDeployedInput } from "@qawolf/ci-sdk";
import {
  jsonEnvironmentsMappingSchema,
  jsonEnvironmentVariablesSchema,
} from "@qawolf/ci-utils";

import { jsonConcurrentLimitSchema } from "./types";

type ActionInputs = Pick<
  NotifyBuildDeployedInput,
  "baseEnvironmentsMapping" | "concurrencyLimit" | "headEnvironmentVariables"
> & { apiKey: string; qawolfBaseUrl: string };

export const validateInput = ():
  | (ActionInputs & { isValid: true })
  | { error: string; isValid: false } => {
  const qawolfApiKey = core.getInput("qawolf-api-key", { required: true });

  const rawBaseEnvironmentsMapping = core.getInput(
    "base-environments-mapping",
    {
      required: false,
    },
  );
  const baseEnvironmentsMapping = jsonEnvironmentsMappingSchema.safeParse(
    rawBaseEnvironmentsMapping,
  );

  const rawHeadEnvironmentVariables = core.getInput(
    "head-environment-variables",
    {
      required: true,
    },
  );
  const headEnvironmentVariables = jsonEnvironmentVariablesSchema.safeParse(
    rawHeadEnvironmentVariables,
  );
  if (!headEnvironmentVariables.success) {
    return {
      error: "Invalid 'head-environment-variables' input",
      isValid: false,
    };
  }

  const rawConcurrencyLimit = core.getInput("concurrency-limit");
  const concurrencyLimit =
    jsonConcurrentLimitSchema.safeParse(rawConcurrencyLimit);
  if (!concurrencyLimit.success) {
    return {
      error: "Invalid 'concurrency-limit' input",
      isValid: false,
    };
  }

  const rawQawolfBaseUrl = core.getInput("qawolf-base-url");
  const qawolfBaseUrl = rawQawolfBaseUrl.trim();

  return {
    apiKey: qawolfApiKey,
    baseEnvironmentsMapping: baseEnvironmentsMapping.data ?? [],
    concurrencyLimit: concurrencyLimit.data,
    headEnvironmentVariables: headEnvironmentVariables.data,
    isValid: true,
    qawolfBaseUrl,
  };
};
