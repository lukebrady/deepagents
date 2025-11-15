/**
 * UI renderer for Deep Agents CLI.
 */

import chalk from 'chalk';
import { marked } from 'marked';
import { markedTerminal } from 'marked-terminal';

// Configure marked for terminal output
marked.use(markedTerminal() as any);

/**
 * Render user message.
 */
export function renderUserMessage(content: string): string {
  return chalk.cyan(`You: `) + content;
}

/**
 * Render assistant message with markdown.
 */
export function renderAssistantMessage(content: string): string {
  const rendered = marked(content);
  return chalk.green(`Agent: `) + '\n' + rendered;
}

/**
 * Render system message.
 */
export function renderSystemMessage(content: string): string {
  return chalk.gray(`[System] ${content}`);
}

/**
 * Render error message.
 */
export function renderError(message: string): string {
  return chalk.red(`Error: ${message}`);
}

/**
 * Render success message.
 */
export function renderSuccess(message: string): string {
  return chalk.green(`✓ ${message}`);
}

/**
 * Render warning message.
 */
export function renderWarning(message: string): string {
  return chalk.yellow(`⚠ ${message}`);
}

/**
 * Render info message.
 */
export function renderInfo(message: string): string {
  return chalk.blue(`ℹ ${message}`);
}

/**
 * Render command help.
 */
export function renderCommandHelp(command: string, description: string): string {
  return `  ${chalk.cyan(command.padEnd(20))} ${chalk.gray(description)}`;
}

/**
 * Render section header.
 */
export function renderHeader(text: string): string {
  return '\n' + chalk.bold.underline(text) + '\n';
}

/**
 * Render token usage.
 */
export function renderTokens(tokens: number): string {
  const color = tokens > 100000 ? chalk.red : tokens > 50000 ? chalk.yellow : chalk.green;
  return color(`[${tokens.toLocaleString()} tokens]`);
}

/**
 * Render loading spinner message.
 */
export function renderLoading(message: string): string {
  return chalk.gray(`⏳ ${message}...`);
}

/**
 * Render file operation.
 */
export function renderFileOp(op: string, path: string): string {
  const icons = {
    read: '📖',
    write: '✍️ ',
    edit: '✏️ ',
    delete: '🗑️ ',
  };

  const icon = icons[op as keyof typeof icons] || '📄';
  return chalk.gray(`${icon} ${op.toUpperCase()} ${path}`);
}
