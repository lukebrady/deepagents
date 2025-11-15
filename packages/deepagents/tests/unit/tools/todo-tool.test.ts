/**
 * Tests for TodoList Tool
 */

import { describe, it, expect } from 'vitest';
import { createTodoListTool } from '../../../src/tools/planning/todo-list.js';

describe('TodoList Tool', () => {
  describe('createTodoListTool', () => {
    it('should create a working todo tool', async () => {
      const todoTool = createTodoListTool();
      expect(todoTool).toBeDefined();
      expect(todoTool.id).toBe('writeTodos');
    });

    it('should handle todo list with various statuses', async () => {
      const todoTool = createTodoListTool();

      const result = await todoTool.execute({
        context: {
          todos: [
            { content: 'Task 1', status: 'completed', activeForm: 'Completing Task 1' },
            { content: 'Task 2', status: 'in_progress', activeForm: 'Working on Task 2' },
            { content: 'Task 3', status: 'pending', activeForm: 'Starting Task 3' },
            { content: 'Task 4', status: 'pending', activeForm: 'Starting Task 4' },
          ],
        },
      });

      expect(result.success).toBe(true);
      expect(result.count).toBe(4);
      expect(result.completed_count).toBe(1);
      expect(result.in_progress_count).toBe(1);
      expect(result.pending_count).toBe(2);
    });

    it('should handle empty todo list', async () => {
      const todoTool = createTodoListTool();

      const result = await todoTool.execute({
        context: {
          todos: [],
        },
      });

      expect(result.success).toBe(true);
      expect(result.count).toBe(0);
      expect(result.completed_count).toBe(0);
      expect(result.in_progress_count).toBe(0);
      expect(result.pending_count).toBe(0);
    });

    it('should handle all completed todos', async () => {
      const todoTool = createTodoListTool();

      const result = await todoTool.execute({
        context: {
          todos: [
            { content: 'Task 1', status: 'completed', activeForm: 'Completed Task 1' },
            { content: 'Task 2', status: 'completed', activeForm: 'Completed Task 2' },
          ],
        },
      });

      expect(result.success).toBe(true);
      expect(result.count).toBe(2);
      expect(result.completed_count).toBe(2);
      expect(result.in_progress_count).toBe(0);
      expect(result.pending_count).toBe(0);
    });
  });
});
