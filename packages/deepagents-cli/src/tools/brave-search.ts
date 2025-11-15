/**
 * Brave Search API tool.
 */

import mastraCore from '@mastra/core';
const { createTool } = mastraCore;
import { z } from 'zod';

export interface BraveSearchConfig {
  apiKey?: string;
}

/**
 * Create a Brave Search tool.
 */
export function createBraveSearchTool(config: BraveSearchConfig = {}) {
  return createTool({
    id: 'web_search',
    description: `Search the web for information using Brave Search API.

Use this tool when you need to:
- Find current information or recent events
- Look up facts, statistics, or data
- Research topics or questions
- Get real-time information
- Find news articles or blog posts

The tool returns relevant web results with titles, URLs, and content snippets.
Brave Search provides privacy-focused, unbiased search results.`,
    inputSchema: z.object({
      query: z.string().describe('The search query'),
      count: z.number().int().min(1).max(20).default(10).describe('Number of results to return'),
      search_lang: z.string().default('en').describe('Search language (e.g., en, es, fr)'),
    }),
    outputSchema: z.object({
      results: z.array(z.object({
        title: z.string(),
        url: z.string(),
        description: z.string(),
        age: z.string().optional(),
      })),
      query: z.string(),
      total: z.number().optional(),
    }),
    execute: async ({ context }) => {
      const { query, count, search_lang } = context;
      const apiKey = config.apiKey || process.env.BRAVE_SEARCH_API_KEY;

      if (!apiKey) {
        throw new Error('Brave Search API key not configured. Set BRAVE_SEARCH_API_KEY environment variable.');
      }

      // Call Brave Search API
      const url = new URL('https://api.search.brave.com/res/v1/web/search');
      url.searchParams.set('q', query);
      url.searchParams.set('count', count.toString());
      url.searchParams.set('search_lang', search_lang);

      const response = await fetch(url.toString(), {
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip',
          'X-Subscription-Token': apiKey,
        },
      });

      if (!response.ok) {
        throw new Error(`Brave Search API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      // Format results from web results
      const results = (data.web?.results || []).map((result: any) => ({
        title: result.title,
        url: result.url,
        description: result.description,
        age: result.age,
      }));

      return {
        results,
        query,
        total: data.web?.results?.length || 0,
      };
    },
  });
}
