/**
 * Get GitHub token from CLI argument or environment variables
 */
export function getGithubToken(cliToken?: string): string | undefined {
  const token =
    cliToken || process.env.GH_TOKEN || process.env.GITHUB_TOKEN || "";
  return token.trim() || undefined;
}

/**
 * Get GitHub authorization headers if token exists
 */
export function getGithubAuthHeaders(
  cliToken?: string
): Record<string, string> {
  const token = getGithubToken(cliToken);
  return {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}
