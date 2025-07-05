/**
 * Application constants for configurable values and external dependencies
 */
export const CONFIG = {
  // Пользовательские настройки
  DEFAULT_BRANCH_PREFIX: "claude/",
  
  // Внешние API
  ANTHROPIC_OAUTH_URL: "https://console.anthropic.com/v1/oauth/token",
  ANTHROPIC_CLIENT_ID: "9d1c250a-e61b-44d9-88ed-5944d1962f5e",
  
  // Docker
  GITHUB_MCP_SERVER_IMAGE: "ghcr.io/github/github-mcp-server:sha-6d69797",
  
  // Версии
  CLAUDE_CODE_VERSION: "1.0.35", // Также обновите в action.yml:126
} as const;