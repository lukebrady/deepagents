/**
 * Agent factory for creating Deep Agents with Mastra.
 *
 * This module provides the main factory function for creating Deep Agents
 * that integrate with the Mastra framework.
 */

import { Agent } from '@mastra/core';
import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';
import type { DeepAgentConfig } from './types/agent.js';
import type { BackendProtocol } from './types/backend.js';
import { StateBackend } from './backends/state-backend.js';
import { createFilesystemTools } from './tools/filesystem/index.js';
import { createTodoListTool } from './tools/planning/todo-list.js';
import { createTaskTool } from './tools/subagent/task.js';

/**
 * Default system prompt for Deep Agents.
 */
const DEFAULT_SYSTEM_PROMPT = `You are a helpful AI assistant with access to file system operations and task management tools.

You can:
- Read, write, and edit files
- Search file contents and find files by pattern
- List directories
- Manage tasks with a todo list
- Delegate complex work to subagents

When working with files:
- Always read files before editing them
- Use exact string matching for edits (including whitespace)
- Create parent directories automatically when writing files

When managing tasks:
- Use the todo list for complex multi-step tasks (3+ steps)
- Mark tasks as in_progress before starting, completed when done
- Keep the todo list minimal (3-6 items)

Be efficient, accurate, and helpful in completing user requests.`;

/**
 * Map model shortcuts to full model names.
 */
function resolveModelName(model: string): string {
  const modelMap: Record<string, string> = {
    sonnet: 'claude-sonnet-4-5-20250929',
    opus: 'claude-opus-4-20250514',
    haiku: 'claude-3-5-haiku-20241022',
    'gpt-4': 'gpt-4-turbo-preview',
    'gpt-3.5': 'gpt-3.5-turbo',
  };

  return modelMap[model] || model;
}

/**
 * Get the appropriate model provider based on model name.
 */
function getModelProvider(modelName: string) {
  if (modelName.startsWith('claude') || modelName.includes('anthropic')) {
    return anthropic(modelName);
  }
  if (modelName.startsWith('gpt') || modelName.includes('openai')) {
    return openai(modelName);
  }
  // Default to anthropic
  return anthropic(modelName);
}

/**
 * Create a Deep Agent with Mastra integration.
 *
 * This factory function creates a fully configured Mastra agent with:
 * - File system tools (read, write, edit, search, glob)
 * - Planning tools (todo list)
 * - Subagent spawning (task tool)
 * - Pluggable backend for file storage
 * - Optional memory configuration
 *
 * @param config - Configuration for the agent
 * @returns Configured Mastra Agent instance
 *
 * @example
 * ```typescript
 * import { createDeepAgent, StateBackend } from '@deepagents/core';
 *
 * // Create an agent with in-memory storage
 * const agent = createDeepAgent({
 *   model: 'claude-sonnet-4-5-20250929',
 *   backend: new StateBackend(),
 * });
 *
 * // Use the agent
 * const result = await agent.generate({
 *   messages: [
 *     { role: 'user', content: 'Create a file called hello.ts with a greeting function' }
 *   ]
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Create an agent with filesystem backend
 * import { FilesystemBackend, CompositeBackend } from '@deepagents/core';
 *
 * const agent = createDeepAgent({
 *   model: 'sonnet', // Shorthand for claude-sonnet-4-5-20250929
 *   backend: new CompositeBackend({
 *     default: new StateBackend(),
 *     routes: {
 *       '/workspace/': new FilesystemBackend({
 *         rootDir: './my-project',
 *         virtualMode: true,
 *       }),
 *     },
 *   }),
 *   system_prompt: 'You are a coding assistant...',
 * });
 * ```
 */
export function createDeepAgent(config: DeepAgentConfig = {}): Agent {
  const {
    model = 'claude-sonnet-4-5-20250929',
    backend = new StateBackend(),
    subagents = [],
    system_prompt = DEFAULT_SYSTEM_PROMPT,
    tools: customTools = {},
    memory,
  } = config;

  // Resolve model name and get provider
  const modelName = resolveModelName(model);
  const modelProvider = getModelProvider(modelName);

  // Create filesystem tools
  const filesystemTools = createFilesystemTools(backend);

  // Create planning tool
  const todoTool = createTodoListTool();

  // Create task tool for subagent spawning
  const taskTool = createTaskTool({
    subagents,
    executeSubagent: async (taskConfig) => {
      // This is a placeholder - full implementation will spawn actual subagents
      // For now, return a message indicating the task would be executed
      return `[Subagent "${taskConfig.subagent_type}" task] ${taskConfig.description}\n\nPrompt: ${taskConfig.prompt}\n\n(Full subagent execution will be implemented in a future update)`;
    },
  });

  // Combine all tools
  const allTools = {
    ...filesystemTools,
    writeTodos: todoTool,
    task: taskTool,
    ...customTools,
  };

  // Create the agent
  const agent = new Agent({
    name: 'Deep Agent',
    instructions: system_prompt,
    model: modelProvider,
    tools: allTools,
    // Enable memory if configured
    ...(memory && {
      memory: {
        enabled: memory.conversation ?? true,
      },
    }),
  });

  // Store backend reference for external access
  (agent as any).__backend = backend;

  return agent;
}

/**
 * Get the backend from an agent created with createDeepAgent.
 *
 * @param agent - Agent instance
 * @returns Backend instance or undefined
 */
export function getAgentBackend(agent: Agent): BackendProtocol | undefined {
  return (agent as any).__backend;
}
