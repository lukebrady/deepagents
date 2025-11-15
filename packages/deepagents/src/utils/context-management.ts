/**
 * Context Management Utilities
 *
 * Utilities for managing conversation context, including token counting,
 * message summarization, and context window management.
 *
 * This provides similar functionality to Python's SummarizationMiddleware,
 * adapted for the Mastra/TypeScript environment.
 */

/**
 * Configuration for context management.
 */
export interface ContextConfig {
  /**
   * Maximum tokens before triggering summarization.
   * Python default: 170,000 tokens
   */
  maxTokensBeforeSummary?: number;

  /**
   * Number of recent messages to keep after summarization.
   * Python default: 6 messages
   */
  messagesToKeep?: number;

  /**
   * Character-to-token ratio for estimation.
   * Default: 4 characters ≈ 1 token (rough estimate)
   */
  charsPerToken?: number;
}

const DEFAULT_CONFIG: Required<ContextConfig> = {
  maxTokensBeforeSummary: 170_000,
  messagesToKeep: 6,
  charsPerToken: 4,
};

/**
 * Estimate token count from text.
 *
 * Uses a simple character-based heuristic:
 * - ~4 characters per token (average for English text)
 * - This is a rough estimate; actual tokenization varies by model
 *
 * For more accurate counts, integrate a proper tokenizer like:
 * - tiktoken (OpenAI)
 * - @anthropic-ai/tokenizer (Anthropic)
 *
 * @param text - Text to estimate tokens for
 * @param charsPerToken - Characters per token ratio
 * @returns Estimated token count
 */
export function estimateTokenCount(text: string, charsPerToken: number = 4): number {
  return Math.ceil(text.length / charsPerToken);
}

/**
 * Count tokens in a single message.
 *
 * @param message - Message object
 * @param charsPerToken - Characters per token ratio
 * @returns Estimated token count
 */
export function countMessageTokens(message: any, charsPerToken: number = 4): number {
  let tokens = 0;

  // Count content
  if (message.content) {
    tokens += estimateTokenCount(message.content, charsPerToken);
  }

  // Count tool calls
  if (message.tool_calls) {
    const toolCallsJson = JSON.stringify(message.tool_calls);
    tokens += estimateTokenCount(toolCallsJson, charsPerToken);
  }

  // Count tool call ID
  if (message.tool_call_id) {
    tokens += estimateTokenCount(message.tool_call_id, charsPerToken);
  }

  // Add overhead for message structure (~50 tokens per message)
  tokens += 50;

  return tokens;
}

/**
 * Count total tokens in a message array.
 *
 * @param messages - Messages to count
 * @param charsPerToken - Characters per token ratio
 * @returns Total estimated token count
 */
export function countTotalTokens(messages: any[], charsPerToken: number = 4): number {
  return messages.reduce((total, msg) => total + countMessageTokens(msg, charsPerToken), 0);
}

/**
 * Check if messages exceed token limit.
 *
 * @param messages - Messages to check
 * @param maxTokens - Maximum allowed tokens
 * @param charsPerToken - Characters per token ratio
 * @returns Whether messages exceed limit
 */
export function exceedsTokenLimit(
  messages: any[],
  maxTokens: number,
  charsPerToken: number = 4
): boolean {
  const totalTokens = countTotalTokens(messages, charsPerToken);
  return totalTokens > maxTokens;
}

/**
 * Truncate messages to stay within token limit.
 *
 * This is a simple strategy that keeps the most recent messages.
 * Python's SummarizationMiddleware is smarter and actually summarizes
 * old messages using an LLM.
 *
 * @param messages - Messages to truncate
 * @param config - Context configuration
 * @returns Truncated messages array
 */
