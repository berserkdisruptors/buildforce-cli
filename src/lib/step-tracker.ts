import chalk from 'chalk';
import { Step, StepStatus } from '../types.js';
import { MINT_COLOR } from '../constants.js';

/**
 * Track and render hierarchical steps without emojis, similar to Claude Code tree output.
 * Supports live auto-refresh via an attached refresh callback.
 */
export class StepTracker {
  private title: string;
  private steps: Step[] = [];
  private refreshCallback?: () => void;
  private statusOrder: Record<StepStatus, number> = {
    pending: 0,
    running: 1,
    done: 2,
    error: 3,
    skipped: 4,
  };

  constructor(title: string) {
    this.title = title;
  }

  attachRefresh(callback: () => void): void {
    this.refreshCallback = callback;
  }

  add(key: string, label: string): void {
    if (!this.steps.find((s) => s.key === key)) {
      this.steps.push({ key, label, status: 'pending', detail: '' });
      this.maybeRefresh();
    }
  }

  start(key: string, detail: string = ''): void {
    this.update(key, 'running', detail);
  }

  complete(key: string, detail: string = ''): void {
    this.update(key, 'done', detail);
  }

  error(key: string, detail: string = ''): void {
    this.update(key, 'error', detail);
  }

  skip(key: string, detail: string = ''): void {
    this.update(key, 'skipped', detail);
  }

  private update(key: string, status: StepStatus, detail: string): void {
    const step = this.steps.find((s) => s.key === key);
    if (step) {
      step.status = status;
      if (detail) {
        step.detail = detail;
      }
      this.maybeRefresh();
    } else {
      // If not present, add it
      this.steps.push({ key, label: key, status, detail });
      this.maybeRefresh();
    }
  }

  private maybeRefresh(): void {
    if (this.refreshCallback) {
      try {
        this.refreshCallback();
      } catch (e) {
        // Ignore refresh errors
      }
    }
  }

  render(): string {
    const lines: string[] = [];
    lines.push(MINT_COLOR(this.title));

    for (const step of this.steps) {
      const label = step.label;
      const detailText = step.detail.trim();

      // Determine symbol based on status
      let symbol: string;
      if (step.status === 'done') {
        symbol = chalk.green('●');
      } else if (step.status === 'pending') {
        symbol = chalk.green.dim('○');
      } else if (step.status === 'running') {
        symbol = MINT_COLOR('○');
      } else if (step.status === 'error') {
        symbol = chalk.red('●');
      } else if (step.status === 'skipped') {
        symbol = MINT_COLOR('○');
      } else {
        symbol = ' ';
      }

      // Format the line
      let line: string;
      if (step.status === 'pending') {
        // Entire line light gray (pending)
        if (detailText) {
          line = `  ${symbol} ${chalk.gray(`${label} (${detailText})`)}`;
        } else {
          line = `  ${symbol} ${chalk.gray(label)}`;
        }
      } else {
        // Label white, detail (if any) light gray in parentheses
        if (detailText) {
          line = `  ${symbol} ${chalk.white(label)} ${chalk.gray(`(${detailText})`)}`;
        } else {
          line = `  ${symbol} ${chalk.white(label)}`;
        }
      }

      lines.push(line);
    }

    return lines.join('\n');
  }
}
