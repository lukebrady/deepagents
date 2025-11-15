/**
 * String replacement utilities for file editing.
 */

/**
 * Result of string replacement operation.
 */
export interface ReplacementResult {
  /** New content after replacement */
  newContent: string;
  /** Number of occurrences replaced */
  occurrences: number;
}

/**
 * Perform string replacement with occurrence validation.
 *
 * @param content - Original content
 * @param oldString - String to replace
 * @param newString - Replacement string
 * @param replaceAll - Whether to replace all occurrences
 * @returns ReplacementResult on success, or error message string
 *
 * @example
 * ```typescript
 * performStringReplacement("hello world", "world", "typescript", false)
 * // Returns: { newContent: "hello typescript", occurrences: 1 }
 *
 * performStringReplacement("a a a", "a", "b", false)
 * // Returns error string (multiple occurrences without replaceAll)
 * ```
 */
export function performStringReplacement(
  content: string,
  oldString: string,
  newString: string,
  replaceAll: boolean
): ReplacementResult | string {
  // Count occurrences manually to match all instances
  let occurrences = 0;
  let pos = 0;

  while ((pos = content.indexOf(oldString, pos)) !== -1) {
    occurrences++;
    pos += oldString.length;
  }

  if (occurrences === 0) {
    return `Error: String not found in file: '${oldString}'`;
  }

  if (occurrences > 1 && !replaceAll) {
    return `Error: String '${oldString}' appears ${occurrences} times in file. Use replace_all=true to replace all instances, or provide a more specific string with surrounding context.`;
  }

  // Perform replacement
  const newContent = replaceAll
    ? content.split(oldString).join(newString)
    : content.replace(oldString, newString);

  return {
    newContent,
    occurrences,
  };
}
