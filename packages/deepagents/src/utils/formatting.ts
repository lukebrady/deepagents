/**
 * Content formatting utilities for file operations.
 */

import { MAX_LINE_LENGTH, LINE_NUMBER_WIDTH, EMPTY_CONTENT_WARNING } from './constants.js';

/**
 * Format file content with line numbers (cat -n style).
 *
 * Chunks lines longer than MAX_LINE_LENGTH with continuation markers (e.g., 5.1, 5.2).
 *
 * @param content - File content as string or array of lines
 * @param startLine - Starting line number (default: 1)
 * @returns Formatted content with line numbers and continuation markers
 *
 * @example
 * ```typescript
 * formatContentWithLineNumbers("line1\nline2", 1)
 * // Returns: "     1\tline1\n     2\tline2"
 * ```
 */
export function formatContentWithLineNumbers(
  content: string | string[],
  startLine: number = 1
): string {
  let lines: string[];

  if (typeof content === 'string') {
    lines = content.split('\n');
    // Remove trailing empty line if present
    if (lines.length > 0 && lines[lines.length - 1] === '') {
      lines = lines.slice(0, -1);
    }
  } else {
    lines = content;
  }

  const resultLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? '';
    const lineNum = i + startLine;

    if (line.length <= MAX_LINE_LENGTH) {
      resultLines.push(`${lineNum.toString().padStart(LINE_NUMBER_WIDTH)}\t${line}`);
    } else {
      // Split long line into chunks with continuation markers
      const numChunks = Math.ceil(line.length / MAX_LINE_LENGTH);
      for (let chunkIdx = 0; chunkIdx < numChunks; chunkIdx++) {
        const start = chunkIdx * MAX_LINE_LENGTH;
        const end = Math.min(start + MAX_LINE_LENGTH, line.length);
        const chunk = line.slice(start, end);

        if (chunkIdx === 0) {
          // First chunk: use normal line number
          resultLines.push(`${lineNum.toString().padStart(LINE_NUMBER_WIDTH)}\t${chunk}`);
        } else {
          // Continuation chunks: use decimal notation (e.g., 5.1, 5.2)
          const continuationMarker = `${lineNum}.${chunkIdx}`;
          resultLines.push(
            `${continuationMarker.padStart(LINE_NUMBER_WIDTH)}\t${chunk}`
          );
        }
      }
    }
  }

  return resultLines.join('\n');
}

/**
 * Check if content is empty and return warning message.
 *
 * @param content - Content to check
 * @returns Warning message if empty, undefined otherwise
 */
export function checkEmptyContent(content: string): string | undefined {
  if (!content || content.trim() === '') {
    return EMPTY_CONTENT_WARNING;
  }
  return undefined;
}

/**
 * Truncate list or string result if it exceeds token limit.
 *
 * Rough estimate: 4 chars/token
 *
 * @param result - Result to potentially truncate
 * @returns Truncated result if too long, otherwise original
 */
export function truncateIfTooLong<T extends string[] | string>(result: T): T | string[] | string {
  const charLimit = 80000; // TOOL_RESULT_TOKEN_LIMIT * 4

  if (Array.isArray(result)) {
    const totalChars = result.reduce((sum, item) => sum + item.length, 0);
    if (totalChars > charLimit) {
      const targetLength = Math.floor((result.length * charLimit) / totalChars);
      return [...result.slice(0, targetLength), '... [results truncated]'];
    }
    return result;
  }

  // String result
  if (result.length > charLimit) {
    return result.slice(0, charLimit) + '\n... [results truncated]';
  }

  return result;
}
