/**
 * Configuration loader for Deep Agents CLI.
 */

import { readFileSync, existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { config as loadEnv } from 'dotenv';
import { ConfigSchema, type Config } from '../types/config.js';

/**
 * Load configuration from file and environment.
 */
export function loadConfig(): Config {
  // Load .env file
  loadEnv();

  // Try to load config from ~/.deepagentsrc or .deepagentsrc
  const possiblePaths = [
    join(process.cwd(), '.deepagentsrc.json'),
    join(homedir(), '.deepagentsrc.json'),
    join(homedir(), '.config', 'deepagents', 'config.json'),
  ];

  let fileConfig: Partial<Config> = {};

  for (const path of possiblePaths) {
    if (existsSync(path)) {
      try {
        const content = readFileSync(path, 'utf-8');
        fileConfig = JSON.parse(content);
        break;
      } catch (error) {
        console.warn(`Warning: Failed to parse config file at ${path}`);
      }
    }
  }

  // Merge with environment variables
  const envConfig: Partial<Config> = {
    model: process.env.DEEPAGENTS_MODEL,
    verbose: process.env.DEEPAGENTS_VERBOSE === 'true',
    apiKeys: {
      anthropic: process.env.ANTHROPIC_API_KEY,
      openai: process.env.OPENAI_API_KEY,
      xai: process.env.XAI_API_KEY,
      tavily: process.env.TAVILY_API_KEY,
    },
  };

  // Merge configs (env > file > defaults)
  const merged = {
    ...fileConfig,
    ...Object.fromEntries(
      Object.entries(envConfig).filter(([, v]) => v !== undefined)
    ),
  };

  // Validate and return
  return ConfigSchema.parse(merged);
}

/**
 * Get API key for a provider.
 */
export function getApiKey(provider: 'anthropic' | 'openai' | 'xai' | 'tavily', config: Config): string | undefined {
  return config.apiKeys[provider];
}
