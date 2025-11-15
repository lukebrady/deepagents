/**
 * Subagent configuration types.
 */

import type { Agent } from '@mastra/core';

/**
 * Specification for a subagent.
 *
 * When specifying custom agents, default middleware/configuration will be applied first,
 * followed by any custom configuration specified in this spec.
 */
export interface SubAgent {
  /** The name of the subagent */
  name: string;

  /** The description of the subagent (shown to parent agent) */
  description: string;

  /** The system prompt to use for the subagent */
  system_prompt: string;

  /** The tools available to the subagent */
  tools?: Record<string, unknown>;

  /**
   * The model for the subagent.
   * If not specified, inherits from parent agent.
   */
  model?: string;

  /**
   * Whether this subagent should have access to the same tools as parent.
   * @default false
   */
  inherit_tools?: boolean;
}

/**
 * A pre-compiled subagent specification.
 *
 * Use this when you want to provide a fully constructed agent.
 */
export interface CompiledSubAgent {
  /** The name of the subagent */
  name: string;

  /** The description of the subagent (shown to parent agent) */
  description: string;

  /** The compiled agent instance */
  runnable: Agent;
}

/**
 * Model options for task tool.
 */
export type TaskModel = 'sonnet' | 'opus' | 'haiku';

/**
 * Input for the task tool (subagent spawning).
 */
export interface TaskInput {
  /** Short description of the task (3-5 words) */
  description: string;

  /** Detailed prompt for the subagent */
  prompt: string;

  /** The type of subagent to use */
  subagent_type: string;

  /**
   * Model to use for this task.
   * If not specified, uses the subagent's default model.
   */
  model?: TaskModel;
}

/**
 * Output from the task tool.
 */
export interface TaskOutput {
  /** The result message from the subagent */
  result: string;

  /** Any error that occurred during execution */
  error?: string;
}
