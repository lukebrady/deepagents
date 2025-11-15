/**
 * Agent manager for Deep Agents CLI.
 */

import { createDeepAgent, StateBackend, getAgentBackend } from '@deepagents/core';
import type { Agent } from '@mastra/core';
import type { Config } from '../types/config.js';
import { createBraveSearchTool, createHttpRequestTool, createFetchUrlTool } from '../tools/index.js';

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
  createAgent(name: string, options: { model?: string; systemPrompt?: string } = {}): Agent {
    // Create custom CLI tools
    const webSearchTool = createBraveSearchTool({
      apiKey: this.config.apiKeys.braveSearch,
    });
    const httpRequestTool = createHttpRequestTool();
    const fetchUrlTool = createFetchUrlTool();

    const agent = createDeepAgent({
      model: options.model || this.config.model,
      backend: new StateBackend(),
      system_prompt: options.systemPrompt,
      tools: {
        web_search: webSearchTool,
        http_request: httpRequestTool,
        fetch_url: fetchUrlTool,
      },
    });

    this.agents.set(name, agent);
    return agent;
  }

  /**
   * Get an agent by name, creating it if it doesn't exist.
   */
  getAgent(name?: string): Agent {
    const agentName = name || this.currentAgentName;

    if (!this.agents.has(agentName)) {
      this.createAgent(agentName);
    }

    return this.agents.get(agentName)!;
  }

  /**
   * Get current agent.
   */
  getCurrentAgent(): Agent {
    return this.getAgent(this.currentAgentName);
  }

  /**
   * Switch to a different agent.
   */
  switchAgent(name: string): Agent {
    this.currentAgentName = name;
    return this.getAgent(name);
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
  resetAgent(name?: string): void {
    const agentName = name || this.currentAgentName;
    if (this.agents.has(agentName)) {
      // Delete the old agent
      this.agents.delete(agentName);
      // Create a new one
      this.createAgent(agentName);
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
