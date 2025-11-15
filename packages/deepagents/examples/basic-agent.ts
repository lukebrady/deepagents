/**
 * Basic Deep Agent Example
 *
 * This example demonstrates the simplest way to create and use a Deep Agent
 * with in-memory file storage.
 */

import { createDeepAgent, StateBackend } from '@deepagents/core';

async function main() {
  console.log('Creating a basic Deep Agent...\n');

  // Create an agent with in-memory storage
  const agent = createDeepAgent({
    model: 'claude-sonnet-4-5-20250929',
    backend: new StateBackend(),
  });

  console.log('Agent created! Now asking it to create a file...\n');

  // Ask the agent to create a file
  const response = await agent.generate({
    messages: [
      {
        role: 'user',
        content: 'Create a file called hello.ts with a function that prints "Hello, Deep Agents!"',
      },
    ],
  });

  console.log('Response:', response.text);
  console.log('\nAgent has completed the task!');
}

// Run the example
main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
