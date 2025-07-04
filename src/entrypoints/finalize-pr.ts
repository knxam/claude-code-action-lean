#!/usr/bin/env bun

import { createOctokit } from "../github/api/client";
import { parseGitHubContext } from "../github/context";
import { updatePRStatus } from "../github/operations/pull-request/update-pr-status";
import { assignPRToUser } from "../github/operations/pull-request/assign-pr";
import { requestPRReview } from "../github/operations/pull-request/request-review";

async function run() {
  try {
    const githubToken = process.env.GITHUB_TOKEN!;
    const context = parseGitHubContext();
    const { owner, repo } = context.repository;
    const octokit = createOctokit(githubToken);

    const isSuccess = process.env.CLAUDE_SUCCESS === 'true';
    const labelAssignedBy = process.env.LABEL_ASSIGNED_BY;
    
    // Get PR number from environment variable (set by action.yml)
    const prNumberStr = process.env.PR_NUMBER;
    if (!prNumberStr) {
      console.log('No PR_NUMBER provided, skipping PR finalization');
      return;
    }
    
    const prNumber = parseInt(prNumberStr);

    // Only process PRs
    if (!context.isPR) {
      console.log('Not a PR, skipping PR finalization');
      return;
    }

    console.log(`Finalizing PR #${prNumber} after Claude execution`);

    // Update PR status (remove [WIP] or mark as [FAILED])
    await updatePRStatus({
      octokit: octokit.rest,
      owner,
      repo,
      prNumber,
      isSuccess,
    });

    // If successful, assign PR and request review
    if (isSuccess && labelAssignedBy) {
      await assignPRToUser({
        octokit: octokit.rest,
        owner,
        repo,
        prNumber,
        username: labelAssignedBy,
      });

      await requestPRReview({
        octokit: octokit.rest,
        owner,
        repo,
        prNumber,
        reviewer: labelAssignedBy,
      });
    }

    console.log('✅ PR finalization completed');
    process.exit(0);
  } catch (error) {
    console.error('Error finalizing PR:', error);
    process.exit(1);
  }
}

if (import.meta.main) {
  run();
}
