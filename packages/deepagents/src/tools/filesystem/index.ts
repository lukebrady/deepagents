/**
 * Filesystem tools for Mastra agents.
 *
 * These tools provide file system operations (read, write, edit, search, etc.)
 * using a pluggable backend system.
 */

import { createTool } from '@mastra/core';
import { z } from 'zod';
import type { BackendProtocol } from '../../types/backend.js';

/**
 * Create an 'ls' tool for listing files and directories.
 *
 * @param backend - Backend to use for file operations
 * @returns Mastra tool for listing files
 */
export function createLsTool(backend: BackendProtocol) {
  return createTool({
    id: 'ls',
    description:
      'List files and directories in the specified path. Returns file names, types (file/directory), sizes, and modification times.',
    inputSchema: z.object({
      path: z
        .string()
        .default('/')
        .describe('Directory path to list. Defaults to root (/)'),
    }),
    outputSchema: z.object({
      files: z.array(
        z.object({
          path: z.string().describe('File or directory path'),
          is_dir: z.boolean().optional().describe('Whether this is a directory'),
          size: z.number().optional().describe('File size in bytes'),
          modified_at: z.string().optional().describe('Last modified timestamp (ISO)'),
        })
      ),
    }),
    execute: async ({ context }) => {
      const { path } = context;
      const files = await backend.ls_info(path);
      return { files };
    },
  });
}

/**
 * Create a 'readFile' tool for reading file contents.
 *
 * @param backend - Backend to use for file operations
 * @returns Mastra tool for reading files
 */
export function createReadFileTool(backend: BackendProtocol) {
  return createTool({
    id: 'readFile',
    description:
      'Read the contents of a file with line numbers. Supports reading a subset of lines using offset and limit parameters.',
    inputSchema: z.object({
      file_path: z.string().describe('Absolute path to the file to read'),
      offset: z
        .number()
        .int()
        .min(0)
        .optional()
        .default(0)
        .describe('Line number to start reading from (0-indexed)'),
      limit: z
        .number()
        .int()
        .min(1)
        .optional()
        .default(2000)
        .describe('Maximum number of lines to read'),
    }),
    outputSchema: z.object({
      content: z.string().describe('File contents with line numbers, or error message'),
    }),
    execute: async ({ context }) => {
      const { file_path, offset, limit } = context;
      const content = await backend.read(file_path, offset, limit);
      return { content };
    },
  });
}

/**
 * Create a 'writeFile' tool for creating new files.
 *
 * @param backend - Backend to use for file operations
 * @returns Mastra tool for writing files
 */
export function createWriteFileTool(backend: BackendProtocol) {
  return createTool({
    id: 'writeFile',
    description:
      'Create a new file with the specified content. Will fail if the file already exists. Parent directories are created automatically if needed.',
    inputSchema: z.object({
      file_path: z.string().describe('Absolute path where the file should be created'),
      content: z.string().describe('Content to write to the file'),
    }),
    outputSchema: z.object({
      success: z.boolean().describe('Whether the operation succeeded'),
      path: z.string().optional().describe('Path of the created file'),
      error: z.string().optional().describe('Error message if operation failed'),
    }),
    execute: async ({ context }) => {
      const { file_path, content } = context;
      const result = await backend.write(file_path, content);

      if (result.error) {
        return { success: false, error: result.error };
      }

      return { success: true, path: result.path };
    },
  });
}

/**
 * Create an 'editFile' tool for modifying existing files.
 *
 * @param backend - Backend to use for file operations
 * @returns Mastra tool for editing files
 */
