/**
 * Diff utilities for file operations.
 */

import { diffLines, Change } from 'diff';
import chalk from 'chalk';

/**
 * Generate a colored diff between two texts.
 */
export function generateDiff(oldText: string, newText: string): string {
  const changes = diffLines(oldText, newText);
  const lines: string[] = [];

  for (const change of changes) {
    const prefix = change.added ? '+' : change.removed ? '-' : ' ';
    const color = change.added ? chalk.green : change.removed ? chalk.red : chalk.gray;

    const changeLines = change.value.split('\n');
    for (let i = 0; i < changeLines.length - 1; i++) {
      lines.push(color(`${prefix} ${changeLines[i]}`));
    }
  }

  return lines.join('\n');
}

/**
 * Get diff summary.
 */
export function getDiffSummary(oldText: string, newText: string): {
  added: number;
  removed: number;
  unchanged: number;
} {
  const changes = diffLines(oldText, newText);

  let added = 0;
  let removed = 0;
  let unchanged = 0;

  for (const change of changes) {
    const lineCount = change.value.split('\n').length - 1;

    if (change.added) {
      added += lineCount;
    } else if (change.removed) {
      removed += lineCount;
    } else {
      unchanged += lineCount;
    }
  }

  return { added, removed, unchanged };
}

/**
 * Format diff summary for display.
 */
export function formatDiffSummary(summary: { added: number; removed: number; unchanged: number }): string {
  const parts: string[] = [];

  if (summary.added > 0) {
    parts.push(chalk.green(`+${summary.added} lines`));
  }
  if (summary.removed > 0) {
    parts.push(chalk.red(`-${summary.removed} lines`));
  }
  if (summary.unchanged > 0) {
    parts.push(chalk.gray(`${summary.unchanged} unchanged`));
  }

  return parts.join(', ');
}
