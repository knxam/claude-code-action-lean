#!/usr/bin/env bun

/**
 * Prepare the Claude action by checking trigger conditions, verifying human actor,
 * and creating the initial tracking comment
 */

import * as core from "@actions/core";
import { setupGitHubToken } from "../github/token";
import { checkTriggerAction } from "../github/validation/trigger";
import { checkHumanActor } from "../github/validation/actor";
import { checkWritePermissions } from "../github/validation/permissions";
import { createInitialComment } from "../github/operations/comments/create-initial";
import { setupBranch } from "../github/operations/branch";
import { updateTrackingComment } from "../github/operations/comments/update-with-branch";
import { prepareMcpConfig } from "../mcp/install-mcp-server";
import { createPrompt } from "../create-prompt";
import { createOctokit } from "../github/api/client";
import { fetchGitHubData } from "../github/data/fetcher";
import { parseGitHubContext } from "../github/context";
import { validateEnvironmentVariables } from "../claude-runner/validate-env";
import { setupClaudeCodeSettings } from "../claude-runner/setup-claude-code-settings";
import { preparePrompt } from "../claude-runner/prepare-prompt";
import { runClaude } from "../claude-runner/run-claude";

async function run() {
  try {
    // Step 1: Setup GitHub token
    const githubToken = await setupGitHubToken();
    const octokit = createOctokit(githubToken);

    // Step 2: Parse GitHub context (once for all operations)
    const context = parseGitHubContext();

    // Step 3: Check write permissions
    const hasWritePermissions = await checkWritePermissions(
      octokit.rest,
      context,
    );
    if (!hasWritePermissions) {
      throw new Error(
        "Actor does not have write permissions to the repository",
      );
    }

    // Step 4: Check trigger conditions
    const containsTrigger = await checkTriggerAction(context);

    if (!containsTrigger) {
      console.log("No trigger found, skipping remaining steps");
      return;
    }

    // Step 5: Check if actor is human
    await checkHumanActor(octokit.rest, context);

    // Step 6: Create initial tracking comment
    const commentId = await createInitialComment(octokit.rest, context);

    // Step 7: Fetch GitHub data (once for both branch setup and prompt creation)
    const githubData = await fetchGitHubData({
      octokits: octokit,
      repository: `${context.repository.owner}/${context.repository.repo}`,
      prNumber: context.entityNumber.toString(),
      isPR: context.isPR,
      triggerUsername: context.actor,
    });

    // Step 8: Setup branch
    const branchInfo = await setupBranch(octokit, githubData, context);

    // Step 9: Update initial comment with branch link (only for issues that created a new branch)
    if (branchInfo.claudeBranch) {
      await updateTrackingComment(
        octokit,
        context,
        commentId,
        branchInfo.claudeBranch,
      );
    }

    // Step 10: Create prompt file
    await createPrompt(
      commentId,
      branchInfo.baseBranch,
      branchInfo.claudeBranch,
      githubData,
      context,
    );

    // Step 11: Get MCP configuration
    const additionalMcpConfig = process.env.MCP_CONFIG || "";
    const mcpConfig = await prepareMcpConfig({
      githubToken,
      owner: context.repository.owner,
      repo: context.repository.repo,
      branch: branchInfo.currentBranch,
      additionalMcpConfig,
      claudeCommentId: commentId.toString(),
      allowedTools: context.inputs.allowedTools,
    });
    core.setOutput("mcp_config", mcpConfig);
    
    // Step 12: Run Claude Code execution
    try {
      // Validate environment variables
      validateEnvironmentVariables();
      
      // Setup Claude Code settings
      await setupClaudeCodeSettings();
      
      // Prepare prompt configuration
      const promptConfig = await preparePrompt({
        prompt: process.env.INPUT_PROMPT || "",
        promptFile: process.env.INPUT_PROMPT_FILE || `${process.env.RUNNER_TEMP}/claude-prompts/claude-prompt.txt`,
      });
      
      // Run Claude with the prepared prompt
      await runClaude(promptConfig.path, {
        allowedTools: process.env.INPUT_ALLOWED_TOOLS,
        disallowedTools: process.env.INPUT_DISALLOWED_TOOLS,
        maxTurns: process.env.INPUT_MAX_TURNS,
        mcpConfig: mcpConfig,
        systemPrompt: process.env.INPUT_SYSTEM_PROMPT,
        appendSystemPrompt: process.env.INPUT_APPEND_SYSTEM_PROMPT,
        claudeEnv: process.env.INPUT_CLAUDE_ENV,
        fallbackModel: process.env.INPUT_FALLBACK_MODEL,
      });
    } catch (claudeError) {
      const claudeErrorMessage = claudeError instanceof Error ? claudeError.message : String(claudeError);
      core.setFailed(`Claude execution failed with error: ${claudeErrorMessage}`);
      core.setOutput("conclusion", "failure");
      process.exit(1);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    core.setFailed(`Prepare step failed with error: ${errorMessage}`);
    // Also output the clean error message for the action to capture
    core.setOutput("prepare_error", errorMessage);
    process.exit(1);
  }
}

if (import.meta.main) {
  run();
}
