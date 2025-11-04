import { select } from '@inquirer/prompts';
import chalk from 'chalk';
import figlet from 'figlet';
import { TAGLINE, MINT_COLOR, INQUIRER_THEME } from '../constants.js';

/**
 * Interactive selection using arrow keys
 * Uses @inquirer/prompts for better theming support
 */
export async function selectWithArrows(
  options: Record<string, string>,
  promptText: string = 'Select an option',
  defaultKey?: string
): Promise<string> {
  // Green color for option keys to match CLI help output (cli.ts line 162)
  const choices = Object.entries(options).map(([key, description]) => ({
    name: `${MINT_COLOR(key)} ${chalk.dim(`(${description})`)}`,
    value: key,
  }));

  const answer = await select({
    message: promptText,
    choices,
    default: defaultKey,
    theme: INQUIRER_THEME,
  });

  return answer;
}

/**
 * Generate 2-line banner string with figlet title and tagline
 * Returns the banner as a string for use in both console output and help text
 */
export function generateBanner(): string {
  const terminalWidth = process.stdout.columns || 80;
  
  // Generate figlet title with fallback for font availability
  // Try "ANSI Shadow" first, fallback to "Standard" if unavailable
  let rendered: string;
  try {
    rendered = figlet.textSync("BUILDFORCE", {
      font: "ANSI Shadow",
      horizontalLayout: "default",
      verticalLayout: "default",
    });
  } catch (error) {
    // Fallback to "Standard" font if "ANSI Shadow" is not available
    // "Standard" is the default font and always available in figlet
    rendered = figlet.textSync("BUILDFORCE", {
      font: "Standard",
      horizontalLayout: "default",
      verticalLayout: "default",
    });
  }
  const lines = rendered.split("\n");
  const centered = lines
    .map((line) => {
      const pad = Math.max(0, Math.floor((terminalWidth - line.length) / 2));
      return " ".repeat(pad) + chalk.white(line);
    })
    .join("\n");
  
  // Center tagline
  const taglinePad = Math.max(0, Math.floor((terminalWidth - TAGLINE.length) / 2));
  const centeredTagline = " ".repeat(taglinePad) + MINT_COLOR(TAGLINE);
  
  return `\n${centered}\n${centeredTagline}\n\n`;
}

/**
 * Show banner with 2-line format (figlet title, tagline)
 * Uses white color for title and green for tagline
 * Maintains backward compatibility with existing function signature (banner parameter is ignored)
 */
export function showBanner(banner: string, tagline: string): void {
  // Generate banner using figlet (ignore banner parameter for backward compatibility)
  const bannerString = generateBanner();
  // Remove trailing newline for console.log (it will add one)
  process.stdout.write(bannerString);
}