export function truncateMessages(
  messages: any[],
  config: ContextConfig = {}
): {
  messages: any[];
  truncated: boolean;
  tokensRemoved: number;
} {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };
  const { maxTokensBeforeSummary, messagesToKeep, charsPerToken } = fullConfig;

  const totalTokens = countTotalTokens(messages, charsPerToken);

  if (totalTokens <= maxTokensBeforeSummary) {
    return {
      messages,
      truncated: false,
      tokensRemoved: 0,
    };
  }

  // Keep the last N messages
  const truncated = messages.slice(-messagesToKeep);
  const removedTokens = totalTokens - countTotalTokens(truncated, charsPerToken);

  return {
    messages: truncated,
    truncated: true,
    tokensRemoved: removedTokens,
  };
}

/**
 * Manage context by applying summarization strategies.
 *
 * This is the main entry point for context management. Currently implements
 * simple truncation, but can be extended with actual summarization.
 *
 * Future enhancement: Integrate LLM-based summarization
 * - Send old messages to summarization agent
 * - Replace old messages with summary
 * - Keep recent messages for context
 *
 * @param messages - Message history
 * @param config - Context configuration
 * @returns Managed messages array with metadata
 */
export function manageContext(
  messages: any[],
  config: ContextConfig = {}
): {
  messages: any[];
  truncated: boolean;
  tokensRemoved: number;
  totalTokens: number;
  action: 'none' | 'truncate' | 'summarize';
} {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };
  const totalTokens = countTotalTokens(messages, fullConfig.charsPerToken);

  if (totalTokens <= fullConfig.maxTokensBeforeSummary) {
    return {
      messages,
      truncated: false,
      tokensRemoved: 0,
      totalTokens,
      action: 'none',
    };
  }

  // For now, use simple truncation
  // TODO: Implement LLM-based summarization for better context preservation
  const result = truncateMessages(messages, config);

  return {
    messages: result.messages,
    truncated: result.truncated,
    tokensRemoved: result.tokensRemoved,
    totalTokens: countTotalTokens(result.messages, fullConfig.charsPerToken),
    action: 'truncate',
  };
}

/**
 * Get context statistics for a message array.
 *
 * Useful for debugging and monitoring context usage.
 *
 * @param messages - Messages to analyze
 * @param config - Context configuration
 * @returns Statistics object
 */
export function getContextStats(
  messages: any[],
  config: ContextConfig = {}
): {
  messageCount: number;
  totalTokens: number;
  averageTokensPerMessage: number;
  exceedsLimit: boolean;
  percentOfLimit: number;
} {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };
  const totalTokens = countTotalTokens(messages, fullConfig.charsPerToken);

  return {
    messageCount: messages.length,
    totalTokens,
    averageTokensPerMessage: messages.length > 0 ? totalTokens / messages.length : 0,
    exceedsLimit: totalTokens > fullConfig.maxTokensBeforeSummary,
    percentOfLimit: (totalTokens / fullConfig.maxTokensBeforeSummary) * 100,
  };
}

/**
 * Format context stats as a human-readable string.
 *
 * @param messages - Messages to analyze
 * @param config - Context configuration
 * @returns Formatted stats string
 */
export function formatContextStats(messages: any[], config: ContextConfig = {}): string {
  const stats = getContextStats(messages, config);

  const lines = [
    `Messages: ${stats.messageCount}`,
    `Total Tokens: ${stats.totalTokens.toLocaleString()} (~${stats.percentOfLimit.toFixed(1)}% of limit)`,
    `Average: ${stats.averageTokensPerMessage.toFixed(0)} tokens/message`,
  ];

  if (stats.exceedsLimit) {
    lines.push(`⚠️  Context exceeds limit!`);
  }

  return lines.join('\n');
}

/**
 * Create a summary message placeholder.
 *
 * This can be used to mark where summarization occurred.
 * The actual summary content should be generated by an LLM.
 *
 * @param removedMessageCount - Number of messages that were summarized
 * @param tokensRemoved - Tokens that were summarized
 * @returns Summary message object
 */
export function createSummaryMessage(
  removedMessageCount: number,
  tokensRemoved: number
): any {
  return {
    role: 'system',
    content: `[Context Summary: ${removedMessageCount} messages (~${tokensRemoved.toLocaleString()} tokens) were summarized to preserve context window]`,
  };
}
