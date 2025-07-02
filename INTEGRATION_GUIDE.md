# Claude Copilot Integration Guide

This guide explains how to set up the complete Claude integration using both the webhook service and the Claude Code Action.

## Overview

The integration provides two modes of operation:

1. **Automatic Processing**: When an issue is labeled, a PR is created and Claude automatically processes it
2. **Interactive Mode**: Users can interact with Claude via comments and reviews in the PR

## Architecture

```
Issue Labeled → Webhook → Create PR → Repository Dispatch → Claude Action → Process Issue
                                                     ↓
User Comments (@claude) → GitHub Event → Claude Action → Respond to Feedback
```

## Setup Instructions

### 1. Deploy the Webhook Service

The `claude-copilot-webhook` service needs to be deployed and configured:

```bash
cd claude-copilot-webhook
bun install
# Deploy to your preferred platform (Vercel, Railway, etc.)
```

**Environment Variables:**
- `WEBHOOK_SECRET`: GitHub webhook secret
- `PRIVATE_KEY`: GitHub App private key
- `APP_ID`: GitHub App ID
- `TARGET_LABEL`: Label that triggers the webhook (e.g., "claude")
- `DEFAULT_BRANCH`: Default branch to create PRs against (e.g., "main")

### 2. Configure GitHub Workflow

Create a workflow file in your repository (e.g., `.github/workflows/claude.yml`) with the following content. This workflow is designed to handle both automatic webhook triggers and manual interactions.

```yaml
name: Claude Copilot Agent

on:
  # For automatic processing via webhook
  repository_dispatch:
    types: [claude-process-pr]

  # For manual interaction
  issue_comment:
    types: [created]
  pull_request_review_comment:
    types: [created]
  pull_request_review:
    types: [submitted]
  pull_request:
    types: [opened]

jobs:
  claude-code-action:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write
      issues: write
      id-token: write
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Run Claude Copilot Agent
        uses: knxam/claude-code-action-lean@beta
        with:
          # Triggers
          label_trigger: "claude"
          
          # Auth
          claude_access_token: ${{ secrets.CLAUDE_ACCESS_TOKEN }}
          claude_refresh_token: ${{ secrets.CLAUDE_REFRESH_TOKEN }}
          claude_expires_at: ${{ secrets.CLAUDE_EXPIRES_AT }}
          secrets_admin_pat: ${{ secrets.SECRETS_ADMIN_PAT }}
          github_token: ${{ github.event.client_payload.github_app_token || secrets.SECRETS_ADMIN_PAT }}

          # Prompt for webhook trigger
          direct_prompt: |
            ${{ github.event_name == 'repository_dispatch' && format('Please analyze and work on issue #{0}: {1}. The issue description is: {2}', 
                github.event.client_payload.issue_number, 
                github.event.client_payload.issue_title, 
                github.event.client_payload.issue_body) || '' }}

          # Model and other settings
          model: claude-3-opus-20240229
          timeout_minutes: "60"
```

**Required Secrets:**
- `CLAUDE_ACCESS_TOKEN`: Claude OAuth access token
- `CLAUDE_REFRESH_TOKEN`: Claude OAuth refresh token
- `CLAUDE_EXPIRES_AT`: Token expiration timestamp
- `SECRETS_ADMIN_PAT`: Personal access token for token refresh

### 3. Set Up GitHub App/Webhook

1. Create a GitHub App or configure webhook to point to your deployed service
2. Subscribe to the `issues` event with `labeled` action
3. Install the app on your repository

## Usage

### Automatic Processing

1. Create an issue describing what you want Claude to do
2. Add the configured label (e.g., "claude") to the issue
3. The webhook will:
   - Create a new branch (`claude/issue-123-description-1`)
   - Create a PR from that branch
   - Trigger the Claude workflow automatically
4. Claude will analyze the issue and implement changes
5. A comment will be posted with the results

### Interactive Mode

Once the PR is created, you can interact with Claude:

```
@claude please add unit tests for the new function
```

```
@claude the implementation looks good but can you add error handling?
```

```
@claude please update the documentation to reflect these changes
```

Claude will respond to each comment by making the requested changes in the same PR.

### Review Integration

You can also use Claude in PR reviews:

1. Submit a PR review with `@claude` mentions
2. Claude will respond to the review feedback
3. Changes will be committed to the PR branch

## Workflow Events

The workflow triggers on:

- `repository_dispatch` (automatic from webhook)
- `issue_comment` (manual comments)
- `pull_request_review` (review submissions)
- `pull_request_review_comment` (review comments)

## Configuration Options

### Webhook Configuration

- `TARGET_LABEL`: Which label triggers the automation
- `DEFAULT_BRANCH`: Base branch for PRs
- Branch naming pattern: `claude/issue-{number}-{title}-{sequence}`

### Action Configuration

- `trigger_phrase`: Comment trigger (default: "@claude")
- `model`: Claude model to use
- `max_turns`: Maximum conversation turns
- `custom_instructions`: Additional instructions for Claude

## Troubleshooting

### Common Issues

1. **Webhook not triggering**: Check webhook delivery logs in GitHub
2. **Action not running**: Verify workflow permissions and secrets
3. **OAuth errors**: Ensure tokens are valid and refresh token is configured
4. **Branch conflicts**: Webhook creates sequential branches automatically

### Debug Steps

1. Check webhook service logs
2. Review GitHub Actions workflow runs
3. Verify GitHub App permissions
4. Test repository dispatch manually:

```bash
curl -X POST \
  -H "Authorization: token YOUR_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  https://api.github.com/repos/OWNER/REPO/dispatches \
  -d '{"event_type":"claude-process-pr","client_payload":{"pr_number":123,"issue_number":456}}'
```

## Benefits

- **Zero Manual Intervention**: Issues are automatically processed
- **Full Interactivity**: Ongoing collaboration via comments
- **Seamless Experience**: Everything happens in one PR
- **Scalable**: Handles multiple issues concurrently
- **Flexible**: Works with existing GitHub workflows

## Security Considerations

- Webhook validates GitHub signatures
- OAuth tokens are refreshed automatically
- GitHub App has minimal required permissions
- All operations are logged for audit trails