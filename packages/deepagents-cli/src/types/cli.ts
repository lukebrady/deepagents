/**
 * CLI-specific types.
 */

/**
 * CLI command options.
 */
export interface CLIOptions {
  /** Agent name to use */
  agent?: string;

  /** Model to use */
  model?: string;

  /** Verbose output */
  verbose?: boolean;

  /** Disable streaming */
  noStreaming?: boolean;

  /** Config file path */
  config?: string;
}

/**
 * Slash command handler.
 */
export type SlashCommandHandler = (args: string[]) => Promise<void> | void;

/**
 * Available slash commands.
 */
export interface SlashCommand {
  name: string;
  description: string;
  handler: SlashCommandHandler;
  aliases?: string[];
}
