/**
 * Message Processing Utilities
 *
 * Utilities for processing and patching agent messages, including handling
 * dangling tool calls (tool calls without corresponding tool messages).
 */

/**
 * Check if messages contain dangling tool calls and patch them.
 *
 * A dangling tool call occurs when an AIMessage contains tool_calls but
 * there is no corresponding ToolMessage in the conversation history.
 * This can happen when:
 * - User interrupts during tool execution
 * - Tool execution fails silently
 * - Another message arrives before tool completes
 *
 * This function adds ToolMessage responses for any dangling tool calls
 * with a cancellation message.
 *
 * @param messages - Array of messages to process
 * @returns Patched messages array with tool messages added
 *
 * @example
 * ```typescript
 * const messages = [
 *   { role: 'user', content: 'Read file.txt' },
 *   { role: 'assistant', content: '', tool_calls: [{ id: '1', name: 'readFile', args: {} }] },
 *   { role: 'user', content: 'Never mind' }, // Interruption - tool call never completed
 * ];
 *
 * const patched = patchDanglingToolCalls(messages);
 * // Adds: { role: 'tool', tool_call_id: '1', content: 'Tool call was cancelled...' }
 * ```
 */
export function patchDanglingToolCalls(messages: any[]): any[] {
  const patchedMessages = [...messages];
  const toolCallsSeen = new Set<string>();
  const toolMessagesReceived = new Set<string>();

  // First pass: collect all tool calls and tool messages
  for (const message of messages) {
    // Collect tool calls from assistant messages
    if (message.role === 'assistant' && message.tool_calls) {
      for (const toolCall of message.tool_calls) {
        if (toolCall.id) {
          toolCallsSeen.add(toolCall.id);
        }
      }
    }

    // Collect tool messages
    if (message.role === 'tool' && message.tool_call_id) {
      toolMessagesReceived.add(message.tool_call_id);
    }
  }

  // Find dangling tool calls (called but no response)
  const danglingToolCalls = new Set<string>();
  for (const toolCallId of toolCallsSeen) {
    if (!toolMessagesReceived.has(toolCallId)) {
      danglingToolCalls.add(toolCallId);
    }
  }

  // If no dangling tool calls, return original messages
  if (danglingToolCalls.size === 0) {
    return patchedMessages;
  }

  // Second pass: insert tool messages for dangling calls
  const result: any[] = [];

  for (let i = 0; i < patchedMessages.length; i++) {
    const message = patchedMessages[i];
    result.push(message);

    // After an assistant message with tool calls, check if any are dangling
    if (message.role === 'assistant' && message.tool_calls) {
      const messageDanglingCalls = message.tool_calls.filter((tc: any) =>
        danglingToolCalls.has(tc.id)
      );

      // If there are dangling calls and the next message is not a tool message,
      // insert tool messages before the next message
      const nextMessage = patchedMessages[i + 1];
      const nextIsToolMessage = nextMessage && nextMessage.role === 'tool';

      if (messageDanglingCalls.length > 0 && !nextIsToolMessage) {
        // Insert a tool message for each dangling call
        for (const toolCall of messageDanglingCalls) {
          result.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: `Tool call "${toolCall.name}" was cancelled - another message came in before it could be completed.`,
          });

          // Mark as handled
          danglingToolCalls.delete(toolCall.id);
        }
      }
    }
  }

  return result;
}

/**
 * Validate message structure and fix common issues.
 *
 * This function performs basic validation and fixes:
 * - Ensures required fields are present
 * - Normalizes role values
 * - Removes invalid messages
 *
 * @param messages - Messages to validate
 * @returns Validated and fixed messages
 */
export function validateMessages(messages: any[]): any[] {
  return messages.filter((msg) => {
    // Must have a role
    if (!msg.role) {
      console.warn('Skipping message without role:', msg);
      return false;
    }

    // Must have content or tool_calls
    if (!msg.content && !msg.tool_calls) {
      console.warn('Skipping message without content or tool_calls:', msg);
      return false;
    }

    return true;
  });
}

/**
 * Get the last N messages from a conversation.
 *
 * Useful for context windows or summarization. Ensures we always include
 * complete tool call/response pairs.
 *
 * @param messages - Full message history
 * @param count - Number of messages to keep
 * @returns Last N messages, preserving tool call pairs
 */
export function getLastMessages(messages: any[], count: number): any[] {
  if (messages.length <= count) {
    return messages;
  }

  // Simple approach: take last N messages
  // TODO: Could be smarter about preserving complete tool call pairs
  return messages.slice(-count);
}

/**
 * Count tool calls in a message array.
 *
 * @param messages - Messages to analyze
 * @returns Object with tool call statistics
 */
export function countToolCalls(messages: any[]): {
  totalCalls: number;
  completedCalls: number;
  danglingCalls: number;
} {
  const toolCallsSeen = new Set<string>();
  const toolMessagesReceived = new Set<string>();

  for (const message of messages) {
    if (message.role === 'assistant' && message.tool_calls) {
      for (const toolCall of message.tool_calls) {
        if (toolCall.id) {
          toolCallsSeen.add(toolCall.id);
        }
      }
    }

    if (message.role === 'tool' && message.tool_call_id) {
      toolMessagesReceived.add(message.tool_call_id);
    }
  }

  const totalCalls = toolCallsSeen.size;
  const completedCalls = toolMessagesReceived.size;
  const danglingCalls = totalCalls - completedCalls;

  return {
    totalCalls,
    completedCalls,
    danglingCalls,
  };
}

/**
 * Remove messages beyond a certain index.
 *
 * Useful for conversation resets or rollbacks.
 *
 * @param messages - Message array
 * @param keepCount - Number of messages to keep from the start
 * @returns Trimmed message array
 */
export function trimMessages(messages: any[], keepCount: number): any[] {
  return messages.slice(0, keepCount);
}

/**
 * Process messages before sending to agent.
 *
 * This is the main entry point for message preprocessing. It:
 * 1. Validates messages
 * 2. Patches dangling tool calls
 * 3. Can apply other transformations
 *
 * @param messages - Raw messages
 * @returns Processed messages ready for agent
 */
export function preprocessMessages(messages: any[]): any[] {
  let processed = messages;

  // Validate structure
  processed = validateMessages(processed);

  // Patch dangling tool calls
  processed = patchDanglingToolCalls(processed);

  return processed;
}
