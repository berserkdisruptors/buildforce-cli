import inquirer from 'inquirer';
import chalk from 'chalk';

/**
 * Interactive selection using arrow keys
 * Uses inquirer for better cross-platform compatibility
 */
export async function selectWithArrows(
  options: Record<string, string>,
  promptText: string = 'Select an option',
  defaultKey?: string
): Promise<string> {
  const choices = Object.entries(options).map(([key, description]) => ({
    name: `${chalk.cyan(key)} ${chalk.dim(`(${description})`)}`,
    value: key,
    short: key,
  }));

  const answer = await inquirer.prompt([
    {
      type: 'list',
      name: 'selection',
      message: promptText,
      choices,
      default: defaultKey,
    },
  ]);

  return answer.selection;
}

/**
 * Show banner with ASCII art
 */
export function showBanner(banner: string, tagline: string): void {
  const bannerLines = banner.trim().split('\n');
  const colors = ['blueBright', 'blue', 'cyan', 'cyanBright', 'white', 'whiteBright'] as const;

  console.log();
  for (let i = 0; i < bannerLines.length; i++) {
    const color = colors[i % colors.length];
    console.log(chalk[color](bannerLines[i]));
  }
  console.log(chalk.yellow.italic(tagline));
  console.log();
}
