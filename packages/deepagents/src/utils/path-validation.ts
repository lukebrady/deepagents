/**
 * Path validation and normalization utilities.
 */

/**
 * Sanitize tool_call_id to prevent path traversal and separator issues.
 *
 * Replaces dangerous characters (., /, \) with underscores.
 *
 * @param toolCallId - Tool call ID to sanitize
 * @returns Sanitized tool call ID
 */
export function sanitizeToolCallId(toolCallId: string): string {
  return toolCallId.replace(/\./g, '_').replace(/\//g, '_').replace(/\\/g, '_');
}

/**
 * Validate and normalize a path.
 *
 * @param path - Path to validate (null or undefined treated as "/")
 * @returns Normalized path starting and ending with /
 * @throws {Error} If path is invalid
 */
export function validatePath(path?: string | null): string {
  const effectivePath = path || '/';

  if (!effectivePath || effectivePath.trim() === '') {
    throw new Error('Path cannot be empty');
  }

  let normalized = effectivePath.startsWith('/') ? effectivePath : '/' + effectivePath;

  if (!normalized.endsWith('/')) {
    normalized += '/';
  }

  return normalized;
}

/**
 * Normalize a file path to start with /.
 *
 * @param path - File path to normalize
 * @returns Normalized file path
 */
export function normalizeFilePath(path: string): string {
  return path.startsWith('/') ? path : '/' + path;
}
