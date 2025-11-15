/**
 * Agent Memory System
 *
 * Provides long-term memory capabilities for agents by loading and injecting
 * the agent.md file from /memories/ into the system prompt.
 *
 * This enables agents to maintain persistent knowledge about user preferences,
 * project context, and learned behaviors across sessions.
 */

import type { BackendProtocol } from '@deepagents/core';

export interface AgentMemoryConfig {
  /**
   * Backend to use for reading memory files (should support /memories/ path)
   */
  backend: BackendProtocol;

  /**
   * Path to the agent memory file
   * Default: '/memories/agent.md'
   */
  memoryPath?: string;

  /**
   * Whether to create a default agent.md if it doesn't exist
   * Default: true
   */
  createDefault?: boolean;
}

/**
 * Default agent.md content providing initial guidance
 */
const DEFAULT_AGENT_MEMORY = `# Agent Memory

You are a helpful AI assistant with access to powerful tools and long-term memory.

## Your Capabilities

- File system operations (read, write, edit, search)
- Task planning and management
- Spawning subagents for complex work
- Persistent memory across conversations

## User Preferences

(This section will be updated based on user interactions)

## Project Context

(This section will be updated as you learn about the projects you're working on)

## Learning Notes

(Keep track of important patterns, preferences, and decisions here)
`;

/**
 * Memory system instructions to be added to the system prompt
 */
const MEMORY_SYSTEM_INSTRUCTIONS = `

## Long-term Memory System

Your system prompt is loaded from {memory_path} at startup.
You can update your own instructions by editing this file.

### When to CHECK memories:
- At the start of ANY new session
- BEFORE answering questions
- When the user asks about past work
- If you're unsure about preferences or context

### When to UPDATE memories:
- User describes their role, preferences, or project context → Update immediately
- User gives feedback → Capture WHY and update agent.md
- User says "remember X" → Update memories IMMEDIATELY
- You learn important patterns → Document in agent.md

### Learning Pattern:
1. **User describes role/preferences** → Write to agent.md
2. **User gives feedback** → Capture the reasoning and update
3. **User says "remember X"** → Update memories right away
4. **Important decisions made** → Document for future reference

### Memory File Structure:
- Use Markdown for organization
- Keep sections clear and scannable
- Update incrementally as you learn
- Remove outdated information

The {memory_path} file persists across all conversations.
`;

/**
 * Load agent memory from the backend and format it for injection
 */
export async function loadAgentMemory(
  config: AgentMemoryConfig
): Promise<string> {
  const memoryPath = config.memoryPath || '/memories/agent.md';
  const createDefault = config.createDefault ?? true;

  try {
    // Try to read the agent memory file
    const content = await config.backend.read(memoryPath);

    // Check if it's an error (file not found)
    if (content.startsWith('Error:')) {
      if (createDefault) {
        // Create default agent.md
        await config.backend.write(memoryPath, DEFAULT_AGENT_MEMORY);
        return DEFAULT_AGENT_MEMORY;
      }
      return '';
    }

    // Remove line numbers from the read response
    // The read response comes with line numbers like "   1\tContent"
    const lines = content.split('\n');
    const cleanedLines = lines
      .map((line) => {
        // Match the line number format: spaces + number + tab
        const match = line.match(/^\s*\d+\t(.*)$/);
        return match ? match[1] : line;
      })
      .join('\n');

    return cleanedLines;
  } catch (error) {
    console.error('Failed to load agent memory:', error);
    return '';
  }
}

/**
 * Build the complete system prompt with agent memory injected
 */
export function buildSystemPromptWithMemory(
  basePrompt: string,
  agentMemory: string,
  memoryPath: string = '/memories/agent.md'
): string {
  if (!agentMemory) {
    // No memory loaded, just add the instructions
    return (
      basePrompt +
      MEMORY_SYSTEM_INSTRUCTIONS.replace(/{memory_path}/g, memoryPath)
    );
  }

  // Inject memory content with XML tags for clear delineation
  const memorySection = `

<agent_memory>
${agentMemory}
</agent_memory>
`;

  const instructions = MEMORY_SYSTEM_INSTRUCTIONS.replace(
    /{memory_path}/g,
    memoryPath
  );

  return basePrompt + memorySection + instructions;
}

/**
 * Complete agent memory system: load and inject into system prompt
 */
export async function enhancePromptWithMemory(
  basePrompt: string,
  config: AgentMemoryConfig
): Promise<string> {
  const memoryPath = config.memoryPath || '/memories/agent.md';
  const agentMemory = await loadAgentMemory(config);
  return buildSystemPromptWithMemory(basePrompt, agentMemory, memoryPath);
}

/**
 * Check if a backend supports persistent storage
 * (This is useful for determining if memory features should be enabled)
 */
export function supportsMemory(backend: BackendProtocol): boolean {
  // Check if the backend has a getNamespace method (StoreBackend-specific)
  return typeof (backend as any).getNamespace === 'function';
}
