/**
 * FileData creation and manipulation utilities.
 */

import type { FileData } from '../types/backend.js';
import { formatContentWithLineNumbers, checkEmptyContent } from './formatting.js';

/**
 * Convert FileData to plain string content.
 *
 * @param fileData - FileData object with 'content' array
 * @returns Content as string with lines joined by newlines
 */
export function fileDataToString(fileData: FileData): string {
  return fileData.content.join('\n');
}

/**
 * Create a FileData object with timestamps.
 *
 * @param content - File content as string
 * @param createdAt - Optional creation timestamp (ISO format)
 * @returns FileData object with content and timestamps
 */
export function createFileData(content: string, createdAt?: string): FileData {
  const lines = content.split('\n');
  const now = new Date().toISOString();

  return {
    content: lines,
    created_at: createdAt || now,
    modified_at: now,
  };
}

/**
 * Update FileData with new content, preserving creation timestamp.
 *
 * @param fileData - Existing FileData object
 * @param content - New content as string
 * @returns Updated FileData object
 */
export function updateFileData(fileData: FileData, content: string): FileData {
  const lines = content.split('\n');
  const now = new Date().toISOString();

  return {
    content: lines,
    created_at: fileData.created_at,
    modified_at: now,
  };
}

/**
 * Format file data for read response with line numbers.
 *
 * @param fileData - FileData object
 * @param offset - Line offset (0-indexed)
 * @param limit - Maximum number of lines
 * @returns Formatted content or error message
 */
export function formatReadResponse(
  fileData: FileData,
  offset: number,
  limit: number
): string {
  const content = fileDataToString(fileData);
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
}
