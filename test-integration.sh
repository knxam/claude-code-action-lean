#!/bin/bash

# Test script for Claude Copilot Integration
# This script tests the repository dispatch trigger manually

set -e

# Configuration
REPO_OWNER="${REPO_OWNER:-your-org}"
REPO_NAME="${REPO_NAME:-your-repo}"
GITHUB_TOKEN="${GITHUB_TOKEN}"

if [ -z "$GITHUB_TOKEN" ]; then
    echo "❌ Error: GITHUB_TOKEN environment variable is required"
    exit 1
fi

if [ -z "$1" ]; then
    echo "Usage: $0 <issue_number> [pr_number]"
    echo "Example: $0 123 456"
    exit 1
fi

ISSUE_NUMBER="$1"
PR_NUMBER="${2:-$1}"

echo "🧪 Testing Claude integration..."
echo "📋 Repository: $REPO_OWNER/$REPO_NAME"
echo "🎯 Issue: #$ISSUE_NUMBER"
echo "🔀 PR: #$PR_NUMBER"

# Test repository dispatch
echo "🚀 Triggering repository dispatch..."

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  -H "Authorization: token $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  "https://api.github.com/repos/$REPO_OWNER/$REPO_NAME/dispatches" \
  -d "{
    \"event_type\": \"claude-process-pr\",
    \"client_payload\": {
      \"pr_number\": $PR_NUMBER,
      \"issue_number\": $ISSUE_NUMBER,
      \"branch\": \"claude/issue-$ISSUE_NUMBER-test-1\",
      \"issue_title\": \"Test Issue #$ISSUE_NUMBER\",
      \"issue_body\": \"This is a test issue for Claude integration\",
      \"base_branch\": \"main\"
    }
  }")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n -1)

if [ "$HTTP_CODE" -eq 204 ]; then
    echo "✅ Repository dispatch triggered successfully!"
    echo "🔍 Check GitHub Actions tab for workflow execution"
    echo "🌐 https://github.com/$REPO_OWNER/$REPO_NAME/actions"
else
    echo "❌ Failed to trigger repository dispatch"
    echo "📊 HTTP Code: $HTTP_CODE"
    echo "📄 Response: $BODY"
    exit 1
fi

echo ""
echo "🎉 Integration test completed!"
echo ""
echo "Next steps:"
echo "1. Check GitHub Actions workflow: https://github.com/$REPO_OWNER/$REPO_NAME/actions"
echo "2. Verify Claude processes the test issue"
echo "3. Test manual interaction by commenting '@claude hello' on the PR"