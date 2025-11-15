/**
 * Tools for Deep Agents.
 *
 * Mastra-compatible tools for file system operations, planning, and subagent spawning.
 */

// Filesystem tools
export {
  createLsTool,
  createReadFileTool,
  createWriteFileTool,
  createEditFileTool,
  createGrepSearchTool,
  createGlobSearchTool,
  createFilesystemTools,
} from './filesystem/index.js';

// Planning tools
export { createTodoListTool, TodoStatus, TodoItemSchema } from './planning/todo-list.js';
export type { TodoItem, TodoStatusType } from './planning/todo-list.js';

// Subagent tools
export { createTaskTool } from './subagent/task.js';
export type { TaskToolConfig } from './subagent/task.js';

// Shell tools
export { createShellTool, createRestrictedShellTool } from './shell/index.js';
export type { ShellToolConfig } from './shell/index.js';
