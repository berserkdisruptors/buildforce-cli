/**
 * Validation utilities for CLI options
 * This module provides reusable validation functions for command-line arguments
 */

/**
 * Validate that a value is one of the allowed choices
 */
export function validateChoice<T extends string>(
  value: T | undefined,
  choices: Record<string, string>,
  optionName: string
): value is T {
  if (!value) return false;
  if (!choices[value]) {
    throw new Error(
      `Invalid ${optionName} '${value}'. Choose from: ${Object.keys(choices).join(", ")}`
    );
  }
  return true;
}

/**
 * Validate GitHub token format
 */
export function validateGithubToken(token?: string): boolean {
  if (!token) return false;
  // Basic validation: GitHub tokens should be non-empty strings
  return token.trim().length > 0;
}

/**
 * Validate project name (no special characters, not empty)
 */
export function validateProjectName(name: string): boolean {
  if (!name || name.trim().length === 0) {
    return false;
  }
  // Allow alphanumeric, hyphens, underscores, and dots
  const validPattern = /^[a-zA-Z0-9._-]+$/;
  return validPattern.test(name);
}
