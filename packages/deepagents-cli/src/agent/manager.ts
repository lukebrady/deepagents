/**
 * Agent manager for Deep Agents CLI.
 */

import {
  createDeepAgent,
  StateBackend,
  StoreBackend,
  CompositeBackend,
  getAgentBackend,
  createShellTool,
} from '@deepagents/core';
import type { Agent } from '@mastra/core';
import type { Config } from '../types/config.js';
import {
  createBraveSearchTool,
  createHttpRequestTool,
  createFetchUrlTool,
} from '../tools/index.js';
import { enhancePromptWithMemory } from './memory.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Load the default agent prompt from file.
 */
function loadDefaultPrompt(): string {
  try {
    const promptPath = path.join(__dirname, '..', 'prompts', 'default-agent-prompt.md');
    let prompt = fs.readFileSync(promptPath, 'utf-8');

    // Replace {cwd} placeholder with actual working directory
    prompt = prompt.replace(/{cwd}/g, process.cwd());

    return prompt;
  } catch (error) {
    // Fallback if file doesn't exist
    console.warn('Could not load default prompt file, using fallback');
    return `You are a helpful AI assistant with access to file system operations and task management tools.

You can:
- Read, write, and edit files
- Search file contents and find files by pattern
- List directories
- Manage tasks with a todo list
- Delegate complex work to subagents
- Execute shell commands
- Search the web

When working with files:
- Always read files before editing them
- Use exact string matching for edits (including whitespace)
- Create parent directories automatically when writing files

When managing tasks:
- Use the todo list for complex multi-step tasks (3+ steps)
- Mark tasks as in_progress before starting, completed when done
- Keep the todo list minimal (3-6 items)

Be efficient, accurate, and helpful in completing user requests.`;
  }
}

/**
 * Agent registry for managing multiple agents.
 */
export class AgentManager {
  private agents: Map<string, Agent> = new Map();
  private currentAgentName: string;
  private config: Config;

  constructor(config: Config) {
    this.config = config;
    this.currentAgentName = config.defaultAgent;
  }

  /**
   * Create a new agent.
   */
  async createAgent(
    name: string,
    options: { model?: string; systemPrompt?: string } = {}
  ): Promise<Agent> {
    // Create custom CLI tools
    const webSearchTool = createBraveSearchTool({
      apiKey: this.config.apiKeys.braveSearch,
    });
    const httpRequestTool = createHttpRequestTool();
    const fetchUrlTool = createFetchUrlTool();
    const shellTool = createShellTool({
      cwd: process.cwd(),
      timeout: 30000,
    });

    // Create composite backend with persistent memory storage
    // /memories/ → StoreBackend (persistent across sessions)
    // / → StateBackend (ephemeral, conversation-scoped)
    const storeBackend = new StoreBackend({
      namespace: name, // Each agent gets its own namespace
    });

    const stateBackend = new StateBackend();

    const compositeBackend = new CompositeBackend({
      default: stateBackend,
      routes: {
        '/memories/': storeBackend,
      },
    });

    // Load agent memory and enhance system prompt
    let systemPrompt = options.systemPrompt;

    if (!systemPrompt) {
      // Load comprehensive default prompt and enhance with memory
      const basePrompt = loadDefaultPrompt();

      systemPrompt = await enhancePromptWithMemory(basePrompt, {
        backend: compositeBackend,
        memoryPath: '/memories/agent.md',
      });
    }

    const agent = createDeepAgent({
      model: options.model || this.config.model,
      backend: compositeBackend,
      system_prompt: systemPrompt,
      tools: {
        web_search: webSearchTool,
        http_request: httpRequestTool,
        fetch_url: fetchUrlTool,
        shell: shellTool,
      },
    });

    this.agents.set(name, agent);
    return agent;
  }

  /**
   * Get an agent by name, creating it if it doesn't exist.
   */
  async getAgent(name?: string): Promise<Agent> {
    const agentName = name || this.currentAgentName;

    if (!this.agents.has(agentName)) {
      await this.createAgent(agentName);
    }

    return this.agents.get(agentName)!;
  }

  /**
   * Get current agent.
   */
  async getCurrentAgent(): Promise<Agent> {
    return await this.getAgent(this.currentAgentName);
  }

  /**
   * Switch to a different agent.
   */
  async switchAgent(name: string): Promise<Agent> {
    this.currentAgentName = name;
    return await this.getAgent(name);
  }

  /**
   * List all agents.
   */
  listAgents(): string[] {
    return Array.from(this.agents.keys());
  }

  /**
   * Reset an agent (clear its memory).
   */
  async resetAgent(name?: string): Promise<void> {
    const agentName = name || this.currentAgentName;
    if (this.agents.has(agentName)) {
      // Delete the old agent
      this.agents.delete(agentName);
      // Create a new one
      await this.createAgent(agentName);
    }
  }

  /**
   * Get current agent name.
   */
  getCurrentAgentName(): string {
    return this.currentAgentName;
  }

  /**
   * Get backend for an agent.
   */
  getAgentBackend(name?: string) {
    const agent = this.getAgent(name);
    return getAgentBackend(agent);
  }
}
