import { Octokit } from "@octokit/rest";

export interface UpdatePRStatusOptions {
  octokit: Octokit;
  owner: string;
  repo: string;
  prNumber: number;
  isSuccess: boolean;
}

export async function updatePRStatus({
  octokit,
  owner,
  repo,
  prNumber,
  isSuccess,
}: UpdatePRStatusOptions): Promise<void> {
  try {
    // Get current PR details
    const { data: pr } = await octokit.pulls.get({
      owner,
      repo,
      pull_number: prNumber,
    });

    // Check if title starts with [WIP]
    if (pr.title.startsWith('[WIP] ')) {
      let newTitle = pr.title;
      let newBody = pr.body || '';

      if (isSuccess) {
        // Remove [WIP] prefix on success
        newTitle = pr.title.substring(6);
        newBody = newBody.replace('**Status:** 🚧 Work in Progress', '**Status:** ✅ Complete');
      } else {
        // Change to [FAILED] on failure
        newTitle = '[FAILED] ' + pr.title.substring(6);
        newBody = newBody.replace('**Status:** 🚧 Work in Progress', '**Status:** ❌ Failed');
      }

      await octokit.pulls.update({
        owner,
        repo,
        pull_number: prNumber,
        title: newTitle,
        body: newBody,
      });

      console.log(`✅ Updated PR #${prNumber} title: ${newTitle}`);
    }
  } catch (error) {
    console.error('Failed to update PR title:', error);
    // Don't fail the entire operation if PR title update fails
  }
}
