/**
 * Session state types for the CLI.
 */

import type { Agent } from '@mastra/core';
import type { BackendProtocol } from '@deepagents/core';

/**
 * Message in the conversation.
 */
export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

/**
 * CLI session state.
 */
export interface Session {
  /** Current agent */
  agent: Agent | null;

  /** Agent backend */
  backend: BackendProtocol | null;

  /** Conversation history */
  messages: Message[];

  /** Current agent name */
  agentName: string;

  /** Total tokens used */
  tokensUsed: number;

  /** Session start time */
  startTime: Date;
}

/**
 * File operation record.
 */
export interface FileOperation {
  type: 'read' | 'write' | 'edit' | 'delete';
  path: string;
  timestamp: Date;
  preview?: string;
}
