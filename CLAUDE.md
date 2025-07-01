# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Claude Code Action Lean

This is a merged version of claude-code-action and claude-code-base-action, providing a single unified GitHub Action for Claude integration.

## Development Tools

- Runtime: Bun 1.2.11

## Common Development Tasks

### Available npm/bun scripts from package.json:

```bash
# Test
bun test

# Formatting
bun run format          # Format code with prettier
bun run format:check    # Check code formatting
```

## Architecture Overview

This is a unified GitHub Action that enables Claude to interact with GitHub PRs and issues. The action:

1. **Trigger Detection**: Uses validation modules to determine if Claude should respond based on comment/issue content
2. **Context Gathering**: Fetches GitHub data (PRs, issues, comments) via data fetcher and formats it using data formatter
3. **AI Integration**: Direct integration with Claude via Anthropic API
4. **Prompt Creation**: Generates context-rich prompts using create-prompt
5. **MCP Server Integration**: Installs and configures GitHub MCP server for extended functionality
6. **Claude Execution**: Runs Claude directly within the action using the claude-runner modules

### Key Components

- **Trigger System**: Responds to `/claude` comments or issue assignments
- **Authentication**: OIDC-based token exchange for secure GitHub interactions
- **Cloud Integration**: Uses direct Anthropic API
- **GitHub Operations**: Creates branches, posts comments, and manages PRs/issues

### Project Structure

```
src/
├── entrypoints/
│   ├── prepare.ts          # Main entry point - handles trigger detection, GitHub ops, and Claude execution
│   └── update-comment-link.ts # Updates comments with job links
├── claude-runner/          # Claude execution modules (from claude-code-base-action)
│   ├── prepare-prompt.ts   # Prepares prompt for Claude
│   ├── run-claude.ts       # Executes Claude with given configuration
│   ├── setup-claude-code-settings.ts # Sets up Claude Code settings
│   └── validate-env.ts     # Validates environment variables
├── create-prompt/          # Prompt creation logic
├── github/                 # GitHub API interactions
│   ├── api/               # API client and queries
│   ├── data/              # Data fetching and formatting
│   ├── operations/        # Branch and comment operations
│   ├── utils/             # Utilities like image downloader
│   └── validation/        # Permission and trigger validation
└── mcp/                   # MCP server configuration
```

## Important Notes

- Actions are triggered by `@claude` comments or issue assignment unless a different trigger_phrase is specified
- The action creates branches for issues and pushes to PR branches directly
- All actions create OIDC tokens for secure authentication
- Progress is tracked through dynamic comment updates with checkboxes
