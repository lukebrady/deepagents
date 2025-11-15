/**
 * Input prompt handling for Deep Agents CLI.
 */

import { createInterface } from 'readline';
import chalk from 'chalk';

/**
 * Prompt options.
 */
export interface PromptOptions {
  /** Prompt message */
  message?: string;
  /** Enable multiline mode */
  multiline?: boolean;
}

/**
 * Create a readline interface.
 */
function createReadline() {
  return createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
  });
}

/**
 * Prompt for user input.
 */
export async function prompt(options: PromptOptions = {}): Promise<string> {
  const { message = chalk.cyan('You: '), multiline = false } = options;

  return new Promise((resolve) => {
    const rl = createReadline();

    if (multiline) {
      const lines: string[] = [];
      console.log(message + chalk.gray('(Enter blank line to finish)'));

      rl.on('line', (line) => {
        if (line.trim() === '') {
          rl.close();
          resolve(lines.join('\n'));
        } else {
          lines.push(line);
        }
      });
    } else {
      rl.question(message, (answer) => {
        rl.close();
        resolve(answer);
      });
    }
  });
}

/**
 * Prompt for confirmation (yes/no).
 */
export async function confirm(message: string, defaultValue = false): Promise<boolean> {
  const rl = createReadline();
  const suffix = defaultValue ? ' [Y/n] ' : ' [y/N] ';

  return new Promise((resolve) => {
    rl.question(chalk.yellow(message + suffix), (answer) => {
      rl.close();
      const normalized = answer.trim().toLowerCase();

      if (normalized === '') {
        resolve(defaultValue);
      } else {
        resolve(normalized === 'y' || normalized === 'yes');
      }
    });
  });
}
