/**
 * Type definitions for Deep Agents TypeScript library.
 */

// Backend types
export type {
  BackendProtocol,
  BackendFactory,
  FileInfo,
  GrepMatch,
  FileData,
  WriteResult,
  EditResult,
} from './backend.js';

// Agent types
export type {
  DeepAgentConfig,
  ModelType,
  ToolContext,
  ToolExecuteFn,
} from './agent.js';

// Subagent types
export type {
  SubAgent,
  CompiledSubAgent,
  TaskInput,
  TaskOutput,
  TaskModel,
} from './subagent.js';
