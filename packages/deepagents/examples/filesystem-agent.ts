/**
 * Filesystem Agent Example
 *
 * This example demonstrates using a Deep Agent with disk-based file storage
 * for persisting files to the actual filesystem.
 */

import { createDeepAgent, FilesystemBackend, CompositeBackend, StateBackend } from '@deepagents/core';
import * as path from 'path';

async function main() {
  console.log('Creating a Deep Agent with filesystem backend...\n');

  // Create a composite backend that routes to different storage locations
  const backend = new CompositeBackend({
    // Default: in-memory storage
    default: new StateBackend(),

    // /workspace routes to disk
    routes: {
      '/workspace/': new FilesystemBackend({
        rootDir: path.join(process.cwd(), 'workspace'),
        virtualMode: true, // Sandboxed to rootDir
      }),
    },
  });

  const agent = createDeepAgent({
    model: 'sonnet', // Shorthand for claude-sonnet-4-5-20250929
    backend,
    system_prompt: `You are a helpful coding assistant with access to file system operations.

When creating files:
- Use /workspace/ for files that should be saved to disk
- Use / for temporary files in memory

Always read files before editing them to ensure accuracy.`,
  });

  console.log('Agent created! Now creating a TypeScript project...\n');

  // Ask the agent to create a small TypeScript project
  const response = await agent.generate({
    messages: [
      {
        role: 'user',
        content: `Create a simple TypeScript project in /workspace/ with:
1. A package.json file
2. A tsconfig.json file
3. A src/index.ts file with a main function
4. A README.md explaining the project

Keep it minimal but functional.`,
      },
    ],
  });

  console.log('Response:', response.text);
  console.log('\nProject created in ./workspace directory!');
}

// Run the example
main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
