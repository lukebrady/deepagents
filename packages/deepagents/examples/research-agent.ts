/**
 * Research Agent Example
 *
 * This example demonstrates creating a specialized research agent that uses
 * subagents for parallel research tasks.
 */

import { createDeepAgent, StateBackend } from '@deepagents/core';
import type { SubAgent } from '@deepagents/core';

async function main() {
  console.log('Creating a research agent with custom subagents...\n');

  // Define custom subagents for different research tasks
  const subagents: SubAgent[] = [
    {
      name: 'fact-finder',
      description: 'Research and gather factual information on a specific topic',
      system_prompt: `You are a thorough researcher focused on finding accurate, verifiable facts.

Your goal is to:
1. Identify key facts and data points
2. Organize information clearly
3. Return a concise summary with the most important findings`,
      tools: {}, // Would inherit filesystem tools
    },
    {
      name: 'analyzer',
      description: 'Analyze data and identify patterns or insights',
      system_prompt: `You are an analytical assistant focused on finding patterns and insights.

Your goal is to:
1. Analyze the provided information
2. Identify key patterns or trends
3. Draw meaningful conclusions
4. Return actionable insights`,
      tools: {},
    },
  ];

  const agent = createDeepAgent({
    model: 'claude-sonnet-4-5-20250929',
    backend: new StateBackend(),
    subagents,
    system_prompt: `You are a research coordinator with access to specialized research subagents.

When conducting research:
1. Break down complex topics into focused research tasks
2. Use the 'fact-finder' subagent to gather information
3. Use the 'analyzer' subagent to analyze findings
4. Synthesize results into a comprehensive report

Use the task tool to delegate work to subagents for parallel processing.`,
  });

  console.log('Research agent created! Starting research task...\n');

  // Ask the agent to conduct research using subagents
  const response = await agent.generate({
    messages: [
      {
        role: 'user',
        content: `Research the history and impact of TypeScript in web development.

Use your subagents to:
1. Gather facts about TypeScript's creation and evolution
2. Analyze its impact on the JavaScript ecosystem
3. Provide a comprehensive summary with key insights`,
      },
    ],
  });

  console.log('Research Results:\n');
  console.log(response.text);
  console.log('\nResearch complete!');
}

// Run the example
main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
