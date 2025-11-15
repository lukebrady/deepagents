/**
 * FilesystemBackend: Read and write files directly from the filesystem.
 *
 * Security features:
 * - Secure path resolution with root containment when in virtual_mode (sandboxed)
 * - Prevent path traversal attacks (.., ~)
 * - Configurable file size limits
 * - Support for ripgrep with fallback to pure Node.js implementation
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { minimatch } from 'minimatch';
import { exec } from 'child_process';
import { promisify } from 'util';

import type {
  BackendProtocol,
  EditResult,
  FileInfo,
  GrepMatch,
  WriteResult,
} from '../types/backend.js';
import {
  checkEmptyContent,
  formatContentWithLineNumbers,
} from '../utils/formatting.js';
import { performStringReplacement } from '../utils/string-replacement.js';

const execAsync = promisify(exec);

/**
 * Configuration options for FilesystemBackend.
 */
export interface FilesystemBackendConfig {
  /**
   * Optional root directory for file operations.
   * If provided, all file paths will be resolved relative to this directory.
   * If not provided, uses the current working directory.
   */
  rootDir?: string;

  /**
   * Enable virtual mode (sandboxed to rootDir).
   * When true, all paths are treated as virtual paths under rootDir,
   * and path traversal (.., ~) is prevented.
   * @default false
   */
  virtualMode?: boolean;

  /**
   * Maximum file size in MB for operations.
   * @default 10
   */
  maxFileSizeMb?: number;
}

/**
 * Backend that reads and writes files directly from the filesystem.
 *
 * Files are accessed using their actual filesystem paths. Relative paths are
 * resolved relative to the root directory. Content is read/written as plain text,
 * and metadata (timestamps) are derived from filesystem stats.
 */
export class FilesystemBackend implements BackendProtocol {
  private readonly cwd: string;
  private readonly virtualMode: boolean;
  private readonly maxFileSizeBytes: number;

  constructor(config: FilesystemBackendConfig = {}) {
    this.cwd = config.rootDir ? path.resolve(config.rootDir) : process.cwd();
    this.virtualMode = config.virtualMode ?? false;
    this.maxFileSizeBytes = (config.maxFileSizeMb ?? 10) * 1024 * 1024;
  }

  /**
   * Resolve a file path with security checks.
   *
   * When virtualMode=true, treat incoming paths as virtual absolute paths under
   * this.cwd, disallow traversal (.., ~) and ensure resolved path stays within root.
   * When virtualMode=false, preserve legacy behavior: absolute paths are allowed
   * as-is; relative paths resolve under cwd.
   *
   * @param key - File path (absolute, relative, or virtual when virtualMode=true)
   * @returns Resolved absolute path
   * @throws {Error} If path traversal is detected in virtual mode
   */
  private resolvePath(key: string): string {
    if (this.virtualMode) {
      const vpath = key.startsWith('/') ? key : '/' + key;

      // Check for path traversal
      if (vpath.includes('..') || vpath.startsWith('~')) {
        throw new Error('Path traversal not allowed');
      }

      const full = path.resolve(this.cwd, vpath.slice(1));

      // Ensure path is within root directory
      if (!full.startsWith(this.cwd)) {
        throw new Error(`Path: ${full} outside root directory: ${this.cwd}`);
      }

      return full;
    }

    // Non-virtual mode
    if (path.isAbsolute(key)) {
      return key;
    }

    return path.resolve(this.cwd, key);
  }

  /**
   * Convert absolute path to virtual path (for virtual_mode).
   */
  private toVirtualPath(absolutePath: string): string {
    if (!this.virtualMode) {
      return absolutePath;
    }

    const relative = path.relative(this.cwd, absolutePath);
    return '/' + relative.replace(/\\/g, '/');
  }

  /**
   * List files and directories in the specified directory (non-recursive).
   *
   * @param dirPath - Absolute directory path to list files from
   * @returns List of FileInfo objects for files and directories
   */
  async ls_info(dirPath: string): Promise<FileInfo[]> {
    try {
      const resolvedPath = this.resolvePath(dirPath);
      const stat = await fs.stat(resolvedPath);

      if (!stat.isDirectory()) {
        return [];
      }

      const entries = await fs.readdir(resolvedPath, { withFileTypes: true });
      const results: FileInfo[] = [];

      for (const entry of entries) {
        const fullPath = path.join(resolvedPath, entry.name);

        try {
          const entryPath = this.virtualMode ? this.toVirtualPath(fullPath) : fullPath;

          if (entry.isFile()) {
            const stat = await fs.stat(fullPath);
            results.push({
              path: entryPath,
              is_dir: false,
              size: stat.size,
              modified_at: stat.mtime.toISOString(),
            });
          } else if (entry.isDirectory()) {
            const stat = await fs.stat(fullPath);
            results.push({
              path: entryPath + '/',
              is_dir: true,
              size: 0,
              modified_at: stat.mtime.toISOString(),
            });
          }
        } catch {
          // Skip entries that can't be read
          continue;
        }
      }

      // Sort by path
      results.sort((a, b) => a.path.localeCompare(b.path));

      return results;
    } catch {
      return [];
    }
  }

