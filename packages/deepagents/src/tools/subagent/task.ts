/**
 * Task tool for spawning subagents.
 *
 * This tool allows agents to delegate complex, multi-step tasks to specialized
 * subagents with isolated context windows.
 */

import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import type { Agent } from '@mastra/core';
import type { SubAgent, CompiledSubAgent } from '../../types/subagent.js';

/**
 * Configuration for creating a task tool.
 */
export interface TaskToolConfig {
  /**
   * Available subagents that can be spawned.
   */
  subagents?: Array<SubAgent | CompiledSubAgent>;

  /**
   * Parent agent (for inheriting tools/config).
   */
  parentAgent?: Agent;

  /**
   * Callback to execute a subagent task.
   * This will be properly implemented when the agent factory is complete.
   */
  executeSubagent?: (config: {
    subagent_type: string;
    prompt: string;
    description: string;
    model?: string;
  }) => Promise<string>;
}

/**
 * Format available agents description for the tool.
 */
function formatAvailableAgents(
  subagents: Array<SubAgent | CompiledSubAgent>
): string {
  const agentsList = subagents
    .map((agent) => `- "${agent.name}": ${agent.description}`)
    .join('\n');

  return agentsList || '- "general-purpose": General purpose agent with all tools';
}

/**
 * Create a Task tool for spawning subagents.
 *
 * @param config - Configuration for the task tool
 * @returns Mastra tool for spawning subagents
 *
 * @example
 * ```typescript
 * const taskTool = createTaskTool({
 *   subagents: [
 *     {
 *       name: 'research',
 *       description: 'Research agent for gathering information',
 *       system_prompt: 'You are a research assistant...',
 *       tools: {},
 *     }
 *   ]
 * });
 * ```
 */
export function createTaskTool(config: TaskToolConfig = {}) {
  const { subagents = [], executeSubagent } = config;

  // Add default general-purpose agent if not already present
  const hasGeneralPurpose = subagents.some((s) => s.name === 'general-purpose');
  const allSubagents = hasGeneralPurpose
    ? subagents
    : [
        {
          name: 'general-purpose',
          description: 'General purpose agent with access to all tools',
          system_prompt:
            'In order to complete the objective that the user asks of you, you have access to a number of standard tools.',
        } as SubAgent,
        ...subagents,
      ];

  const availableAgentsDesc = formatAvailableAgents(allSubagents);

  return createTool({
    id: 'task',
    description: `Launch an ephemeral subagent to handle complex, multi-step independent tasks with isolated context windows.

Available agent types and the tools they have access to:
${availableAgentsDesc}

When using the Task tool, you must specify a subagent_type parameter to select which agent type to use.

## Usage notes:
1. Launch multiple agents concurrently whenever possible, to maximize performance
2. When the agent is done, it will return a single message back to you. The result is not visible to the user
3. Each agent invocation is stateless - provide detailed instructions in the prompt
4. The agent's outputs should generally be trusted
5. Clearly specify whether you expect content creation, analysis, or research
6. Use for complex tasks that benefit from context isolation

## Best practices:
- Use for complex, multi-step tasks (3+ steps)
- Break down large objectives into smaller, independent subagent tasks
- Provide detailed, self-contained prompts
- Specify exactly what information the subagent should return
- Use parallel execution when tasks are independent`,
    inputSchema: z.object({
      description: z
        .string()
        .describe('Short (3-5 word) description of the task for tracking'),
      prompt: z
        .string()
        .describe(
          'Detailed, self-contained prompt for the subagent with all necessary context and instructions'
        ),
      subagent_type: z
        .string()
        .describe('The type of subagent to use (e.g., "general-purpose", "research")'),
      model: z
        .enum(['sonnet', 'opus', 'haiku'])
        .optional()
        .describe('Optional: specify which model to use for this task'),
    }),
    outputSchema: z.object({
      result: z
        .string()
        .describe('The final response from the subagent containing all requested information'),
      error: z.string().optional().describe('Error message if execution failed'),
    }),
    execute: async ({ context }) => {
      const { description, prompt, subagent_type, model } = context;

      // Validate subagent type exists
      const subagent = allSubagents.find((s) => s.name === subagent_type);
      if (!subagent) {
        return {
          result: '',
          error: `Unknown subagent type: "${subagent_type}". Available: ${allSubagents.map((s) => s.name).join(', ')}`,
        };
      }

      // If executeSubagent callback provided, use it
      if (executeSubagent) {
        try {
          const result = await executeSubagent({
            subagent_type,
            prompt,
            description,
            model,
          });
          return { result };
        } catch (error) {
          return {
            result: '',
            error: `Subagent execution failed: ${error instanceof Error ? error.message : String(error)}`,
          };
        }
      }

      // Default placeholder response when agent factory not yet implemented
      return {
        result: `[PLACEHOLDER] Subagent "${subagent_type}" would execute: ${description}\n\nThis will be fully functional when the agent factory is implemented in Phase 4.`,
      };
    },
  });
}
