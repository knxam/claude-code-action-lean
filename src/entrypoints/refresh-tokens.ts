#!/usr/bin/env bun

/**
 * Dedicated entrypoint for refreshing Claude OAuth tokens
 * This runs independently of the main Claude workflow to ensure tokens are always fresh
 */

import * as core from "@actions/core";
import { validateEnvironmentVariables } from "../claude-runner/validate-env";
import { setupOAuth } from "../claude-runner/setup-oauth";

async function run() {
  try {
    console.log("🔄 Starting Claude token refresh process...");
    
    // Step 1: Validate required environment variables for OAuth
    validateEnvironmentVariables();
    
    // Step 2: Setup OAuth (this will automatically refresh tokens if needed)
    await setupOAuth();
    
    console.log("✅ Token refresh process completed successfully");
    core.setOutput("conclusion", "success");
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`❌ Token refresh failed: ${errorMessage}`);
    core.setFailed(`Token refresh failed: ${errorMessage}`);
    core.setOutput("conclusion", "failure");
    process.exit(1);
  }
}

if (import.meta.main) {
  run();
}