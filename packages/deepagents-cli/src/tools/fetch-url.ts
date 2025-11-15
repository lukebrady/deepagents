/**
 * Fetch URL tool with HTML to Markdown conversion.
 */

import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import TurndownService from 'turndown';

/**
 * Create a fetch URL tool.
 */
export function createFetchUrlTool() {
  const turndownService = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
  });

  return createTool({
    id: 'fetch_url',
    description: `Fetch and read content from a URL, converting HTML to Markdown.

Use this tool when you need to:
- Read web pages and extract their content
- Fetch documentation from websites
- Access online articles or blog posts
- Get content from public URLs

The tool automatically converts HTML to clean Markdown format for easy reading.`,
    inputSchema: z.object({
      url: z.string().url().describe('The URL to fetch'),
      raw: z.boolean().default(false).describe('Return raw HTML instead of Markdown'),
    }),
    outputSchema: z.object({
      url: z.string(),
      content: z.string(),
      contentType: z.string(),
      title: z.string().optional(),
    }),
    execute: async ({ context }) => {
      const { url, raw } = context;

      // Fetch the URL
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'DeepAgents-CLI/0.1.0',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type') || 'text/html';
      let content = await response.text();

      // Extract title if HTML
      let title: string | undefined;
      if (contentType.includes('text/html')) {
        const titleMatch = content.match(/<title[^>]*>([^<]+)<\/title>/i);
        title = titleMatch ? titleMatch[1].trim() : undefined;

        // Convert HTML to Markdown if not raw
        if (!raw) {
          content = turndownService.turndown(content);
        }
      }

      return {
        url,
        content,
        contentType,
        title,
      };
    },
  });
}
