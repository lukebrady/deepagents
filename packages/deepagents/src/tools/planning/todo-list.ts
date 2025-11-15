/**
 * TodoList tool for task planning and tracking.
 *
 * Helps agents manage multi-step tasks by creating and updating a todo list.
 */

import { createTool } from '@mastra/core';
import { z } from 'zod';

/**
 * Todo item status.
 */
export const TodoStatus = z.enum(['pending', 'in_progress', 'completed']);

/**
 * Todo item schema.
 */
export const TodoItemSchema = z.object({
  content: z.string().describe('The task description (imperative form, e.g., "Run tests")'),
  status: TodoStatus.describe('Current status of the task'),
  activeForm: z
    .string()
    .describe(
      'Present continuous form shown during execution (e.g., "Running tests")'
    ),
});

export type TodoItem = z.infer<typeof TodoItemSchema>;
export type TodoStatusType = z.infer<typeof TodoStatus>;

/**
 * Create a TodoList tool for task management.
 *
 * This tool allows agents to plan and track multi-step tasks by maintaining
 * a todo list with status updates.
 *
 * @returns Mastra tool for managing todos
 *
 * @example
 * ```typescript
 * const todoTool = createTodoListTool();
 *
 * // Agent creates a plan
 * await todoTool.execute({
 *   context: {
 *     todos: [
 *       { content: 'Read codebase', status: 'pending', activeForm: 'Reading codebase' },
 *       { content: 'Write tests', status: 'pending', activeForm: 'Writing tests' },
 *     ]
 *   }
 * });
 *
 * // Agent updates progress
 * await todoTool.execute({
 *   context: {
 *     todos: [
 *       { content: 'Read codebase', status: 'completed', activeForm: 'Reading codebase' },
 *       { content: 'Write tests', status: 'in_progress', activeForm: 'Writing tests' },
 *     ]
 *   }
 * });
 * ```
 */
export function createTodoListTool() {
  return createTool({
    id: 'writeTodos',
    description: `Manage a todo list for tracking multi-step tasks.

Use this tool to:
1. Create a plan by defining pending tasks
2. Mark tasks as in_progress when starting work
3. Mark tasks as completed when finished
4. Update or reorder tasks as needed

Best practices:
- Keep the list MINIMAL (3-6 items maximum)
- Only use for complex, multi-step tasks (3+ steps)
- For simple tasks (1-2 steps), just do them directly
- Update status promptly as you complete each item
- Exactly ONE task should be in_progress at a time

Task states:
- pending: Not yet started
- in_progress: Currently working on (limit to ONE at a time)
- completed: Task finished successfully`,
    inputSchema: z.object({
      todos: z
        .array(TodoItemSchema)
        .describe(
          'Array of todo items with content, status, and activeForm for each task'
        ),
    }),
    outputSchema: z.object({
      success: z.boolean().describe('Whether the todo list was updated successfully'),
      count: z.number().describe('Number of todos in the list'),
      in_progress_count: z.number().describe('Number of todos currently in progress'),
      completed_count: z.number().describe('Number of completed todos'),
      pending_count: z.number().describe('Number of pending todos'),
    }),
    execute: async ({ context }) => {
      const { todos } = context;

      // Count todos by status
      const counts = {
        pending: 0,
        in_progress: 0,
        completed: 0,
      };

      for (const todo of todos) {
        counts[todo.status]++;
      }

      return {
        success: true,
        count: todos.length,
        in_progress_count: counts.in_progress,
        completed_count: counts.completed,
        pending_count: counts.pending,
      };
    },
  });
}
