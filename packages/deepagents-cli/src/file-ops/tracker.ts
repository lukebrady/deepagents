/**
 * File operation tracker for the CLI.
 */

import type { FileOperation } from '../types/session.js';

/**
 * Track file operations performed by the agent.
 */
export class FileOpTracker {
  private operations: FileOperation[] = [];

  /**
   * Record a file operation.
   */
  record(operation: FileOperation): void {
    this.operations.push(operation);
  }

  /**
   * Get all operations.
   */
  getOperations(): FileOperation[] {
    return [...this.operations];
  }

  /**
   * Get operations for a specific file.
   */
  getFileOperations(path: string): FileOperation[] {
    return this.operations.filter((op) => op.path === path);
  }

  /**
   * Clear all operations.
   */
  clear(): void {
    this.operations = [];
  }

  /**
   * Get summary of operations.
   */
  getSummary(): { reads: number; writes: number; edits: number; deletes: number } {
    const summary = {
      reads: 0,
      writes: 0,
      edits: 0,
      deletes: 0,
    };

    for (const op of this.operations) {
      switch (op.type) {
        case 'read':
          summary.reads++;
          break;
        case 'write':
          summary.writes++;
          break;
        case 'edit':
          summary.edits++;
          break;
        case 'delete':
          summary.deletes++;
          break;
      }
    }

    return summary;
  }
}
