/**
 * HTTP request tool for making API calls.
 */

import mastraCore from '@mastra/core';
const { createTool } = mastraCore;
import { z } from 'zod';

/**
 * Create an HTTP request tool.
 */
export function createHttpRequestTool() {
  return createTool({
    id: 'http_request',
    description: `Make HTTP requests to APIs and web services.

Use this tool when you need to:
- Call REST APIs
- Fetch data from web services
- POST data to endpoints
- Interact with HTTP-based services

Supports GET, POST, PUT, DELETE, PATCH methods with custom headers and body.`,
    inputSchema: z.object({
      url: z.string().url().describe('The URL to request'),
      method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']).default('GET').describe('HTTP method'),
      headers: z.record(z.string()).optional().describe('Request headers'),
      body: z.string().optional().describe('Request body (JSON string)'),
      timeout: z.number().int().min(1000).max(30000).default(10000).describe('Request timeout in milliseconds'),
    }),
    outputSchema: z.object({
      status: z.number(),
      statusText: z.string(),
      headers: z.record(z.string()),
      body: z.string(),
      ok: z.boolean(),
    }),
    execute: async ({ context }) => {
      const { url, method, headers, body, timeout } = context;

      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        const response = await fetch(url, {
          method,
          headers: {
            'User-Agent': 'DeepAgents-CLI/0.1.0',
            ...headers,
          },
          body: body ? body : undefined,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Get response body
        const responseBody = await response.text();

        // Get response headers
        const responseHeaders: Record<string, string> = {};
        response.headers.forEach((value, key) => {
          responseHeaders[key] = value;
        });

        return {
          status: response.status,
          statusText: response.statusText,
          headers: responseHeaders,
          body: responseBody,
          ok: response.ok,
        };
      } catch (error) {
        clearTimeout(timeoutId);

        if (error instanceof Error && error.name === 'AbortError') {
          throw new Error(`Request timeout after ${timeout}ms`);
        }

        throw error;
      }
    },
  });
}
