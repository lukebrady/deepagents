/**
 * Example: Streaming responses with Deep Agents
 *
 * This example demonstrates how to use streaming for real-time responses.
 * Mastra's Agent class supports streaming out of the box via the stream() method.
 *
 * Run with:
 *   npx tsx examples/streaming-agent.ts
 *
 * Prerequisites:
 *   - Set ANTHROPIC_API_KEY environment variable
 */

import { createDeepAgent, StateBackend } from '../src/index.js';

async function main() {
  console.log('🌊 Creating Deep Agent with streaming support...\n');

  const agent = createDeepAgent({
    model: 'sonnet',
    backend: new StateBackend(),
  });

  console.log('💬 Streaming response to: Create a TypeScript utility file...\n');

  // Example 1: Basic streaming
  console.log('=== Streaming Output ===\n');

  const stream = await agent.stream({
    messages: [
      {
        role: 'user',
        content:
          'Create a file called /utils/string-helpers.ts with utility functions for string manipulation (capitalize, truncate, slugify). Include JSDoc comments.',
      },
    ],
  });

  // Process the stream
  for await (const chunk of stream.textStream) {
    process.stdout.write(chunk);
  }

  console.log('\n\n=== Stream Complete ===\n');

  // Example 2: Streaming with tool calls
  console.log('💬 Streaming with file operations...\n');

  const stream2 = await agent.stream({
    messages: [
      {
        role: 'user',
        content: `Read the string-helpers.ts file we just created and write a test file for it at /tests/string-helpers.test.ts using Vitest.`,
      },
    ],
  });

  console.log('=== Streaming Output ===\n');

  for await (const chunk of stream2.textStream) {
    process.stdout.write(chunk);
  }

  console.log('\n\n=== Stream Complete ===\n');

  // Example 3: Accessing full stream events
  console.log('💬 Streaming with full event access...\n');

  const stream3 = await agent.stream({
    messages: [
      {
        role: 'user',
        content: 'List all the files we created and provide a summary.',
      },
    ],
  });

  console.log('=== Full Stream Events ===\n');

  // You can also access different parts of the stream
  let textContent = '';
  let toolCalls: any[] = [];

  for await (const chunk of stream3.fullStream) {
    // Handle different event types
    if (chunk.type === 'text-delta') {
      process.stdout.write(chunk.textDelta);
      textContent += chunk.textDelta;
    } else if (chunk.type === 'tool-call') {
      toolCalls.push(chunk);
      console.log(`\n[Tool Call: ${chunk.toolName}]`);
    } else if (chunk.type === 'tool-result') {
      console.log(`[Tool Result: ${chunk.toolName} completed]`);
    }
  }

  console.log('\n\n=== Summary ===');
  console.log(`Total text length: ${textContent.length}`);
  console.log(`Tool calls made: ${toolCalls.length}`);
  console.log('\n✅ Done!\n');
}

// Run the example
main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
