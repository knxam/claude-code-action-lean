#!/bin/bash
# prepare-oauth.sh - Prepares OAuth tokens for Claude Code

set -e

# Check if OAuth is enabled
if [[ "$USE_OAUTH" != "true" ]]; then
  echo "OAuth not enabled, skipping preparation"
  exit 0
fi

echo "🔑 Preparing OAuth authentication for Claude Max..."

# Debug information
echo "Debug: CLAUDE_EXPIRES_AT = $CLAUDE_EXPIRES_AT"

# Check for required variables
if [[ -z "$CLAUDE_ACCESS_TOKEN" ]] || [[ -z "$CLAUDE_REFRESH_TOKEN" ]] || [[ -z "$CLAUDE_EXPIRES_AT" ]]; then
  echo "❌ Error: OAuth credentials are missing!"
  echo "Required: CLAUDE_ACCESS_TOKEN, CLAUDE_REFRESH_TOKEN, CLAUDE_EXPIRES_AT"
  exit 1
fi

# Create directory for credentials
CLAUDE_DIR="$HOME/.claude"
mkdir -p "$CLAUDE_DIR"

# Create credentials.json file in the format expected by Claude Code
cat > "$CLAUDE_DIR/.credentials.json" << EOF
{
  "claudeAiOauth": {
    "accessToken": "$CLAUDE_ACCESS_TOKEN",
    "refreshToken": "$CLAUDE_REFRESH_TOKEN",
    "expiresAt": $CLAUDE_EXPIRES_AT,
    "scopes": ["user:inference", "user:profile"]
  }
}
EOF

echo "✅ OAuth credentials prepared successfully"

# Export environment variable for Claude Code
export CLAUDE_AUTH_METHOD="oauth"
echo "CLAUDE_AUTH_METHOD=oauth" >> $GITHUB_ENV

# Check token expiration
CURRENT_TIME=$(date +%s)
EXPIRES_AT_SEC=0

# The expiration time is expected to be a timestamp in milliseconds.
if [[ "$CLAUDE_EXPIRES_AT" =~ ^[0-9]+$ ]]; then
  EXPIRES_AT_SEC=$((CLAUDE_EXPIRES_AT / 1000))
fi

if [[ $EXPIRES_AT_SEC -eq 0 ]]; then
  echo "⚠️ Warning: Unable to parse expiration date. Token may be expired."
elif [[ $EXPIRES_AT_SEC -le $CURRENT_TIME ]]; then
  echo "⚠️ Warning: OAuth token has expired. Please refresh your credentials."
else
  REMAINING_DAYS=$(( (EXPIRES_AT_SEC - CURRENT_TIME) / 86400 ))
  echo "✅ Token is valid for $REMAINING_DAYS more days"
fi

echo "📍 Credentials saved to: $CLAUDE_DIR/.credentials.json"