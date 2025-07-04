import { Octokit } from "@octokit/rest";

export interface AssignPROptions {
  octokit: Octokit;
  owner: string;
  repo: string;
  prNumber: number;
  username: string;
}

export async function assignPRToUser({
  octokit,
  owner,
  repo,
  prNumber,
  username,
}: AssignPROptions): Promise<void> {
  if (!username) {
    console.log('⚠️ No username provided for PR assignment');
    return;
  }

  // First, assign the PR to the person
  try {
    await octokit.issues.addAssignees({
      owner,
      repo,
      issue_number: prNumber,
      assignees: [username],
    });
    console.log(`✅ Assigned PR #${prNumber} to ${username}`);
  } catch (assigneeError: any) {
    if (assigneeError.status === 422) {
      console.log(`⚠️ Could not assign ${username} to PR - they may not have access to the repository`);
    } else {
      console.error('Failed to add assignee:', assigneeError);
    }
  }
}
