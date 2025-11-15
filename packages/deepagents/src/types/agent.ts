/**
 * Agent configuration types for Deep Agents.
 */

import type { Agent } from '@mastra/core';
import type { BackendProtocol } from './backend.js';
import type { SubAgent, CompiledSubAgent } from './subagent.js';

/**
 * Model types supported by Deep Agents.
 */
export type ModelType = 'claude-sonnet-4-5-20250929' | 'claude-opus-4-20250514' | string;

/**
 * Configuration for creating a Deep Agent.
 */
export interface DeepAgentConfig {
  /**
   * The model to use for the agent.
   * @default 'claude-sonnet-4-5-20250929'
   */
  model?: ModelType;

  /**
   * Backend for file operations.
   * If not provided, a default StateBackend will be used.
   */
  backend?: BackendProtocol;

  /**
   * Custom subagents to register.
   * The 'general-purpose' subagent is always available by default.
   */
  subagents?: Array<SubAgent | CompiledSubAgent>;

  /**
   * Tool approval callback for HITL workflow.
   * If provided, tools will require approval before execution.
   */
  interrupt_on?: (toolName: string, toolArgs: unknown) => boolean | Promise<boolean>;

  /**
   * Custom system prompt for the agent.
   * If not provided, a default prompt will be used.
   */
  system_prompt?: string;

  /**
   * Additional tools to add to the agent.
   */
  tools?: Record<string, unknown>;

  /**
   * Enable memory features.
   * @default true
   */
  memory?: {
    /** Conversation history */
    conversation?: boolean;
    /** Working memory for short-term context */
    working?: boolean;
    /** Semantic memory for long-term facts */
    semantic?: boolean;
  };
}

/**
 * Context passed to tool execution functions.
 */
export interface ToolContext {
  /** The backend instance for file operations */
  backend: BackendProtocol;
  /** Current agent instance */
  agent?: Agent;
  /** Additional context data */
  [key: string]: unknown;
}

/**
 * Tool execution function signature.
 */
export type ToolExecuteFn<TInput = unknown, TOutput = unknown> = (context: {
  context: TInput;
  toolContext?: ToolContext;
}) => Promise<TOutput> | TOutput;
