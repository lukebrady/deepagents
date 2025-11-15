/**
 * Web search tool using Tavily API.
 */

import { createTool } from '@mastra/core';
import { z } from 'zod';

export interface WebSearchConfig {
  apiKey?: string;
}

/**
 * Create a web search tool using Tavily.
 */
export function createWebSearchTool(config: WebSearchConfig = {}) {
  return createTool({
    id: 'web_search',
    description: `Search the web for information using Tavily search API.

Use this tool when you need to:
- Find current information or recent events
- Look up facts, statistics, or data
- Research topics or questions
- Get real-time information

The tool returns relevant web results with titles, URLs, and content snippets.`,
    inputSchema: z.object({
      query: z.string().describe('The search query'),
      max_results: z.number().int().min(1).max(10).default(5).describe('Maximum number of results to return'),
    }),
    outputSchema: z.object({
      results: z.array(z.object({
        title: z.string(),
        url: z.string(),
        content: z.string(),
        score: z.number().optional(),
      })),
      query: z.string(),
    }),
    execute: async ({ context }) => {
      const { query, max_results } = context;
      const apiKey = config.apiKey || process.env.TAVILY_API_KEY;

      if (!apiKey) {
        throw new Error('Tavily API key not configured. Set TAVILY_API_KEY environment variable.');
      }

      // Call Tavily API
      const response = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_key: apiKey,
          query,
          max_results,
          search_depth: 'basic',
          include_answer: false,
          include_images: false,
        }),
      });

      if (!response.ok) {
        throw new Error(`Tavily API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      // Format results
      const results = (data.results || []).map((result: any) => ({
        title: result.title,
        url: result.url,
        content: result.content,
        score: result.score,
      }));

      return {
        results,
        query,
      };
    },
  });
}
