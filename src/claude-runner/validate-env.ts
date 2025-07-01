/**
 * Validates the environment variables required for running Claude Code
 */
export function validateEnvironmentVariables() {
  const claudeAccessToken = process.env.INPUT_CLAUDE_ACCESS_TOKEN;
  const claudeRefreshToken = process.env.INPUT_CLAUDE_REFRESH_TOKEN;
  const claudeExpiresAt = process.env.INPUT_CLAUDE_EXPIRES_AT;

  // OAuth credentials are required
  if (!claudeAccessToken || !claudeRefreshToken || !claudeExpiresAt) {
    throw new Error("OAuth credentials are required. Please provide: claude_access_token, claude_refresh_token, and claude_expires_at");
  }
}
