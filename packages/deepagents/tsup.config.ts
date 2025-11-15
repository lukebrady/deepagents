import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'backends/index': 'src/backends/index.ts',
    'tools/index': 'src/tools/index.ts',
  },
  format: ['esm'],
  dts: false, // Disabled temporarily due to Mastra type export issues
  sourcemap: true,
  clean: true,
  splitting: false,
  treeshake: true,
  minify: false,
  external: ['@mastra/core', '@ai-sdk/anthropic', '@ai-sdk/openai'],
});
