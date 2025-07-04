export type CommonFields = {
  repository: string;
  claudeCommentId: string;
  triggerUsername?: string;
  customInstructions?: string;
  allowedTools?: string;
  disallowedTools?: string;
  directPrompt?: string;
};

// Simplified event type - most events now come through repository_dispatch from webhook
type RepositoryDispatchEvent = {
  eventName: "repository_dispatch";
  isPR: boolean;
  prNumber: string;
  claudeBranch?: string;
  baseBranch?: string;
};

// Union type for all possible event types (simplified)
export type EventData = RepositoryDispatchEvent;

// Combined type with separate eventData field
export type PreparedContext = CommonFields & {
  eventData: EventData;
};
