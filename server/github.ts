// GitHub Integration for NomadLife
// Uses Replit's GitHub connector for secure authentication

import { Octokit } from '@octokit/rest'

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=github',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('GitHub not connected');
  }
  return accessToken;
}

// WARNING: Never cache this client.
// Access tokens expire, so a new client must be created each time.
export async function getUncachableGitHubClient() {
  const accessToken = await getAccessToken();
  return new Octokit({ auth: accessToken });
}

// Get authenticated user info
export async function getGitHubUser() {
  const client = await getUncachableGitHubClient();
  const { data } = await client.users.getAuthenticated();
  return data;
}

// List user repositories
export async function listRepositories() {
  const client = await getUncachableGitHubClient();
  const { data } = await client.repos.listForAuthenticatedUser({
    sort: 'updated',
    per_page: 10
  });
  return data;
}

// Create a new repository
export async function createRepository(name: string, description: string, isPrivate: boolean = true) {
  const client = await getUncachableGitHubClient();
  const { data } = await client.repos.createForAuthenticatedUser({
    name,
    description,
    private: isPrivate,
    auto_init: true
  });
  return data;
}

// Push file to repository
export async function pushFile(owner: string, repo: string, path: string, content: string, message: string) {
  const client = await getUncachableGitHubClient();
  
  // Get the current file (if exists) to get its SHA
  let sha: string | undefined;
  try {
    const { data: existingFile } = await client.repos.getContent({
      owner,
      repo,
      path
    });
    if ('sha' in existingFile) {
      sha = existingFile.sha;
    }
  } catch (e) {
    // File doesn't exist, that's fine
  }

  const { data } = await client.repos.createOrUpdateFileContents({
    owner,
    repo,
    path,
    message,
    content: Buffer.from(content).toString('base64'),
    sha
  });
  
  return data;
}
