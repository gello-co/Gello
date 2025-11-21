# Workflow Test Events

Example event payloads for testing GitHub Actions workflows locally with `act`.

## Usage

```bash
# Test CI workflow with custom event
act pull_request -e .github/workflows/test-events/pull_request.json

# Test Dependabot workflow
act pull_request_target -e .github/workflows/test-events/dependabot-pr.json -a dependabot[bot]
```

## Event Files

- `pull_request.json` - Standard pull request event
- `dependabot-pr.json` - Dependabot pull request event

## Customizing Events

Modify these JSON files to test different scenarios:

- Change `merged` status for PR closure tests
- Add/remove `labels` for label-based triggers
- Modify `action` type for different event types