export function createEditFileTool(backend: BackendProtocol) {
  return createTool({
    id: 'editFile',
    description:
      'Edit an existing file by replacing string occurrences. The old_string must match exactly (including whitespace and indentation). If the string appears multiple times, use replace_all=true or provide more surrounding context.',
    inputSchema: z.object({
      file_path: z.string().describe('Absolute path to the file to edit'),
      old_string: z.string().describe('Exact string to search for and replace'),
      new_string: z.string().describe('String to replace with'),
      replace_all: z
        .boolean()
        .optional()
        .default(false)
        .describe(
          'If true, replace all occurrences. If false, will error if multiple matches found'
        ),
    }),
    outputSchema: z.object({
      success: z.boolean().describe('Whether the operation succeeded'),
      path: z.string().optional().describe('Path of the edited file'),
      occurrences: z.number().optional().describe('Number of replacements made'),
      error: z.string().optional().describe('Error message if operation failed'),
    }),
    execute: async ({ context }) => {
      const { file_path, old_string, new_string, replace_all } = context;
      const result = await backend.edit(file_path, old_string, new_string, replace_all);

      if (result.error) {
        return { success: false, error: result.error };
      }

      return { success: true, path: result.path, occurrences: result.occurrences };
    },
  });
}

/**
 * Create a 'grepSearch' tool for searching file contents.
 *
 * @param backend - Backend to use for file operations
 * @returns Mastra tool for searching files
 */
export function createGrepSearchTool(backend: BackendProtocol) {
  return createTool({
    id: 'grepSearch',
    description:
      'Search file contents using a regular expression pattern. Returns matching lines with file paths and line numbers. Optionally filter by glob pattern (e.g., "*.ts").',
    inputSchema: z.object({
      pattern: z.string().describe('Regular expression pattern to search for'),
      path: z
        .string()
        .optional()
        .nullable()
        .describe('Directory path to search in (default: all files)'),
      glob: z
        .string()
        .optional()
        .nullable()
        .describe('Glob pattern to filter files (e.g., "*.py", "*.ts")'),
    }),
    outputSchema: z.object({
      matches: z
        .array(
          z.object({
            path: z.string().describe('File path where match was found'),
            line: z.number().describe('Line number (1-indexed)'),
            text: z.string().describe('Matching line content'),
          })
        )
        .optional()
        .describe('Array of matches'),
      error: z.string().optional().describe('Error message if search failed'),
    }),
    execute: async ({ context }) => {
      const { pattern, path, glob } = context;
      const result = await backend.grep_raw(pattern, path, glob);

      if (typeof result === 'string') {
        return { error: result };
      }

      return { matches: result };
    },
  });
}

/**
 * Create a 'globSearch' tool for finding files by pattern.
 *
 * @param backend - Backend to use for file operations
 * @returns Mastra tool for pattern matching
 */
export function createGlobSearchTool(backend: BackendProtocol) {
  return createTool({
    id: 'globSearch',
    description:
      'Find files matching a glob pattern. Supports wildcards (* and **) for flexible pattern matching. Use ** for recursive directory matching.',
    inputSchema: z.object({
      pattern: z
        .string()
        .describe(
          'Glob pattern to match files (e.g., "*.ts", "**/*.py", "src/**/*.tsx")'
        ),
      path: z
        .string()
        .optional()
        .default('/')
        .describe('Directory to search in (default: root)'),
    }),
    outputSchema: z.object({
      files: z.array(
        z.object({
          path: z.string().describe('File path'),
          is_dir: z.boolean().optional().describe('Whether this is a directory'),
          size: z.number().optional().describe('File size in bytes'),
          modified_at: z.string().optional().describe('Last modified timestamp (ISO)'),
        })
      ),
    }),
    execute: async ({ context }) => {
      const { pattern, path } = context;
      const files = await backend.glob_info(pattern, path);
      return { files };
    },
  });
}

/**
 * Create all filesystem tools as a collection.
 *
 * @param backend - Backend to use for file operations
 * @returns Object containing all filesystem tools
 */
export function createFilesystemTools(backend: BackendProtocol) {
  return {
    ls: createLsTool(backend),
    readFile: createReadFileTool(backend),
    writeFile: createWriteFileTool(backend),
    editFile: createEditFileTool(backend),
    grepSearch: createGrepSearchTool(backend),
    globSearch: createGlobSearchTool(backend),
  };
}
