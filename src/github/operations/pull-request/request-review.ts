import { Octokit } from "@octokit/rest";

export interface RequestPRReviewOptions {
  octokit: Octokit;
  owner: string;
  repo: string;
  prNumber: number;
  reviewer: string;
}

export async function requestPRReview({
  octokit,
  owner,
  repo,
  prNumber,
  reviewer,
}: RequestPRReviewOptions): Promise<void> {
  if (!reviewer) {
    console.log('⚠️ No reviewer provided for PR review request');
    return;
  }

  try {
    await octokit.pulls.requestReviewers({
      owner,
      repo,
      pull_number: prNumber,
      reviewers: [reviewer],
    });
    console.log(`✅ Requested review from ${reviewer} for PR #${prNumber}`);
  } catch (reviewerError: any) {
    if (reviewerError.status === 422) {
      console.log(`⚠️ Could not request review from ${reviewer} - they may be the PR author or not have access`);
    } else {
      console.error('Failed to request review:', reviewerError);
    }
  }
}
