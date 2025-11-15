/**
 * Backend implementations for Deep Agents.
 */

export { StateBackend } from './state-backend.js';
export { FilesystemBackend } from './filesystem-backend.js';
export { CompositeBackend } from './composite-backend.js';
export type { FilesystemBackendConfig } from './filesystem-backend.js';
export type {
  BackendProtocol,
  FileInfo,
  GrepMatch,
  WriteResult,
  EditResult,
} from '../types/backend.js';
