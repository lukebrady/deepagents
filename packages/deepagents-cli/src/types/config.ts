/**
 * Configuration types for Deep Agents CLI.
 */

import { z } from 'zod';

/**
 * CLI configuration schema.
 */
export const ConfigSchema = z.object({
  /** Default model to use */
  model: z.string().default('grok'),

  /** Default agent name */
  defaultAgent: z.string().default('default'),

  /** Enable verbose logging */
  verbose: z.boolean().default(false),

  /** Enable token tracking */
  trackTokens: z.boolean().default(true),

  /** Enable streaming responses */
  streaming: z.boolean().default(true),

  /** Theme for UI */
  theme: z.enum(['auto', 'light', 'dark']).default('auto'),

  /** Custom system prompt path */
  systemPromptPath: z.string().optional(),

  /** API keys */
  apiKeys: z.object({
    anthropic: z.string().optional(),
    openai: z.string().optional(),
    xai: z.string().optional(),
    braveSearch: z.string().optional(),
    tavily: z.string().optional(),
  }).default({}),
});

export type Config = z.infer<typeof ConfigSchema>;
