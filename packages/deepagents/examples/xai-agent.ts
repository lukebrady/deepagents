/**
 * Example: Using X.AI's Grok model with Deep Agents
 *
 * This example demonstrates how to create a Deep Agent using X.AI's Grok models.
 * Grok models are known for their real-time information access and witty responses.
 *
 * Run with:
 *   npx tsx examples/xai-agent.ts
 *
 * Prerequisites:
 *   - Set XAI_API_KEY environment variable
 */

import { createDeepAgent, StateBackend } from '../src/index.js';

async function main() {
  console.log('🚀 Creating Deep Agent with X.AI Grok model...\n');

  // Create an agent with Grok model
  const agent = createDeepAgent({
    model: 'grok', // Shorthand for 'grok-beta'
    backend: new StateBackend(),
  });

  console.log('💬 Asking Grok to create a TypeScript utility function...\n');

  // Example 1: Create a utility function
  const response1 = await agent.generate({
    messages: [
      {
        role: 'user',
        content: `Create a file called /utils/array-helpers.ts with a function that removes duplicates from an array. Make it generic and include JSDoc comments.`,
      },
    ],
  });

  console.log('Response:', response1.text);
  console.log('\n---\n');

  // Example 2: Use Grok-2 for more complex reasoning
  console.log('🧠 Creating agent with Grok-2 for advanced reasoning...\n');

  const grok2Agent = createDeepAgent({
    model: 'grok-2', // Full model name: grok-2-1212
    backend: new StateBackend(),
  });

  const response2 = await grok2Agent.generate({
    messages: [
      {
        role: 'user',
        content: `Analyze the array-helpers.ts file we created and suggest performance optimizations. Write your analysis to /analysis/performance.md`,
      },
    ],
  });

  console.log('Response:', response2.text);
  console.log('\n---\n');

  // Example 3: Using custom model name
  console.log('⚙️ Using custom Grok model name...\n');

  const customAgent = createDeepAgent({
    model: 'grok-2-1212', // Explicit model name
    backend: new StateBackend(),
    system_prompt: `You are a helpful coding assistant powered by Grok.
You have access to file operations and can help with software development tasks.
Provide clear, concise explanations with a touch of wit.`,
  });

  const response3 = await customAgent.generate({
    messages: [
      {
        role: 'user',
        content: 'Create a README.md explaining what the array-helpers utility does and how to use it.',
      },
    ],
  });

  console.log('Response:', response3.text);
  console.log('\n✅ Done!\n');
}

// Run the example
main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
