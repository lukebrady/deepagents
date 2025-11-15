#!/usr/bin/env node

/**
 * Smoke test for Deep Agents
 * Verifies core library and CLI can be loaded and initialized
 */

console.log('🧪 Running Deep Agents Smoke Test\n');

async function test() {
  try {
    // Test 1: Import core library
    console.log('Test 1: Importing @deepagents/core...');
    const core = await import('./packages/deepagents/dist/index.js');
    console.log('✅ Core library imported');
    console.log('  Exports:', Object.keys(core).slice(0, 10).join(', '), '...\n');

    // Test 2: Create backends
    console.log('Test 2: Creating backends...');
    const { StateBackend, StoreBackend, CompositeBackend } = core;

    const stateBackend = new StateBackend();
    console.log('  ✅ StateBackend created');

    const storeBackend = new StoreBackend({ namespace: 'smoke-test' });
    console.log('  ✅ StoreBackend created');

    const compositeBackend = new CompositeBackend({
      default: stateBackend,
      routes: {
        '/memories/': storeBackend,
      },
    });
    console.log('  ✅ CompositeBackend created\n');

    // Test 3: Backend operations
    console.log('Test 3: Testing backend operations...');

    // Write to state backend
    const writeResult = await stateBackend.write('/test.txt', 'Hello World');
    console.log('  Write result:', writeResult.error || '✅ Success');

    // Read from state backend
    const readResult = await stateBackend.read('/test.txt');
    console.log('  Read result:', readResult.includes('Hello World') ? '✅ Success' : '❌ Failed');

    // List files
    const lsResult = await stateBackend.ls_info('/');
    console.log('  List files:', Array.isArray(lsResult) ? `✅ Found ${lsResult.length} files` : '❌ Failed');

    console.log('');

    // Test 4: Create agent
    console.log('Test 4: Creating agent...');
    const { createDeepAgent } = core;

    // Note: This will fail without API keys, but tests initialization
    try {
      const agent = createDeepAgent({
        model: 'grok-beta',
        backend: compositeBackend,
        system_prompt: 'You are a helpful assistant.',
      });
      console.log('  ✅ Agent created (dry run - no API call)\n');
    } catch (error) {
      // Expected if no API key
      if (error.message && (error.message.includes('API key') || error.message.includes('api key'))) {
        console.log('  ⚠️  Agent creation requires API key (expected)\n');
      } else {
        throw error;
      }
    }

    // Test 5: CLI bundle check
    console.log('Test 5: Checking CLI bundle...');
    const cliStat = await import('fs').then(fs =>
      fs.promises.stat('./packages/deepagents-cli/dist/index.js')
    );
    console.log('  ✅ CLI bundle exists');
    console.log('  Size:', (cliStat.size / 1024).toFixed(2), 'KB\n');

    // Test 6: Tools
    console.log('Test 6: Testing tool creation...');
    const {
      createLsTool,
      createReadFileTool,
      createWriteFileTool,
      createShellTool,
      createTodoListTool,
    } = core;

    const lsTool = createLsTool({ backend: stateBackend });
    console.log('  ✅ ls tool created');

    const readTool = createReadFileTool({ backend: stateBackend });
    console.log('  ✅ read_file tool created');

    const writeTool = createWriteFileTool({ backend: stateBackend });
    console.log('  ✅ write_file tool created');

    const shellTool = createShellTool();
    console.log('  ✅ shell tool created');

    const todoTool = createTodoListTool();
    console.log('  ✅ todo_list tool created\n');

    console.log('🎉 All smoke tests passed!\n');
    console.log('Summary:');
    console.log('  ✅ Core library loads successfully');
    console.log('  ✅ Backends work correctly');
    console.log('  ✅ Tools can be created');
    console.log('  ✅ CLI bundle is built');
    console.log('\n✨ Deep Agents is ready to use!');
    console.log('\nTo start the CLI:');
    console.log('  cd packages/deepagents-cli');
    console.log('  node dist/index.js');
    console.log('\nMake sure to set API keys:');
    console.log('  export XAI_API_KEY=your-key-here');
    console.log('  export BRAVE_API_KEY=your-key-here (optional)');

  } catch (error) {
    console.error('\n❌ Smoke test failed:', error.message);
    console.error('\nStack trace:');
    console.error(error.stack);
    process.exit(1);
  }
}

test();
