/**
 * Deep Agents - TypeScript Library
 *
 * General purpose 'deep agent' with sub-agent spawning, file system tools,
 * and planning capabilities. Built on Mastra.
 */

// Export types
export type * from './types/index.js';

// Export backends
export { StateBackend, FilesystemBackend, CompositeBackend } from './backends/index.js';
export type {
  BackendProtocol,
  FileInfo,
  GrepMatch,
  WriteResult,
  EditResult,
  FilesystemBackendConfig,
} from './backends/index.js';

// Export tools
export {
  createLsTool,
  createReadFileTool,
  createWriteFileTool,
  createEditFileTool,
  createGrepSearchTool,
  createGlobSearchTool,
  createFilesystemTools,
  createTodoListTool,
  createTaskTool,
  TodoStatus,
  TodoItemSchema,
} from './tools/index.js';
export type { TodoItem, TodoStatusType, TaskToolConfig } from './tools/index.js';

// Export utilities (for advanced users)
export * from './utils/index.js';
