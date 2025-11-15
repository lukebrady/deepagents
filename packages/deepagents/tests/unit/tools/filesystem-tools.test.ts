/**
 * Tests for Filesystem Tools
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { StateBackend } from '../../../src/backends/state-backend.js';
import {
  createLsTool,
  createReadFileTool,
  createWriteFileTool,
  createEditFileTool,
  createGrepSearchTool,
  createGlobSearchTool,
  createFilesystemTools,
} from '../../../src/tools/filesystem/index.js';

describe('Filesystem Tools', () => {
  let backend: StateBackend;

  beforeEach(() => {
    backend = new StateBackend();
  });

  describe('createLsTool', () => {
    it('should create a working ls tool', async () => {
      await backend.write('/file1.txt', 'content1');
      await backend.write('/file2.txt', 'content2');

      const lsTool = createLsTool(backend);
      const result = await lsTool.execute({ context: { path: '/' } });

      expect(result.files).toHaveLength(2);
      expect(result.files[0]?.path).toBe('/file1.txt');
      expect(result.files[1]?.path).toBe('/file2.txt');
    });
  });

  describe('createReadFileTool', () => {
    it('should read file contents', async () => {
      await backend.write('/test.txt', 'Line 1\nLine 2\nLine 3');

      const readTool = createReadFileTool(backend);
      const result = await readTool.execute({
        context: { file_path: '/test.txt', offset: 0, limit: 2000 },
      });

      expect(result.content).toContain('Line 1');
      expect(result.content).toContain('Line 2');
      expect(result.content).toContain('Line 3');
    });

    it('should handle non-existent files', async () => {
      const readTool = createReadFileTool(backend);
      const result = await readTool.execute({
        context: { file_path: '/nonexistent.txt', offset: 0, limit: 2000 },
      });

      expect(result.content).toContain('Error');
      expect(result.content).toContain('not found');
    });
  });

  describe('createWriteFileTool', () => {
    it('should create new files', async () => {
      const writeTool = createWriteFileTool(backend);
      const result = await writeTool.execute({
        context: { file_path: '/new.txt', content: 'Hello World' },
      });

      expect(result.success).toBe(true);
      expect(result.path).toBe('/new.txt');
      expect(result.error).toBeUndefined();

      // Verify file exists
      const content = await backend.read('/new.txt');
      expect(content).toContain('Hello World');
    });

    it('should not overwrite existing files', async () => {
      await backend.write('/existing.txt', 'original');

      const writeTool = createWriteFileTool(backend);
      const result = await writeTool.execute({
        context: { file_path: '/existing.txt', content: 'new content' },
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('already exists');
    });
  });

  describe('createEditFileTool', () => {
    it('should edit files', async () => {
      await backend.write('/test.txt', 'Hello World');

      const editTool = createEditFileTool(backend);
      const result = await editTool.execute({
        context: {
          file_path: '/test.txt',
          old_string: 'World',
          new_string: 'TypeScript',
          replace_all: false,
        },
      });

      expect(result.success).toBe(true);
      expect(result.occurrences).toBe(1);

      const content = await backend.read('/test.txt');
      expect(content).toContain('Hello TypeScript');
    });

    it('should handle multiple occurrences', async () => {
      await backend.write('/test.txt', 'a a a');

      const editTool = createEditFileTool(backend);
      const resultWithoutReplaceAll = await editTool.execute({
        context: {
          file_path: '/test.txt',
          old_string: 'a',
          new_string: 'b',
          replace_all: false,
        },
      });

      expect(resultWithoutReplaceAll.success).toBe(false);
      expect(resultWithoutReplaceAll.error).toContain('appears 3 times');

      const resultWithReplaceAll = await editTool.execute({
        context: {
          file_path: '/test.txt',
          old_string: 'a',
          new_string: 'b',
          replace_all: true,
        },
      });

      expect(resultWithReplaceAll.success).toBe(true);
      expect(resultWithReplaceAll.occurrences).toBe(3);
    });
  });

  describe('createGrepSearchTool', () => {
    beforeEach(async () => {
      await backend.write('/file1.py', 'import os\nprint("hello")');
      await backend.write('/file2.py', 'import sys\nprint("world")');
      await backend.write('/file3.txt', 'no imports here');
    });

    it('should search files', async () => {
      const grepTool = createGrepSearchTool(backend);
      const result = await grepTool.execute({
        context: { pattern: 'import', path: null, glob: null },
      });

      expect(result.error).toBeUndefined();
      expect(result.matches).toBeDefined();
      expect(result.matches?.length).toBeGreaterThan(0);
      expect(result.matches?.some((m) => m.path === '/file1.py')).toBe(true);
      expect(result.matches?.some((m) => m.path === '/file2.py')).toBe(true);
    });

    it('should filter by glob', async () => {
      const grepTool = createGrepSearchTool(backend);
      const result = await grepTool.execute({
        context: { pattern: 'import', path: null, glob: '*.py' },
      });

      expect(result.matches).toBeDefined();
      expect(result.matches?.every((m) => m.path.endsWith('.py'))).toBe(true);
    });

    it('should handle invalid regex', async () => {
      const grepTool = createGrepSearchTool(backend);
      const result = await grepTool.execute({
        context: { pattern: '[invalid', path: null, glob: null },
      });

      expect(result.error).toBeDefined();
      expect(result.error).toContain('Invalid regex');
    });
  });

  describe('createGlobSearchTool', () => {
    beforeEach(async () => {
      await backend.write('/src/main.ts', 'content');
      await backend.write('/src/utils.ts', 'content');
      await backend.write('/test/main.test.ts', 'content');
      await backend.write('/README.md', 'content');
    });

    it('should find files matching pattern', async () => {
      const globTool = createGlobSearchTool(backend);
      const result = await globTool.execute({
        context: { pattern: '*.ts', path: '/src/' },
      });

      expect(result.files.length).toBe(2);
      expect(result.files.every((f) => f.path.endsWith('.ts'))).toBe(true);
    });

    it('should support recursive patterns', async () => {
      const globTool = createGlobSearchTool(backend);
      const result = await globTool.execute({
        context: { pattern: '**/*.ts', path: '/' },
      });

      expect(result.files.length).toBe(3);
      expect(result.files.some((f) => f.path.includes('/src/'))).toBe(true);
      expect(result.files.some((f) => f.path.includes('/test/'))).toBe(true);
    });
  });

  describe('createFilesystemTools', () => {
    it('should create all tools', () => {
      const tools = createFilesystemTools(backend);

      expect(tools.ls).toBeDefined();
      expect(tools.readFile).toBeDefined();
      expect(tools.writeFile).toBeDefined();
      expect(tools.editFile).toBeDefined();
      expect(tools.grepSearch).toBeDefined();
      expect(tools.globSearch).toBeDefined();
    });

    it('should have functional tools', async () => {
      const tools = createFilesystemTools(backend);

      // Test write -> read workflow
      const writeResult = await tools.writeFile.execute({
        context: { file_path: '/test.txt', content: 'test content' },
      });
      expect(writeResult.success).toBe(true);

      const readResult = await tools.readFile.execute({
        context: { file_path: '/test.txt', offset: 0, limit: 2000 },
      });
      expect(readResult.content).toContain('test content');

      // Test ls
      const lsResult = await tools.ls.execute({ context: { path: '/' } });
      expect(lsResult.files.length).toBeGreaterThan(0);
    });
  });
});
