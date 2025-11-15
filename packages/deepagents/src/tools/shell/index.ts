/**
 * Shell Tool for Deep Agents
 *
 * Provides bash command execution capabilities to agents.
 * This tool allows agents to run shell commands and receive output.
 */

import { createTool } from '@mastra/core';
import { z } from 'zod';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface ShellToolConfig {
  /**
   * Working directory for command execution
   * Default: process.cwd()
   */
  cwd?: string;

  /**
   * Timeout for command execution in milliseconds
   * Default: 30000 (30 seconds)
   */
  timeout?: number;

  /**
   * Maximum output size in bytes
   * Default: 1048576 (1 MB)
   */
  maxBuffer?: number;

  /**
   * Environment variables to pass to the command
   * Default: process.env
   */
  env?: NodeJS.ProcessEnv;
}

/**
 * Create a shell tool that executes bash commands.
 *
 * **Security Warning**: This tool executes arbitrary commands.
 * - Use HITL (Human-in-the-Loop) approval for production
 * - Consider restricting available commands
 * - Validate inputs carefully
 *
 * @param config - Shell tool configuration
 * @returns Mastra tool for shell execution
 *
 * @example
 * ```typescript
 * const shellTool = createShellTool({
 *   cwd: '/path/to/project',
 *   timeout: 30000,
 * });
 * ```
 */
export function createShellTool(config: ShellToolConfig = {}) {
  const cwd = config.cwd || process.cwd();
  const timeout = config.timeout || 30000;
  const maxBuffer = config.maxBuffer || 1024 * 1024; // 1 MB
  const env = config.env || process.env;

  return createTool({
    id: 'shell',
    description: `Execute shell commands and receive output.

**Purpose**: Run bash commands to perform system operations, file management, and other CLI tasks.

**When to use**:
- Running build/test commands (npm, make, etc.)
- System operations (git, docker, etc.)
- File operations not covered by file tools
- Installing dependencies
- Checking system status

**Security**: Commands are executed with current user permissions. Be cautious with destructive operations.

**Best practices**:
- Use simple, focused commands
- Avoid long-running commands (timeout: ${timeout}ms)
- Check command output for errors
- Use file tools for file operations when possible`,

    inputSchema: z.object({
      command: z
        .string()
        .describe('The shell command to execute (e.g., "ls -la", "git status")'),
    }),

    outputSchema: z.object({
      stdout: z.string().describe('Standard output from the command'),
      stderr: z.string().describe('Standard error output from the command'),
      exitCode: z.number().describe('Exit code of the command (0 = success)'),
      success: z.boolean().describe('Whether the command executed successfully'),
      error: z.string().optional().describe('Error message if execution failed'),
    }),

    execute: async ({ context }) => {
      const { command } = context;

      try {
        const { stdout, stderr } = await execAsync(command, {
          cwd,
          timeout,
          maxBuffer,
          env,
          shell: '/bin/bash',
        });

        return {
          stdout: stdout || '',
          stderr: stderr || '',
          exitCode: 0,
          success: true,
        };
      } catch (error: any) {
        // exec throws an error if the command exits with non-zero code
        // or if it times out/exceeds buffer
        const stdout = error.stdout || '';
        const stderr = error.stderr || '';
        const exitCode = error.code !== undefined ? error.code : -1;

        if (error.killed) {
          return {
            stdout,
            stderr,
            exitCode,
            success: false,
            error: `Command timed out after ${timeout}ms`,
          };
        }

        if (error.signal) {
          return {
            stdout,
            stderr,
            exitCode,
            success: false,
            error: `Command killed with signal: ${error.signal}`,
          };
        }

        return {
          stdout,
          stderr,
          exitCode,
          success: exitCode === 0,
          error: exitCode !== 0 ? `Command failed with exit code ${exitCode}` : undefined,
        };
      }
    },
  });
}

/**
 * Create a restricted shell tool that only allows specific commands.
 *
 * This is a safer alternative to the full shell tool, limiting execution
 * to a whitelist of allowed commands.
 *
 * @param allowedCommands - List of command prefixes that are allowed
 * @param config - Shell tool configuration
 * @returns Mastra tool for restricted shell execution
 *
 * @example
 * ```typescript
 * const restrictedShell = createRestrictedShellTool(
 *   ['git', 'npm', 'ls', 'cat'],
 *   { cwd: '/project' }
 * );
 * ```
 */
export function createRestrictedShellTool(
  allowedCommands: string[],
  config: ShellToolConfig = {}
) {
  const baseTool = createShellTool(config);

  // Wrap the execute function to check allowed commands
  const originalExecute = baseTool.execute!;

  return createTool({
    ...baseTool,
    description: baseTool.description + `\n\n**Allowed commands**: ${allowedCommands.join(', ')}`,

    execute: async (params) => {
      const command = params.context.command as string;
      const commandStart = command.trim().split(' ')[0];

      // Check if command is in allowed list
      const isAllowed = allowedCommands.some(
        (allowed) => commandStart === allowed || commandStart.startsWith(allowed + ' ')
      );

      if (!isAllowed) {
        return {
          stdout: '',
          stderr: '',
          exitCode: -1,
          success: false,
          error: `Command not allowed. Allowed commands: ${allowedCommands.join(', ')}`,
        };
      }

      return await originalExecute(params);
    },
  });
}
