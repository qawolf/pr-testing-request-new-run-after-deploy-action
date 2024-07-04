# QA Wolf - Request New Run After Deploy Action

This is a GitHub Action for PR testing with QA Wolf. It is intended to be used in a workflow that runs after a deployment action. It will run your QA Wolf end-to-end test suite on the deployed environment.

## Inputs

### `qawolf-api-key`

**Required**. The QA Wolf API key. You can find your API key on the [QA Wolf settings page](https://app.qawolf.com/settings).

### `base-environments-mapping`

**Required**. A JSON-formatted array that defines the relationships between QA Wolf environments and Version Control System (VCS) branches. QA Wolf environment identifiers are called "environment aliases" and can be retrieved from the "General" tab on the environment settings page in QA Wolf. The recommended format for an environment alias is `<organization-name>/<repo-name>/<branch-name>`.

In this example, the mapping indicates that the "develop" QA Wolf environment corresponds to the "main" VCS branch:

```json
[{ "environmentAlias": "develop", "vcsBranch": "main" }]
```

### `head-environment-variables`

**Required**. JSON-formatted environment variables including deployment locations. Get help from a QA Wolf representative to determine which variables will be required here, as each customer has its own deployment layout.

In this example, the JSON object indicates that QA Wolf can reach your deployed environment at `https://pr-9888.preview.myapp.io`:

```json
{
  "URL": "https://pr-9888.preview.myapp.io"
}
```

### `concurrency-limit`

A positive number representing the maximum number of concurrent workflows that can be executed at once. It will default to the concurrency limit defined in the base environment. If you are unsure about this value, you can leave it empty.

## Usage

### Trigger action on default `pull_request` events

[GitHub Docs: `pull_request` events](https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#pull_request)

```yaml
name: Deploy and Test Preview Environment
# It is a requirement that the qawolf/pr-testing-notify-build-deployed-action
# is triggered with pull_request or pull_request_target events exclusively.
# Note that by default, pull_request will subscribe only to the following
# actions: 'opened', 'synchronize' and 'reopened'.
on: pull_request
jobs:
  deploy-preview-environmnent:
    # This job MUST output JSON-formatted environment-variables. The dependency
    # is expressed in the trigger-pr-testing job below
    # (steps[0].with.environment-variables)
    name: Your custom job to deploy a preview environment
    uses: ./your-custom-action
  wait-for-deployment:
    name: Your custom job to wait for the deployed environment to be ready
    uses: ./your-custom-action
  trigger-pr-testing:
    needs: deploy-preview-environmnent
    name: Trigger QA Wolf PR testing
    runs-on: ubuntu-latest
    steps:
      - name: Test preview environment
        if: ${{
          (github.event_name == 'pull_request' || github.event_name == 'pull_request_target')
          && github.action != 'closed'
          }}
        uses: qawolf/pr-testing-request-new-run-after-deploy-action
        with:
          qawolf-api-key: "${{ secrets.QAWOLF_API_KEY }}"
          # Requires the previous step to output JSON-formatted environment variables
          environment-variables: ${{ needs.deploy-preview-environmnent.outputs.environment-variables }}
          # A typical Gitflow mapping. This is very dependent on your branching
          # and release models.
          base-environments-mapping: >
            [
              { "environmentAlias": "develop", "vcsBranch": "develop" },
              { "environmentAlias": "production", "vcsBranch": "main" }
            ]
```

### Trigger action when a `pr-testing` label is applied

```yaml
name: Deploy and Test Preview Environment
on:
  pull_request:
    # Don’t run when opening a PR. If a PR is opened with a label already attached,
    # GitHub triggers two runs: one for “opened” and another for “labeled”
    types: [labeled, reopened, synchronize]
jobs:
  deploy-preview-environmnent:
    name: Your custom job to deploy a preview environment
    uses: ./your-custom-action
  wait-for-deployment:
    name: Your custom job to wait for the deployed environment to be ready
    uses: ./your-custom-action
  trigger-pr-testing:
    needs: deploy-preview-environmnent
    name: Trigger QA Wolf PR testing
    runs-on: ubuntu-latest
    steps:
      - name: Test preview environment
        # Restrict the if condition to only be satisfied when the pr-testing label is applied.
        if: ${{
          contains(github.event.pull_request.labels.*.name, 'pr-testing')
          }}
        uses: qawolf/pr-testing-request-new-run-after-deploy-action
        with:
          qawolf-api-key: "${{ secrets.QAWOLF_API_KEY }}"
          environment-variables: ${{ needs.deploy-preview-environmnent.outputs.environment-variables }}
          base-environments-mapping: >
            [
              { "environmentAlias": "develop", "vcsBranch": "develop" },
              { "environmentAlias": "production", "vcsBranch": "main" }
            ]
```

### Trigger when a PR is ready for review

```yaml
name: Deploy and Test Preview Environment
on:
  pull_request:
    types: [ready_for_review, reopened, synchronize]
jobs:
  deploy-preview-environmnent:
    name: Your custom job to deploy a preview environment
    uses: ./your-custom-action
  wait-for-deployment:
    name: Your custom job to wait for the deployed environment to be ready
    uses: ./your-custom-action
  trigger-pr-testing:
    needs: deploy-preview-environmnent
    name: Trigger QA Wolf PR testing
    runs-on: ubuntu-latest
    steps:
      - name: Test preview environment
        if: ${{
          ((github.event_name == 'pull_request' || github.event_name == 'pull_request_target')
          && github.action != 'closed') && (
          !github.event.pull_request.draft
          )
          }}
        uses: qawolf/pr-testing-request-new-run-after-deploy-action
        with:
          qawolf-api-key: "${{ secrets.QAWOLF_API_KEY }}"
          environment-variables: ${{ needs.deploy-preview-environmnent.outputs.environment-variables }}
          base-environments-mapping: >
            [
              { "environmentAlias": "develop", "vcsBranch": "develop" },
              { "environmentAlias": "production", "vcsBranch": "main" }
            ]
```
