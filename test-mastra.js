#!/usr/bin/env node

async function test() {
  console.log('Testing Mastra imports...\n');

  const mastraCore = (await import('@mastra/core')).default;

  console.log('mastraCore type:', typeof mastraCore);
  console.log('mastraCore keys:', mastraCore ? Object.keys(mastraCore).slice(0, 20) : 'null/undefined');
  console.log('\nmastraCore.createTool:', typeof mastraCore?.createTool);
  console.log('mastraCore.Agent:', typeof mastraCore?.Agent);

  // Try destructuring
  try {
    const { createTool, Agent } = mastraCore;
    console.log('\n✅ Destructuring works!');
    console.log('createTool:', typeof createTool);
    console.log('Agent:', typeof Agent);
  } catch (error) {
    console.error('\n❌ Destructuring failed:', error.message);
  }
}

test();
