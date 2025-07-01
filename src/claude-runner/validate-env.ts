/**
 * Validates the environment variables required for running Claude Code
 */
export function validateEnvironmentVariables() {
  const anthropicApiKey = process.env.ANTHROPIC_API_KEY;

  if (!anthropicApiKey) {
    throw new Error("ANTHROPIC_API_KEY is required.");
  }
}
