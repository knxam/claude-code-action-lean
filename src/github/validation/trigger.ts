#!/usr/bin/env bun

import * as core from "@actions/core";
import { isRepositoryDispatchEvent } from "../context";
import type { ParsedGitHubContext } from "../context";

export function checkContainsTrigger(context: ParsedGitHubContext): boolean {
  const {
    inputs: { directPrompt },
  } = context;

  // If direct prompt is provided, always trigger (for manual/API calls)
  if (directPrompt) {
    console.log(`Direct prompt provided, triggering action`);
    return true;
  }

  // For repository_dispatch events (from webhook), always trigger
  // The webhook has already filtered and decided to send this event
  if (isRepositoryDispatchEvent(context)) {
    console.log(`Repository dispatch event from webhook, triggering action`);
    return true;
  }

  console.log(`No valid trigger found`);
  return false;
}

export async function checkTriggerAction(context: ParsedGitHubContext) {
  const containsTrigger = checkContainsTrigger(context);
  core.setOutput("contains_trigger", containsTrigger.toString());
  return containsTrigger;
}
