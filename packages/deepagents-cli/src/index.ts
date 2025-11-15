/**
 * Deep Agents CLI entry point.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { CLI } from './cli/main.js';
import { loadConfig } from './config/loader.js';

const program = new Command();

program
  .name('deepagents')
  .description('Interactive AI agent powered by Mastra')
  .version('0.1.0')
  .option('-a, --agent <name>', 'Agent name to use')
  .option('-m, --model <model>', 'Model to use (e.g., sonnet, gpt-4, grok)')
  .option('-v, --verbose', 'Verbose output')
  .option('--no-streaming', 'Disable streaming responses')
  .option('-c, --config <path>', 'Config file path')
  .action(async (options) => {
    try {
      // Load config
      const config = loadConfig();

      // Override with CLI options
      if (options.model) {
        config.model = options.model;
      }
      if (options.verbose) {
        config.verbose = true;
      }
      if (options.streaming === false) {
        config.streaming = false;
      }

      // Start CLI
      const cli = new CLI();
      await cli.start();
    } catch (error) {
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Parse arguments
program.parse();
