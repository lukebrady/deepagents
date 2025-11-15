/**
 * Deep Agents - TypeScript Library
 *
 * General purpose 'deep agent' with sub-agent spawning, file system tools,
 * and planning capabilities. Built on Mastra.
 */

// Export types
export type * from './types/index.js';

// Export backends
export { StateBackend } from './backends/index.js';
export type { BackendProtocol, FileInfo, GrepMatch, WriteResult, EditResult } from './backends/index.js';

// Export utilities (for advanced users)
export * from './utils/index.js';
