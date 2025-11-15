/**
 * StateBackend: Store files in memory (ephemeral).
 *
 * This backend provides in-memory file storage suitable for use with
 * Mastra agents. Files persist within a session but not across sessions.
 */

import type {
  BackendProtocol,
  EditResult,
  FileInfo,
  GrepMatch,
  WriteResult,
  FileData,
} from '../types/backend.js';
import {
  createFileData,
  fileDataToString,
  formatReadResponse,
  updateFileData,
  performStringReplacement,
} from '../utils/file-data.js';
import { grepMatchesFromFiles, globSearchFiles } from '../utils/grep.js';

/**
 * Backend that stores files in memory (ephemeral).
 *
 * Files persist within a session but not across sessions.
 * This is the simplest backend and is suitable for stateless operations
 * or when using Mastra's memory system.
 */
export class StateBackend implements BackendProtocol {
  private files: Map<string, FileData>;

  constructor() {
    this.files = new Map();
  }

  /**
   * Get the current files as a plain object (for serialization).
   */
  getFiles(): Record<string, FileData> {
    return Object.fromEntries(this.files);
  }

  /**
   * Set files from a plain object (for deserialization).
   */
  setFiles(files: Record<string, FileData>): void {
    this.files = new Map(Object.entries(files));
  }

  /**
   * List files and directories in the specified directory (non-recursive).
   *
   * @param path - Absolute path to directory
   * @returns List of FileInfo objects for files and directories
   */
  async ls_info(path: string): Promise<FileInfo[]> {
    const infos: FileInfo[] = [];
    const subdirs = new Set<string>();

    // Normalize path to have trailing slash
    const normalizedPath = path.endsWith('/') ? path : path + '/';

    for (const [filePath, fileData] of this.files) {
      // Check if file is in the specified directory or a subdirectory
      if (!filePath.startsWith(normalizedPath)) {
        continue;
      }

      // Get the relative path after the directory
      const relative = filePath.slice(normalizedPath.length);

      // If relative path contains '/', it's in a subdirectory
      if (relative.includes('/')) {
        // Extract the immediate subdirectory name
        const subdirName = relative.split('/')[0];
        if (subdirName) {
          subdirs.add(normalizedPath + subdirName + '/');
        }
        continue;
      }

      // This is a file directly in the current directory
      const content = fileData.content.join('\n');
      infos.push({
        path: filePath,
        is_dir: false,
        size: content.length,
        modified_at: fileData.modified_at,
      });
    }

    // Add directories to the results
    for (const subdir of Array.from(subdirs).sort()) {
      infos.push({
        path: subdir,
        is_dir: true,
        size: 0,
        modified_at: '',
      });
    }

    // Sort by path
    infos.sort((a, b) => a.path.localeCompare(b.path));

    return infos;
  }

  /**
   * Read file content with line numbers.
   *
   * @param file_path - Absolute file path
   * @param offset - Line offset to start reading from (0-indexed)
   * @param limit - Maximum number of lines to read
   * @returns Formatted file content with line numbers, or error message
   */
  async read(file_path: string, offset: number = 0, limit: number = 2000): Promise<string> {
    const fileData = this.files.get(file_path);

    if (!fileData) {
      return `Error: File '${file_path}' not found`;
    }

    return formatReadResponse(fileData, offset, limit);
  }

  /**
   * Create a new file with content.
   *
   * @param file_path - Path where the file should be created
   * @param content - Content to write to the file
   * @returns WriteResult; error populated on failure
   */
  async write(file_path: string, content: string): Promise<WriteResult> {
    if (this.files.has(file_path)) {
      return {
        error: `Cannot write to ${file_path} because it already exists. Read and then make an edit, or write to a new path.`,
      };
    }

    const newFileData = createFileData(content);
    this.files.set(file_path, newFileData);

    return {
      path: file_path,
      filesUpdate: { [file_path]: newFileData },
    };
  }

  /**
   * Edit a file by replacing string occurrences.
   *
   * @param file_path - Path to the file to edit
   * @param old_string - String to search for
   * @param new_string - String to replace with
   * @param replace_all - Whether to replace all occurrences
   * @returns EditResult with operation details
   */
  async edit(
    file_path: string,
    old_string: string,
    new_string: string,
    replace_all: boolean = false
  ): Promise<EditResult> {
    const fileData = this.files.get(file_path);

    if (!fileData) {
      return {
        error: `Error: File '${file_path}' not found`,
      };
    }

    const content = fileDataToString(fileData);
    const result = performStringReplacement(content, old_string, new_string, replace_all);

    if (typeof result === 'string') {
      return { error: result };
    }

    const newFileData = updateFileData(fileData, result.newContent);
    this.files.set(file_path, newFileData);

    return {
      path: file_path,
      filesUpdate: { [file_path]: newFileData },
      occurrences: result.occurrences,
    };
  }

  /**
   * Search file contents for regex pattern.
   *
   * @param pattern - Regular expression pattern to search for
   * @param path - Directory path to search in (optional)
   * @param glob - Glob pattern to filter files (optional)
   * @returns Array of GrepMatch objects or error string
   */
  async grep_raw(
    pattern: string,
    path?: string | null,
    glob?: string | null
  ): Promise<GrepMatch[] | string> {
    return grepMatchesFromFiles(this.getFiles(), pattern, path, glob);
  }

  /**
   * Find files matching glob pattern.
   *
   * @param pattern - Glob pattern to match
   * @param path - Directory path to search in
   * @returns Array of FileInfo objects
   */
  async glob_info(pattern: string, path: string = '/'): Promise<FileInfo[]> {
    const matchedPaths = globSearchFiles(this.getFiles(), pattern, path);

    if (matchedPaths.length === 0) {
      return [];
    }

    const infos: FileInfo[] = [];

    for (const filePath of matchedPaths) {
      const fileData = this.files.get(filePath);
      if (!fileData) continue;

      const content = fileData.content.join('\n');
      infos.push({
        path: filePath,
        is_dir: false,
        size: content.length,
        modified_at: fileData.modified_at,
      });
    }

    return infos;
  }
}
