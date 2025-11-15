/**
 * Protocol definition for pluggable memory backends.
 *
 * This module defines the BackendProtocol that all backend implementations
 * must follow. Backends can store files in different locations (state, filesystem,
 * database, etc.) and provide a uniform interface for file operations.
 */

/**
 * Structured file listing info.
 *
 * Minimal contract used across backends. Only "path" is required.
 * Other fields are best-effort and may be absent depending on backend.
 */
export interface FileInfo {
  /** File path (required) */
  path: string;
  /** Whether this is a directory */
  is_dir?: boolean;
  /** File size in bytes (approximate) */
  size?: number;
  /** ISO timestamp of last modification */
  modified_at?: string;
}

/**
 * Structured grep match entry.
 */
export interface GrepMatch {
  /** File path where match was found */
  path: string;
  /** Line number (1-indexed) */
  line: number;
  /** Text content of the matched line */
  text: string;
}

/**
 * Result from backend write operations.
 *
 * @example
 * ```typescript
 * // Checkpoint storage
 * { path: "/f.txt", filesUpdate: { "/f.txt": {...} } }
 *
 * // External storage
 * { path: "/f.txt", filesUpdate: null }
 *
 * // Error
 * { error: "File exists" }
 * ```
 */
export interface WriteResult {
  /** Error message on failure, undefined on success */
  error?: string;
  /** Absolute path of written file, undefined on failure */
  path?: string;
  /**
   * State update dict for checkpoint backends, null for external storage.
   * Checkpoint backends populate this with {file_path: file_data} for LangGraph state.
   * External backends set null (already persisted to disk/S3/database/etc).
   */
  filesUpdate?: Record<string, unknown> | null;
}

/**
 * Result from backend edit operations.
 *
 * @example
 * ```typescript
 * // Checkpoint storage
 * { path: "/f.txt", filesUpdate: { "/f.txt": {...} }, occurrences: 1 }
 *
 * // External storage
 * { path: "/f.txt", filesUpdate: null, occurrences: 2 }
 *
 * // Error
 * { error: "File not found" }
 * ```
 */
export interface EditResult {
  /** Error message on failure, undefined on success */
  error?: string;
  /** Absolute path of edited file, undefined on failure */
  path?: string;
  /**
   * State update dict for checkpoint backends, null for external storage.
   * Checkpoint backends populate this with {file_path: file_data} for LangGraph state.
   * External backends set null (already persisted to disk/S3/database/etc).
   */
  filesUpdate?: Record<string, unknown> | null;
  /** Number of replacements made, undefined on failure */
  occurrences?: number;
}

/**
 * File data structure used internally by backends.
 *
 * All file data is represented as objects with this structure.
 */
export interface FileData {
  /** Lines of text content */
  content: string[];
  /** ISO format timestamp of creation */
  created_at: string;
  /** ISO format timestamp of last modification */
  modified_at: string;
}

/**
 * Protocol for pluggable memory backends (single, unified).
 *
 * Backends can store files in different locations (state, filesystem, database, etc.)
 * and provide a uniform interface for file operations.
 */
export interface BackendProtocol {
  /**
   * Structured listing with file metadata.
   *
   * @param path - Directory path to list
   * @returns Array of FileInfo objects
   */
  ls_info(path: string): Promise<FileInfo[]>;

  /**
   * Read file content with line numbers or an error string.
   *
   * @param file_path - Path to the file to read
   * @param offset - Line number to start reading from (0-indexed)
   * @param limit - Number of lines to read
   * @returns File content as string with line numbers, or error message
   */
  read(file_path: string, offset?: number, limit?: number): Promise<string>;

  /**
   * Structured search results or error string for invalid input.
   *
   * @param pattern - Regular expression pattern to search for
   * @param path - Directory path to search in (optional)
   * @param glob - Glob pattern to filter files (optional)
   * @returns Array of GrepMatch objects or error string
   */
  grep_raw(
    pattern: string,
    path?: string | null,
    glob?: string | null
  ): Promise<GrepMatch[] | string>;

  /**
   * Structured glob matching returning FileInfo dicts.
   *
   * @param pattern - Glob pattern to match
   * @param path - Directory path to search in
   * @returns Array of FileInfo objects
   */
  glob_info(pattern: string, path?: string): Promise<FileInfo[]>;

  /**
   * Create a new file.
   *
   * @param file_path - Path where the file should be created
   * @param content - Content to write to the file
   * @returns WriteResult; error populated on failure
   */
  write(file_path: string, content: string): Promise<WriteResult>;

  /**
   * Edit a file by replacing string occurrences.
   *
   * @param file_path - Path to the file to edit
   * @param old_string - String to search for
   * @param new_string - String to replace with
   * @param replace_all - Whether to replace all occurrences (default: false)
   * @returns EditResult with operation details
   */
  edit(
    file_path: string,
    old_string: string,
    new_string: string,
    replace_all?: boolean
  ): Promise<EditResult>;
}

/**
 * Factory function type for creating backend instances.
 */
export type BackendFactory = () => BackendProtocol;
