/**
 * StoreBackend: Persistent cross-session file storage.
 *
 * This backend provides persistent file storage that survives across
 * sessions and conversations. Files are stored in a directory structure
 * organized by namespace/assistant_id.
 *
 * Similar to Python's StoreBackend which uses LangGraph Store, this
 * implementation uses the filesystem for persistence with namespace isolation.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
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
} from '../utils/file-data.js';
import { performStringReplacement } from '../utils/string-replacement.js';

export interface StoreBackendConfig {
  /**
   * Namespace for isolating data (e.g., assistant_id or user_id).
   * Defaults to 'default'.
   */
  namespace?: string;

  /**
   * Root directory for persistent storage.
   * Defaults to ~/.deepagents/store/
   */
  storeDir?: string;
}

/**
 * Backend that provides persistent cross-session storage.
 *
 * Files are stored on disk in a structured directory organized by namespace.
 * This enables long-term memory that persists across conversations.
 *
 * Example usage:
 * ```typescript
 * const backend = new StoreBackend({
 *   namespace: 'my-assistant',
 *   storeDir: '~/.deepagents/store'
 * });
 * ```
 */
export class StoreBackend implements BackendProtocol {
  private namespace: string;
  private storeDir: string;
  private namespaceDir: string;

  constructor(config: StoreBackendConfig = {}) {
    this.namespace = config.namespace || 'default';
    this.storeDir =
      config.storeDir || path.join(os.homedir(), '.deepagents', 'store');
    this.namespaceDir = path.join(this.storeDir, this.namespace);

    // Ensure the namespace directory exists
    this.ensureDirectoryExists(this.namespaceDir);
  }

