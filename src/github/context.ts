import * as github from "@actions/github";
import type {
  IssuesEvent,
  IssuesAssignedEvent,
  IssueCommentEvent,
  PullRequestEvent,
  PullRequestReviewEvent,
  PullRequestReviewCommentEvent,
  RepositoryDispatchEvent,
} from "@octokit/webhooks-types";
import { CONFIG } from "../constants";

export type ParsedGitHubContext = {
  runId: string;
  eventName: string;
  eventAction?: string;
  repository: {
    owner: string;
    repo: string;
    full_name: string;
  };
  actor: string;
  payload:
    | IssuesEvent
    | IssueCommentEvent
    | PullRequestEvent
    | PullRequestReviewEvent
    | PullRequestReviewCommentEvent
    | RepositoryDispatchEvent;
  entityNumber: number;
  isPR: boolean;
  inputs: {
    allowedTools: string[];
    disallowedTools: string[];
    customInstructions: string;
    directPrompt: string;
    baseBranch?: string;
    branchPrefix: string;
  };
};

export function parseGitHubContext(): ParsedGitHubContext {
  const context = github.context;

  const commonFields = {
    runId: process.env.GITHUB_RUN_ID!,
    eventName: context.eventName,
    eventAction: context.payload.action,
    repository: {
      owner: context.repo.owner,
      repo: context.repo.repo,
      full_name: `${context.repo.owner}/${context.repo.repo}`,
    },
    actor: context.actor,
    inputs: {
      allowedTools: parseMultilineInput(process.env.INPUT_ALLOWED_TOOLS ?? process.env.ALLOWED_TOOLS ?? ""),
      disallowedTools: parseMultilineInput(process.env.INPUT_DISALLOWED_TOOLS ?? process.env.DISALLOWED_TOOLS ?? ""),
      customInstructions: process.env.CUSTOM_INSTRUCTIONS ?? "",
      directPrompt: process.env.DIRECT_PROMPT ?? "",
      baseBranch: process.env.BASE_BRANCH,
      branchPrefix: process.env.BRANCH_PREFIX ?? CONFIG.DEFAULT_BRANCH_PREFIX,
    },
  };

  switch (context.eventName) {
    case "issues": {
      return {
        ...commonFields,
        payload: context.payload as IssuesEvent,
        entityNumber: (context.payload as IssuesEvent).issue.number,
        isPR: false,
      };
    }
    case "issue_comment": {
      return {
        ...commonFields,
        payload: context.payload as IssueCommentEvent,
        entityNumber: (context.payload as IssueCommentEvent).issue.number,
        isPR: Boolean(
          (context.payload as IssueCommentEvent).issue.pull_request,
        ),
      };
    }
    case "pull_request": {
      return {
        ...commonFields,
        payload: context.payload as PullRequestEvent,
        entityNumber: (context.payload as PullRequestEvent).pull_request.number,
        isPR: true,
      };
    }
    case "pull_request_review": {
      return {
        ...commonFields,
        payload: context.payload as PullRequestReviewEvent,
        entityNumber: (context.payload as PullRequestReviewEvent).pull_request
          .number,
        isPR: true,
      };
    }
    case "pull_request_review_comment": {
      return {
        ...commonFields,
        payload: context.payload as PullRequestReviewCommentEvent,
        entityNumber: (context.payload as PullRequestReviewCommentEvent)
          .pull_request.number,
        isPR: true,
      };
    }
    case "repository_dispatch": {
      const clientPayload = (context.payload as RepositoryDispatchEvent).client_payload as {
        pr_number?: number;
        issue_number?: number;
        is_pr?: boolean;
      };
      
      console.log('Repository dispatch client_payload:', JSON.stringify(clientPayload));
      
      const entityNumber = clientPayload.pr_number || clientPayload.issue_number;
      if (!entityNumber) {
        console.error('No pr_number or issue_number in client_payload');
      }
      
      return {
        ...commonFields,
        payload: context.payload as RepositoryDispatchEvent,
        entityNumber: entityNumber || 0,
        isPR: clientPayload.is_pr !== false, // default to true for backward compatibility
      };
    }
    default:
      throw new Error(`Unsupported event type: ${context.eventName}`);
  }
}

export function parseMultilineInput(s: string): string[] {
  return s
    .split(/,|[\n\r]+/)
    .map((tool) => tool.replace(/#.+$/, ""))
    .map((tool) => tool.trim())
    .filter((tool) => tool.length > 0);
}

export function isIssuesEvent(
  context: ParsedGitHubContext,
): context is ParsedGitHubContext & { payload: IssuesEvent } {
  return context.eventName === "issues";
}

export function isIssueCommentEvent(
  context: ParsedGitHubContext,
): context is ParsedGitHubContext & { payload: IssueCommentEvent } {
  return context.eventName === "issue_comment";
}

export function isPullRequestEvent(
  context: ParsedGitHubContext,
): context is ParsedGitHubContext & { payload: PullRequestEvent } {
  return context.eventName === "pull_request";
}

export function isPullRequestReviewEvent(
  context: ParsedGitHubContext,
): context is ParsedGitHubContext & { payload: PullRequestReviewEvent } {
  return context.eventName === "pull_request_review";
}

export function isPullRequestReviewCommentEvent(
  context: ParsedGitHubContext,
): context is ParsedGitHubContext & { payload: PullRequestReviewCommentEvent } {
  return context.eventName === "pull_request_review_comment";
}

export function isRepositoryDispatchEvent(
  context: ParsedGitHubContext,
): context is ParsedGitHubContext & { payload: RepositoryDispatchEvent } {
  return context.eventName === "repository_dispatch";
}

export function isIssuesAssignedEvent(
  context: ParsedGitHubContext,
): context is ParsedGitHubContext & { payload: IssuesAssignedEvent } {
  return isIssuesEvent(context) && context.eventAction === "assigned";
}
