/**
 * Main CLI loop for Deep Agents.
 */

import chalk from 'chalk';
import { AgentManager } from '../agent/manager.js';
import { loadConfig } from '../config/loader.js';
import { prompt } from '../input/prompt.js';
import { execute } from '../execution/executor.js';
import {
  renderUserMessage,
  renderAssistantMessage,
  renderSystemMessage,
  renderError,
  renderHeader,
  renderCommandHelp,
  renderInfo,
} from '../ui/renderer.js';
import type { Session } from '../types/session.js';

/**
 * CLI context.
 */
export class CLI {
  private agentManager: AgentManager;
  private session: Session;
  private running = false;

  constructor() {
    const config = loadConfig();
    this.agentManager = new AgentManager(config);

    // Initialize session
    this.session = {
      agent: null,
      backend: null,
      messages: [],
      agentName: config.defaultAgent,
      tokensUsed: 0,
      startTime: new Date(),
    };
  }

  /**
   * Start the CLI loop.
   */
  async start(): Promise<void> {
    this.running = true;

    // Print welcome message
    this.printWelcome();

    // Get initial agent
    this.session.agent = await this.agentManager.getCurrentAgent();
    this.session.backend = this.agentManager.getAgentBackend();

    // Main loop
    while (this.running) {
      try {
        // Get user input
        const input = await prompt();

        // Skip empty input
        if (!input.trim()) {
          continue;
        }

        // Check for slash commands
        if (input.startsWith('/')) {
          await this.handleCommand(input);
          continue;
        }

        // Execute with agent
        console.log(); // Blank line
        await execute(this.session.agent!, input, {
          streaming: true,
          onToolCall: (toolName, args) => {
            // Could show tool approval UI here
          },
        });
        console.log(); // Blank line

        // Store message
        this.session.messages.push({
          role: 'user',
          content: input,
          timestamp: new Date(),
        });
      } catch (error) {
        console.error(renderError(error instanceof Error ? error.message : String(error)));
      }
    }
  }

  /**
   * Stop the CLI.
   */
  stop(): void {
    this.running = false;
  }

  /**
   * Print welcome message.
   */
  private printWelcome(): void {
    console.log(renderHeader('Deep Agents CLI'));
    console.log(renderInfo('Interactive AI agent powered by Mastra'));
    console.log(renderInfo(`Agent: ${chalk.bold(this.session.agentName)}`));
    console.log(renderSystemMessage('Type your message or use /help for commands'));
    console.log();
  }

  /**
   * Handle slash commands.
   */
  private async handleCommand(input: string): Promise<void> {
    const [command, ...args] = input.slice(1).split(' ');

    switch (command.toLowerCase()) {
      case 'help':
        this.showHelp();
        break;

      case 'clear':
        console.clear();
        this.printWelcome();
        break;

      case 'reset':
        await this.agentManager.resetAgent();
        this.session.agent = await this.agentManager.getCurrentAgent();
        this.session.messages = [];
        console.log(renderSystemMessage('Agent reset'));
        break;

      case 'list':
        this.listAgents();
        break;

      case 'switch':
        if (args.length === 0) {
          console.log(renderError('Usage: /switch <agent-name>'));
        } else {
          const agentName = args[0];
          this.session.agent = await this.agentManager.switchAgent(agentName);
          this.session.agentName = agentName;
          console.log(renderSystemMessage(`Switched to agent: ${agentName}`));
        }
        break;

      case 'quit':
      case 'exit':
        console.log(renderSystemMessage('Goodbye!'));
        this.stop();
        process.exit(0);
        break;

      default:
        console.log(renderError(`Unknown command: /${command}`));
        console.log(renderInfo('Use /help to see available commands'));
        break;
    }
  }

  /**
   * Show help message.
   */
  private showHelp(): void {
    console.log(renderHeader('Available Commands'));
    console.log(renderCommandHelp('/help', 'Show this help message'));
    console.log(renderCommandHelp('/clear', 'Clear the screen'));
    console.log(renderCommandHelp('/reset', 'Reset the current agent'));
    console.log(renderCommandHelp('/list', 'List all agents'));
    console.log(renderCommandHelp('/switch <name>', 'Switch to a different agent'));
    console.log(renderCommandHelp('/quit, /exit', 'Exit the CLI'));
    console.log();
  }

  /**
   * List all agents.
   */
  private listAgents(): void {
    const agents = this.agentManager.listAgents();
    const current = this.agentManager.getCurrentAgentName();

    console.log(renderHeader('Available Agents'));

    if (agents.length === 0) {
      console.log(renderInfo('No agents created yet'));
    } else {
      agents.forEach((name) => {
        const marker = name === current ? chalk.green('→ ') : '  ';
        console.log(`${marker}${chalk.cyan(name)}`);
      });
    }
    console.log();
  }
}