  /**
   * Ensure a directory exists, creating it if necessary.
   */
  private ensureDirectoryExists(dir: string): void {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  /**
   * Convert a virtual path to a physical filesystem path within the namespace.
   */
  private getPhysicalPath(virtualPath: string): string {
    // Remove leading slash for joining with namespace directory
    const relativePath = virtualPath.startsWith('/')
      ? virtualPath.slice(1)
      : virtualPath;
    return path.join(this.namespaceDir, relativePath);
  }

  /**
   * Convert a physical filesystem path to a virtual path.
   */
  private getVirtualPath(physicalPath: string): string {
    const relative = path.relative(this.namespaceDir, physicalPath);
    return '/' + relative.replace(/\\/g, '/');
  }

  /**
   * Read FileData from disk.
   */
  private readFileData(physicalPath: string): FileData | null {
    try {
      const metaPath = physicalPath + '.meta.json';
      const content = fs.readFileSync(physicalPath, 'utf-8');

      let created_at: string;
      let modified_at: string;

      // Try to read metadata
      if (fs.existsSync(metaPath)) {
        const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
        created_at = meta.created_at;
        modified_at = meta.modified_at;
      } else {
        // Fallback to file stats
        const stats = fs.statSync(physicalPath);
        created_at = stats.birthtime.toISOString();
        modified_at = stats.mtime.toISOString();
      }

      return {
        content: content.split('\n'),
        created_at,
        modified_at,
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Write FileData to disk with metadata.
   */
  private writeFileData(physicalPath: string, fileData: FileData): void {
    const dir = path.dirname(physicalPath);
    this.ensureDirectoryExists(dir);

    const content = fileData.content.join('\n');
    fs.writeFileSync(physicalPath, content, 'utf-8');

    // Write metadata
    const metaPath = physicalPath + '.meta.json';
    fs.writeFileSync(
      metaPath,
      JSON.stringify(
        {
          created_at: fileData.created_at,
          modified_at: fileData.modified_at,
        },
        null,
        2
      ),
      'utf-8'
    );
  }

  /**
   * Recursively get all files in a directory.
   */
  private getAllFilesRecursive(dir: string): string[] {
    const files: string[] = [];

    if (!fs.existsSync(dir)) {
      return files;
    }

    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      // Skip metadata files
      if (entry.name.endsWith('.meta.json')) {
        continue;
      }

      if (entry.isDirectory()) {
        files.push(...this.getAllFilesRecursive(fullPath));
      } else {
        files.push(fullPath);
      }
    }

    return files;
  }

  /**
   * List files and directories in the specified directory (non-recursive).
   *
   * @param path - Absolute virtual path to directory
   * @returns List of FileInfo objects for files and directories
   */
  async ls_info(virtualPath: string): Promise<FileInfo[]> {
    const physicalPath = this.getPhysicalPath(virtualPath);
    const infos: FileInfo[] = [];

    if (!fs.existsSync(physicalPath)) {
      return infos;
    }

    try {
      const entries = fs.readdirSync(physicalPath, { withFileTypes: true });

      for (const entry of entries) {
        // Skip metadata files
        if (entry.name.endsWith('.meta.json')) {
          continue;
        }

        const entryPhysicalPath = path.join(physicalPath, entry.name);
        const entryVirtualPath = this.getVirtualPath(entryPhysicalPath);

        if (entry.isDirectory()) {
          infos.push({
            path: entryVirtualPath.endsWith('/')
              ? entryVirtualPath
              : entryVirtualPath + '/',
            is_dir: true,
            size: 0,
            modified_at: '',
          });
        } else {
          const stats = fs.statSync(entryPhysicalPath);
          infos.push({
            path: entryVirtualPath,
            is_dir: false,
            size: stats.size,
            modified_at: stats.mtime.toISOString(),
          });
        }
      }

      // Sort by path
      infos.sort((a, b) => a.path.localeCompare(b.path));

      return infos;
    } catch (error) {
      return infos;
    }
  }

  /**
   * Read file content with line numbers.
   *
   * @param file_path - Absolute virtual file path
   * @param offset - Line offset to start reading from (0-indexed)
   * @param limit - Maximum number of lines to read
   * @returns Formatted file content with line numbers, or error message
   */
  async read(
    file_path: string,
    offset: number = 0,
    limit: number = 2000
  ): Promise<string> {
    const physicalPath = this.getPhysicalPath(file_path);
    const fileData = this.readFileData(physicalPath);

    if (!fileData) {
      return `Error: File '${file_path}' not found`;
    }

    return formatReadResponse(fileData, offset, limit);
  }

  /**
   * Create a new file with content.
   *
   * @param file_path - Virtual path where the file should be created
   * @param content - Content to write to the file
   * @returns WriteResult; error populated on failure
   */
  async write(file_path: string, content: string): Promise<WriteResult> {
    const physicalPath = this.getPhysicalPath(file_path);

    if (fs.existsSync(physicalPath)) {
      return {
        error: `Cannot write to ${file_path} because it already exists. Read and then make an edit, or write to a new path.`,
      };
    }

    const newFileData = createFileData(content);
    this.writeFileData(physicalPath, newFileData);

    // Return null for filesUpdate since we persist externally
    return {
      path: file_path,
      filesUpdate: null,
    };
  }

  /**
   * Edit a file by replacing string occurrences.
   *
   * @param file_path - Virtual path to the file to edit
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
    const physicalPath = this.getPhysicalPath(file_path);
    const fileData = this.readFileData(physicalPath);

    if (!fileData) {
      return {
        error: `Error: File '${file_path}' not found`,
      };
    }

    const content = fileDataToString(fileData);
    const result = performStringReplacement(
      content,
      old_string,
      new_string,
      replace_all
    );

    if (typeof result === 'string') {
      return { error: result };
    }

    const newFileData = updateFileData(fileData, result.newContent);
    this.writeFileData(physicalPath, newFileData);

    // Return null for filesUpdate since we persist externally
    return {
      path: file_path,
      filesUpdate: null,
      occurrences: result.occurrences,
    };
  }

  /**
   * Search file contents for regex pattern.
   *
   * @param pattern - Regular expression pattern to search for
   * @param searchPath - Virtual directory path to search in (optional)
   * @param globPattern - Glob pattern to filter files (optional)
   * @returns Array of GrepMatch objects or error string
   */
  async grep_raw(
    pattern: string,
    searchPath?: string | null,
    globPattern?: string | null
  ): Promise<GrepMatch[] | string> {
    // Validate regex pattern
    try {
      new RegExp(pattern);
    } catch (error) {
      return `Error: Invalid regex pattern: ${pattern}`;
    }

    const regex = new RegExp(pattern);
    const matches: GrepMatch[] = [];

    // Determine which directory to search
    const basePath = searchPath || '/';
    const physicalBasePath = this.getPhysicalPath(basePath);

    // Get all files recursively
    const allFiles = this.getAllFilesRecursive(physicalBasePath);

    for (const physicalPath of allFiles) {
      const virtualPath = this.getVirtualPath(physicalPath);

      // Apply glob filter if specified
      if (globPattern) {
        const minimatch = await import('minimatch');
        if (!minimatch.minimatch(virtualPath, globPattern)) {
          continue;
        }
      }

      // Read file and search for pattern
      const fileData = this.readFileData(physicalPath);
      if (!fileData) continue;

      fileData.content.forEach((line, index) => {
        if (regex.test(line)) {
          matches.push({
            path: virtualPath,
            line: index + 1, // 1-indexed line numbers
            text: line,
          });
        }
      });
    }

    return matches;
  }

  /**
   * Find files matching glob pattern.
   *
   * @param pattern - Glob pattern to match
   * @param searchPath - Virtual directory path to search in
   * @returns Array of FileInfo objects
   */
  async glob_info(pattern: string, searchPath: string = '/'): Promise<FileInfo[]> {
    const physicalBasePath = this.getPhysicalPath(searchPath);
    const allFiles = this.getAllFilesRecursive(physicalBasePath);
    const infos: FileInfo[] = [];

    const minimatch = await import('minimatch');

    for (const physicalPath of allFiles) {
      const virtualPath = this.getVirtualPath(physicalPath);

      if (minimatch.minimatch(virtualPath, pattern)) {
        const stats = fs.statSync(physicalPath);
        infos.push({
          path: virtualPath,
          is_dir: false,
          size: stats.size,
          modified_at: stats.mtime.toISOString(),
        });
      }
    }

    // Sort by modification time (newest first)
    infos.sort((a, b) => {
      const timeA = new Date(a.modified_at || 0).getTime();
      const timeB = new Date(b.modified_at || 0).getTime();
      return timeB - timeA;
    });

    return infos;
  }

  /**
   * Get the current namespace.
   */
  getNamespace(): string {
    return this.namespace;
  }

  /**
   * Get the physical storage directory for this namespace.
   */
  getStorageDirectory(): string {
    return this.namespaceDir;
  }
}
