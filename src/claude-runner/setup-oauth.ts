import { execSync } from "child_process";
import * as path from "path";
import * as fs from "fs/promises";

const OAUTH_TOKEN_URL = 'https://console.anthropic.com/v1/oauth/token';
const CLIENT_ID = '9d1c250a-e61b-44d9-88ed-5944d1962f5e';

interface OAuthCredentials {
  accessToken: string;
  refreshToken: string;
  expiresAt: string | number;
  secretsAdminPat?: string;
}

interface TokenRefreshResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope?: string;
}

function tokenExpired(expiresAt: string | number): boolean {
  // Add 60 minutes buffer to refresh before actual expiry
  const bufferMs = 60 * 60 * 1000;
  
  try {
    let expiresAtMs: number;
    
    if (typeof expiresAt === 'number') {
      // Already a timestamp in milliseconds
      expiresAtMs = expiresAt;
    } else if (typeof expiresAt === 'string') {
      // Try to parse as number first (timestamp)
      const timestamp = parseInt(expiresAt);
      if (!isNaN(timestamp)) {
        expiresAtMs = timestamp;
      } else {
        // Try to parse as ISO date string
        const expiresAtDate = new Date(expiresAt);
        if (!isNaN(expiresAtDate.getTime())) {
          expiresAtMs = expiresAtDate.getTime();
        } else {
          console.warn(`Unable to parse expiresAt date: ${expiresAt}`);
          return true;
        }
      }
    } else {
      console.warn(`Invalid expiresAt type: ${typeof expiresAt}`);
      return true;
    }
    
    const currentTime = Date.now();
    return currentTime >= (expiresAtMs - bufferMs);
  } catch (error) {
    console.warn(`Error parsing expiresAt date: ${error}`);
    return true;
  }
}

async function performRefresh(refreshToken: string): Promise<{ accessToken: string; refreshToken: string; expiresAt: number } | null> {
  try {
    console.log(`Attempting to refresh token using refresh token: ${refreshToken.substring(0, 10)}...`);
    
    const response = await fetch(OAUTH_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: CLIENT_ID,
      }),
    });

    console.log(`Refresh response status: ${response.status}`);

    if (response.ok) {
      const data = await response.json() as TokenRefreshResponse;
      
      // Calculate expiration timestamp in milliseconds
      const expiresAt = Date.now() + (data.expires_in * 1000);
      
      console.log(`Token refreshed successfully. New expiration: ${new Date(expiresAt).toISOString()}`);
      
      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: expiresAt,
      };
    } else {
      const errorBody = await response.text();
      console.error(`Token refresh failed: ${response.status} - ${errorBody}`);
      
      // Parse error response if possible
      try {
        const errorData = JSON.parse(errorBody);
        if (errorData.error === 'invalid_grant') {
          console.error('Refresh token is invalid or expired. You need to login again.');
        }
      } catch {
        // Ignore parsing errors
      }
      
      return null;
    }
  } catch (error) {
    console.error(`Error making refresh request: ${error instanceof Error ? error.message : error}`);
    return null;
  }
}

function updateGitHubSecrets(secretsAdminPat: string, accessToken: string, refreshToken: string, expiresAt: string | number) {
  const env = { ...process.env, GH_TOKEN: secretsAdminPat };
  
  try {
    // Update CLAUDE_ACCESS_TOKEN
    execSync(`gh secret set CLAUDE_ACCESS_TOKEN --body "${accessToken}"`, { env, stdio: 'inherit' });
    console.log('✅ Updated CLAUDE_ACCESS_TOKEN secret');
    
    // Update CLAUDE_REFRESH_TOKEN
    execSync(`gh secret set CLAUDE_REFRESH_TOKEN --body "${refreshToken}"`, { env, stdio: 'inherit' });
    console.log('✅ Updated CLAUDE_REFRESH_TOKEN secret');
    
    // Update CLAUDE_EXPIRES_AT (as string)
    execSync(`gh secret set CLAUDE_EXPIRES_AT --body "${expiresAt}"`, { env, stdio: 'inherit' });
    console.log('✅ Updated CLAUDE_EXPIRES_AT secret');
  } catch (error) {
    console.error('Failed to update GitHub secrets');
    throw error;
  }
}

