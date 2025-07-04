# OAuth Setup for Claude Code Action Lean

This action requires OAuth authentication with Claude Max. This guide explains how to set up the required OAuth credentials.

## Prerequisites

- Claude Max subscription
- `claude` CLI installed locally
- GitHub repository with secrets management permissions

## Setup Steps

### 1. Get OAuth Tokens

First, login to Claude locally to obtain OAuth tokens:

```bash
claude
/login
```

This will provide you with:
- Access Token
- Refresh Token  
- Expiration timestamp

### 2. Add GitHub Secrets

Add the following secrets to your GitHub repository:

- `CLAUDE_ACCESS_TOKEN` - The access token from step 1
- `CLAUDE_REFRESH_TOKEN` - The refresh token from step 1
- `CLAUDE_EXPIRES_AT` - The expiration timestamp (as a number)

### 3. (Optional) Enable Auto-Refresh

To enable automatic token refresh, create a Personal Access Token with `secrets:write` permission:

1. Go to GitHub Settings → Developer settings → Personal access tokens
2. Create a new token with `repo` scope
3. Add it as a secret named `SECRETS_ADMIN_PAT`

### 4. Update Your Workflow

Update your GitHub workflow to use OAuth:

```yaml
- name: Claude Code Action
  uses: ./lean/claude-code-action-lean
  with:
    # OAuth credentials (required)
    claude_access_token: ${{ secrets.CLAUDE_ACCESS_TOKEN }}
    claude_refresh_token: ${{ secrets.CLAUDE_REFRESH_TOKEN }}
    claude_expires_at: ${{ secrets.CLAUDE_EXPIRES_AT }}
    secrets_admin_pat: ${{ secrets.SECRETS_ADMIN_PAT }} # Optional, for auto-refresh
    
    # Other configuration...
```

## How It Works

1. The action validates that OAuth credentials are provided
2. It checks if the token is expired
3. If expired and `SECRETS_ADMIN_PAT` is provided, it automatically refreshes the token
4. The refreshed tokens are saved back to GitHub secrets for future use
5. OAuth credentials are configured for Claude Code execution

## Token Expiration

- Access tokens typically expire after a few hours
- Refresh tokens last 30-60 days
- If auto-refresh fails, you'll need to login again locally and update all three secrets

## Troubleshooting

### Token Refresh Failed

If you see "Token refresh failed", it usually means:
1. The refresh token has expired (30-60 days)
2. You've logged in elsewhere and the refresh token was revoked
3. The refresh token in your secrets is incorrect

**Solution**: Run `claude` locally, execute `/login`, and update all three secrets.

### Missing SECRETS_ADMIN_PAT

If you see a warning about missing `SECRETS_ADMIN_PAT`, the action will continue but may fail if the token expires during execution. To fix this, create a PAT with `secrets:write` permission and add it to your repository secrets.