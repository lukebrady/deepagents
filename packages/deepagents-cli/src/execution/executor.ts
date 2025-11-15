/**
 * Task execution for Deep Agents CLI.
 */

import type { Agent } from '@mastra/core';
import chalk from 'chalk';
import ora from 'ora';

/**
 * Execute options.
 */
export interface ExecuteOptions {
  /** Enable streaming */
  streaming?: boolean;
  /** Callback for streaming text */
  onStream?: (text: string) => void;
  /** Callback for tool calls */
  onToolCall?: (toolName: string, args: any) => void;
}

/**
 * Execute a task with an agent.
 */
export async function execute(
  agent: Agent,
  message: string,
  options: ExecuteOptions = {}
): Promise<string> {
  const { streaming = true, onStream, onToolCall } = options;

  if (streaming) {
    return executeStreaming(agent, message, onStream, onToolCall);
  } else {
    return executeNonStreaming(agent, message);
  }
}

/**
 * Execute with streaming.
 */
async function executeStreaming(
  agent: Agent,
  message: string,
  onStream?: (text: string) => void,
  onToolCall?: (toolName: string, args: any) => void
): Promise<string> {
  const stream = await agent.stream({
    messages: [{ role: 'user', content: message }],
  });

  let fullText = '';

  // Write initial agent prefix
  process.stdout.write(chalk.green('Agent: '));

  for await (const chunk of stream.fullStream) {
    if (chunk.type === 'text-delta') {
      process.stdout.write(chunk.textDelta);
      fullText += chunk.textDelta;
      onStream?.(chunk.textDelta);
    } else if (chunk.type === 'tool-call') {
      // Show tool call
      console.log(chalk.gray(`\n[Calling tool: ${chunk.toolName}]`));
      onToolCall?.(chunk.toolName, chunk.args);
    } else if (chunk.type === 'tool-result') {
      console.log(chalk.gray(`[Tool ${chunk.toolName} completed]`));
    }
  }

  console.log(); // New line after streaming
  return fullText;
}

/**
 * Execute without streaming.
 */
async function executeNonStreaming(agent: Agent, message: string): Promise<string> {
  const spinner = ora('Thinking...').start();

  try {
    const result = await agent.generate({
      messages: [{ role: 'user', content: message }],
    });

    spinner.stop();
    return result.text || '';
  } catch (error) {
    spinner.fail('Error executing task');
    throw error;
  }
}
