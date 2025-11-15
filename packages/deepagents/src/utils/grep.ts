/**
 * Grep utilities for searching file contents.
 */

import { minimatch } from 'minimatch';
import type { FileData, GrepMatch } from '../types/backend.js';
import { validatePath } from './path-validation.js';

/**
 * Return structured grep matches from an in-memory files mapping.
 *
 * @param files - Dictionary of file paths to FileData
 * @param pattern - Regular expression pattern to search for
 * @param path - Base path to search from (optional)
 * @param glob - Glob pattern to filter files (optional)
 * @returns Array of GrepMatch objects or error string for invalid input
 */
export function grepMatchesFromFiles(
  files: Record<string, FileData>,
  pattern: string,
  path?: string | null,
  glob?: string | null
): GrepMatch[] | string {
  // Try to compile the regex pattern
  let regex: RegExp;
  try {
    regex = new RegExp(pattern);
  } catch (e) {
    return `Invalid regex pattern: ${e instanceof Error ? e.message : String(e)}`;
  }

  // Validate and normalize the path
  let normalizedPath: string;
  try {
    normalizedPath = validatePath(path);
  } catch {
    return [];
  }

  // Filter files by path
  let filtered = Object.entries(files).filter(([fp]) => fp.startsWith(normalizedPath));

  // Filter by glob pattern if provided
  if (glob) {
    filtered = filtered.filter(([fp]) => {
      const filename = fp.split('/').pop() ?? '';
      return minimatch(filename, glob, { nocase: false });
    });
  }

  // Search for matches
  const matches: GrepMatch[] = [];

  for (const [filePath, fileData] of filtered) {
    for (let lineNum = 0; lineNum < fileData.content.length; lineNum++) {
      const line = fileData.content[lineNum] ?? '';
      if (regex.test(line)) {
        matches.push({
          path: filePath,
          line: lineNum + 1, // 1-indexed
          text: line,
        });
      }
    }
  }

  return matches;
}

/**
 * Search files for glob pattern matches.
 *
 * @param files - Dictionary of file paths to FileData
 * @param pattern - Glob pattern to match
 * @param path - Base path to search from
 * @returns Array of matching file paths sorted by modification time, or empty array
 */
export function globSearchFiles(
  files: Record<string, FileData>,
  pattern: string,
  path: string = '/'
): string[] {
  let normalizedPath: string;
  try {
    normalizedPath = validatePath(path);
  } catch {
    return [];
  }

  const filtered = Object.entries(files).filter(([fp]) => fp.startsWith(normalizedPath));

  const matches: Array<[string, string]> = [];

  for (const [filePath, fileData] of filtered) {
    const relative = filePath.slice(normalizedPath.length).replace(/^\//, '');
    if (!relative) {
      continue;
    }

    // Use minimatch with globstar support
    if (minimatch(relative, pattern, { dot: true })) {
      matches.push([filePath, fileData.modified_at]);
    }
  }

  // Sort by modification time (most recent first)
  matches.sort((a, b) => b[1].localeCompare(a[1]));

  return matches.map(([fp]) => fp);
}