export async function setupOAuth(): Promise<void> {
  console.log("🔑 Setting up Claude OAuth authentication...");

  const credentials: OAuthCredentials = {
    accessToken: process.env.INPUT_CLAUDE_ACCESS_TOKEN!,
    refreshToken: process.env.INPUT_CLAUDE_REFRESH_TOKEN!,
    expiresAt: process.env.INPUT_CLAUDE_EXPIRES_AT!,
    secretsAdminPat: process.env.INPUT_SECRETS_ADMIN_PAT,
  };

  // Debug log
  console.log(`expiresAt value: ${credentials.expiresAt}`);

  // Prepare OAuth script path
  const scriptPath = path.join(__dirname, "..", "..", "scripts", "prepare-oauth.sh");
  
  if (!await fs.access(scriptPath).then(() => true).catch(() => false)) {
    throw new Error(`OAuth setup script not found at ${scriptPath}`);
  }

  let accessToken = credentials.accessToken;
  let refreshToken = credentials.refreshToken;
  let expiresAt: string | number = credentials.expiresAt;

  // Check if token needs refresh
  if (tokenExpired(expiresAt)) {
    if (!credentials.secretsAdminPat) {
      console.warn(`
⚠️  OAuth token is expiring soon but SECRETS_ADMIN_PAT is not set!
⚠️  
⚠️  The GitHub Action cannot automatically refresh your OAuth tokens without the SECRETS_ADMIN_PAT.
⚠️  Your Claude Code execution may fail if the token expires during the workflow.
⚠️  
⚠️  To enable automatic token refresh:
⚠️  1. Create a Personal Access Token with 'secrets:write' permission
⚠️  2. Add it as a repository secret named SECRETS_ADMIN_PAT
⚠️  3. Pass it to this action using: secrets_admin_pat: \${{ secrets.SECRETS_ADMIN_PAT }}
⚠️  
⚠️  Continuing with potentially expired token...
`);
    } else {
      console.log('🔄 Token expired or expiring soon, refreshing...');
      const newTokens = await performRefresh(refreshToken);
      
      if (newTokens) {
        accessToken = newTokens.accessToken;
        refreshToken = newTokens.refreshToken;
        expiresAt = newTokens.expiresAt;
        
        console.log('✅ Token refreshed successfully!');
        
        // Update GitHub secrets with new tokens
        console.log('📝 Updating GitHub secrets with refreshed tokens...');
        updateGitHubSecrets(credentials.secretsAdminPat, accessToken, refreshToken, expiresAt);
      } else {
        console.error('Failed to refresh token, using existing credentials');
        console.error(`
❌ Token refresh failed. This usually means:
   1. The refresh token has expired (they typically last 30-60 days)
   2. You've logged in elsewhere and the refresh token was revoked
   3. The refresh token in your secrets is incorrect

To fix this:
1. Run 'claude' locally
2. Execute '/login' to get new tokens
3. Update all three secrets in GitHub:
   - CLAUDE_ACCESS_TOKEN
   - CLAUDE_REFRESH_TOKEN  
   - CLAUDE_EXPIRES_AT

The action will continue with the expired token, but may fail.
`);
      }
    }
  } else {
    // Parse expiresAt to get milliseconds
    let expiresAtMs: number;
    if (typeof expiresAt === 'number') {
      expiresAtMs = expiresAt;
    } else {
      expiresAtMs = parseInt(expiresAt);
    }
    
    if (!isNaN(expiresAtMs)) {
      const minutesUntilExpiry = Math.round((expiresAtMs - Date.now()) / 1000 / 60);
      console.log(`✅ Token is still valid (expires in ${minutesUntilExpiry} minutes)`);
    } else {
      console.warn(`Invalid expiresAt format: ${expiresAt}`);
    }
  }

  // Set OAuth environment variables for the script
  process.env.USE_OAUTH = 'true';
  process.env.CLAUDE_ACCESS_TOKEN = accessToken;
  process.env.CLAUDE_REFRESH_TOKEN = refreshToken;
  process.env.CLAUDE_EXPIRES_AT = String(expiresAt);

  try {
    execSync(`bash ${scriptPath}`, { 
      stdio: 'inherit',
      env: process.env
    });
    console.log("✅ OAuth authentication configured");
  } catch (error) {
    throw new Error(`Failed to setup OAuth: ${error}`);
  }
}