  /**
   * Read file content with line numbers.
   *
   * @param file_path - Absolute or relative file path
   * @param offset - Line offset to start reading from (0-indexed)
   * @param limit - Maximum number of lines to read
   * @returns Formatted file content with line numbers, or error message
   */
  async read(file_path: string, offset: number = 0, limit: number = 2000): Promise<string> {
    try {
      const resolvedPath = this.resolvePath(file_path);
      const stat = await fs.stat(resolvedPath);

      if (!stat.isFile()) {
        return `Error: File '${file_path}' not found`;
      }

      const content = await fs.readFile(resolvedPath, 'utf-8');
      const emptyMsg = checkEmptyContent(content);

      if (emptyMsg) {
        return emptyMsg;
      }

      const lines = content.split('\n');
      const startIdx = offset;
      const endIdx = Math.min(startIdx + limit, lines.length);

      if (startIdx >= lines.length) {
        return `Error: Line offset ${offset} exceeds file length (${lines.length} lines)`;
      }

      const selectedLines = lines.slice(startIdx, endIdx);
      return formatContentWithLineNumbers(selectedLines, startIdx + 1);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return `Error: File '${file_path}' not found`;
      }
      return `Error reading file '${file_path}': ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  /**
   * Create a new file with content.
   *
   * @param file_path - Path where the file should be created
   * @param content - Content to write to the file
   * @returns WriteResult; error populated on failure
   */
  async write(file_path: string, content: string): Promise<WriteResult> {
    try {
      const resolvedPath = this.resolvePath(file_path);

      // Check if file already exists
      try {
        await fs.access(resolvedPath);
        return {
          error: `Cannot write to ${file_path} because it already exists. Read and then make an edit, or write to a new path.`,
        };
      } catch {
        // File doesn't exist, which is what we want
      }

      // Create parent directories if needed
      await fs.mkdir(path.dirname(resolvedPath), { recursive: true });

      // Write the file
      await fs.writeFile(resolvedPath, content, 'utf-8');

      return {
        path: file_path,
        filesUpdate: null, // External storage
      };
    } catch (error) {
      return {
        error: `Error writing file '${file_path}': ${error instanceof Error ? error.message : String(error)}`,
      };
    }
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
    try {
      const resolvedPath = this.resolvePath(file_path);
      const stat = await fs.stat(resolvedPath);

      if (!stat.isFile()) {
        return {
          error: `Error: File '${file_path}' not found`,
        };
      }

      const content = await fs.readFile(resolvedPath, 'utf-8');
      const result = performStringReplacement(content, old_string, new_string, replace_all);

      if (typeof result === 'string') {
        return { error: result };
      }

      await fs.writeFile(resolvedPath, result.newContent, 'utf-8');

      return {
        path: file_path,
        filesUpdate: null, // External storage
        occurrences: result.occurrences,
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return {
          error: `Error: File '${file_path}' not found`,
        };
      }
      return {
        error: `Error editing file '${file_path}': ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Search file contents for regex pattern.
   *
   * @param pattern - Regular expression pattern to search for
   * @param searchPath - Directory path to search in (optional)
   * @param glob - Glob pattern to filter files (optional)
   * @returns Array of GrepMatch objects or error string
   */
  async grep_raw(
    pattern: string,
    searchPath?: string | null,
    glob?: string | null
  ): Promise<GrepMatch[] | string> {
    // Validate regex
    try {
      new RegExp(pattern);
    } catch (e) {
      return `Invalid regex pattern: ${e instanceof Error ? e.message : String(e)}`;
    }

    // Resolve base path
    let basePath: string;
    try {
      basePath = this.resolvePath(searchPath || '.');
    } catch {
      return [];
    }

    // Check if path exists
    try {
      await fs.access(basePath);
    } catch {
      return [];
    }

    // Try ripgrep first, fallback to Node.js implementation
    const results =
      (await this.ripgrepSearch(pattern, basePath, glob)) ??
      (await this.nodeSearch(pattern, basePath, glob));

    // Convert to GrepMatch array
    const matches: GrepMatch[] = [];
    for (const [filePath, items] of Object.entries(results)) {
      for (const [lineNum, lineText] of items) {
        matches.push({
          path: filePath,
          line: lineNum,
          text: lineText,
        });
      }
    }

    return matches;
  }

  /**
   * Try to use ripgrep for fast searching.
   */
  private async ripgrepSearch(
    pattern: string,
    basePath: string,
    includeGlob?: string | null
  ): Promise<Record<string, Array<[number, string]>> | null> {
    try {
      const cmd = ['rg', '--json'];
      if (includeGlob) {
        cmd.push('--glob', includeGlob);
      }
      cmd.push('--', pattern, basePath);

      const { stdout } = await execAsync(cmd.join(' '), { timeout: 30000 });
      const results: Record<string, Array<[number, string]>> = {};

      for (const line of stdout.split('\n')) {
        if (!line.trim()) continue;

        try {
          const data = JSON.parse(line);
          if (data.type !== 'match') continue;

          const pdata = data.data || {};
          const ftext = pdata.path?.text;
          if (!ftext) continue;

          const filePath = this.virtualMode ? this.toVirtualPath(path.resolve(ftext)) : ftext;
          const lineNum = pdata.line_number;
          const lineText = (pdata.lines?.text || '').replace(/\n$/, '');

          if (lineNum !== undefined) {
            if (!results[filePath]) {
              results[filePath] = [];
            }
            results[filePath]?.push([lineNum, lineText]);
          }
        } catch {
          // Skip invalid JSON lines
          continue;
        }
      }

      return results;
    } catch {
      // Ripgrep not available or failed
      return null;
    }
  }

  /**
   * Fallback pure Node.js search implementation.
   */
  private async nodeSearch(
    pattern: string,
    basePath: string,
    includeGlob?: string | null
  ): Promise<Record<string, Array<[number, string]>>> {
    const regex = new RegExp(pattern);
    const results: Record<string, Array<[number, string]>> = {};

    const searchDir = async (dir: string): Promise<void> => {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);

          if (entry.isFile()) {
            // Check glob filter
            if (includeGlob && !minimatch(entry.name, includeGlob)) {
              continue;
            }

            // Check file size
            try {
              const stat = await fs.stat(fullPath);
              if (stat.size > this.maxFileSizeBytes) {
                continue;
              }
            } catch {
              continue;
            }

            // Read and search file
            try {
              const content = await fs.readFile(fullPath, 'utf-8');
              const lines = content.split('\n');

              for (let lineNum = 0; lineNum < lines.length; lineNum++) {
                const line = lines[lineNum];
                if (line && regex.test(line)) {
                  const filePath = this.virtualMode
                    ? this.toVirtualPath(fullPath)
                    : fullPath;

                  if (!results[filePath]) {
                    results[filePath] = [];
                  }
                  results[filePath]?.push([lineNum + 1, line]);
                }
              }
            } catch {
              // Skip files that can't be read
              continue;
            }
          } else if (entry.isDirectory()) {
            // Recursively search subdirectories
            await searchDir(fullPath);
          }
        }
      } catch {
        // Skip directories that can't be read
      }
    };

    // Determine if basePath is a file or directory
    try {
      const stat = await fs.stat(basePath);
      if (stat.isDirectory()) {
        await searchDir(basePath);
      }
    } catch {
      // Path doesn't exist or can't be accessed
    }

    return results;
  }

  /**
   * Find files matching glob pattern.
   *
   * @param pattern - Glob pattern to match
   * @param searchPath - Directory path to search in
   * @returns Array of FileInfo objects
   */
  async glob_info(pattern: string, searchPath: string = '/'): Promise<FileInfo[]> {
    // Strip leading slash from pattern
    const cleanPattern = pattern.startsWith('/') ? pattern.slice(1) : pattern;

    const basePath =
      searchPath === '/' ? this.cwd : this.resolvePath(searchPath);

    try {
      const stat = await fs.stat(basePath);
      if (!stat.isDirectory()) {
        return [];
      }
    } catch {
      return [];
    }

    const results: FileInfo[] = [];

    const searchDir = async (dir: string, relativeBase: string = ''): Promise<void> => {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          const relativePath = relativeBase ? `${relativeBase}/${entry.name}` : entry.name;

          if (entry.isFile()) {
            // Check if file matches pattern
            if (minimatch(relativePath, cleanPattern, { dot: true })) {
              const displayPath = this.virtualMode
                ? this.toVirtualPath(fullPath)
                : fullPath;

              try {
                const stat = await fs.stat(fullPath);
                results.push({
                  path: displayPath,
                  is_dir: false,
                  size: stat.size,
                  modified_at: stat.mtime.toISOString(),
                });
              } catch {
                results.push({
                  path: displayPath,
                  is_dir: false,
                });
              }
            }
          } else if (entry.isDirectory()) {
            // Recursively search subdirectories
            await searchDir(fullPath, relativePath);
          }
        }
      } catch {
        // Skip directories that can't be read
      }
    };

    await searchDir(basePath);

    // Sort by path
    results.sort((a, b) => a.path.localeCompare(b.path));

    return results;
  }
}
