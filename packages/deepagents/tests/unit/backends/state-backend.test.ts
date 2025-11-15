/**
 * Tests for StateBackend
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { StateBackend } from '../../../src/backends/state-backend.js';

describe('StateBackend', () => {
  let backend: StateBackend;

  beforeEach(() => {
    backend = new StateBackend();
  });

  describe('write', () => {
    it('should create a new file', async () => {
      const result = await backend.write('/test.txt', 'Hello World');

      expect(result.error).toBeUndefined();
      expect(result.path).toBe('/test.txt');
      expect(result.filesUpdate).toBeDefined();
    });

    it('should not overwrite existing file', async () => {
      await backend.write('/test.txt', 'First');
      const result = await backend.write('/test.txt', 'Second');

      expect(result.error).toContain('already exists');
      expect(result.path).toBeUndefined();
    });
  });

  describe('read', () => {
    it('should read file content with line numbers', async () => {
      await backend.write('/test.txt', 'Line 1\nLine 2\nLine 3');
      const content = await backend.read('/test.txt');

      expect(content).toContain('1\tLine 1');
      expect(content).toContain('2\tLine 2');
      expect(content).toContain('3\tLine 3');
    });

    it('should return error for non-existent file', async () => {
      const content = await backend.read('/nonexistent.txt');

      expect(content).toContain('Error');
      expect(content).toContain('not found');
    });

    it('should support offset and limit', async () => {
      await backend.write('/test.txt', 'Line 1\nLine 2\nLine 3\nLine 4');
      const content = await backend.read('/test.txt', 1, 2);

      expect(content).toContain('2\tLine 2');
      expect(content).toContain('3\tLine 3');
      expect(content).not.toContain('Line 1');
      expect(content).not.toContain('Line 4');
    });
  });

  describe('edit', () => {
    it('should replace single occurrence', async () => {
      await backend.write('/test.txt', 'Hello World');
      const result = await backend.edit('/test.txt', 'World', 'TypeScript', false);

      expect(result.error).toBeUndefined();
      expect(result.path).toBe('/test.txt');
      expect(result.occurrences).toBe(1);

      const content = await backend.read('/test.txt');
      expect(content).toContain('Hello TypeScript');
    });

    it('should require replace_all for multiple occurrences', async () => {
      await backend.write('/test.txt', 'a a a');
      const result = await backend.edit('/test.txt', 'a', 'b', false);

      expect(result.error).toContain('appears 3 times');
    });

    it('should replace all occurrences when replace_all is true', async () => {
      await backend.write('/test.txt', 'a a a');
      const result = await backend.edit('/test.txt', 'a', 'b', true);

      expect(result.error).toBeUndefined();
      expect(result.occurrences).toBe(3);

      const content = await backend.read('/test.txt');
      expect(content).toContain('b b b');
    });

    it('should return error for non-existent file', async () => {
      const result = await backend.edit('/nonexistent.txt', 'a', 'b');

      expect(result.error).toContain('not found');
    });

    it('should return error if string not found', async () => {
      await backend.write('/test.txt', 'Hello World');
      const result = await backend.edit('/test.txt', 'Missing', 'Found');

      expect(result.error).toContain('not found');
    });
  });

  describe('ls_info', () => {
    it('should list files in root directory', async () => {
      await backend.write('/file1.txt', 'content1');
      await backend.write('/file2.txt', 'content2');

      const infos = await backend.ls_info('/');

      expect(infos).toHaveLength(2);
      expect(infos[0]?.path).toBe('/file1.txt');
      expect(infos[0]?.is_dir).toBe(false);
      expect(infos[1]?.path).toBe('/file2.txt');
    });

    it('should list files and directories', async () => {
      await backend.write('/file.txt', 'content');
      await backend.write('/subdir/nested.txt', 'nested');

      const infos = await backend.ls_info('/');

      expect(infos).toHaveLength(2);
      const fileInfo = infos.find((i) => i.path === '/file.txt');
      const dirInfo = infos.find((i) => i.path === '/subdir/');

      expect(fileInfo?.is_dir).toBe(false);
      expect(dirInfo?.is_dir).toBe(true);
    });

    it('should list files in subdirectory', async () => {
      await backend.write('/dir/file1.txt', 'content1');
      await backend.write('/dir/file2.txt', 'content2');
      await backend.write('/other.txt', 'other');

      const infos = await backend.ls_info('/dir/');

      expect(infos).toHaveLength(2);
      expect(infos.every((i) => i.path.startsWith('/dir/'))).toBe(true);
    });
  });

  describe('grep_raw', () => {
    beforeEach(async () => {
      await backend.write('/file1.py', 'import os\nprint("hello")');
      await backend.write('/file2.py', 'import sys\nprint("world")');
      await backend.write('/file3.txt', 'no imports here');
    });

    it('should find matches across files', async () => {
      const result = await backend.grep_raw('import');

      expect(Array.isArray(result)).toBe(true);
      if (Array.isArray(result)) {
        expect(result.length).toBeGreaterThan(0);
        expect(result.some((m) => m.path === '/file1.py')).toBe(true);
        expect(result.some((m) => m.path === '/file2.py')).toBe(true);
      }
    });

    it('should filter by glob pattern', async () => {
      const result = await backend.grep_raw('import', null, '*.py');

      expect(Array.isArray(result)).toBe(true);
      if (Array.isArray(result)) {
        expect(result.every((m) => m.path.endsWith('.py'))).toBe(true);
      }
    });

    it('should return error for invalid regex', async () => {
      const result = await backend.grep_raw('[invalid');

      expect(typeof result).toBe('string');
      expect(result).toContain('Invalid regex');
    });
  });

  describe('glob_info', () => {
    beforeEach(async () => {
      await backend.write('/src/main.ts', 'content');
      await backend.write('/src/utils.ts', 'content');
      await backend.write('/test/main.test.ts', 'content');
      await backend.write('/README.md', 'content');
    });

    it('should find files matching pattern', async () => {
      const infos = await backend.glob_info('*.ts', '/src/');

      expect(infos.length).toBe(2);
      expect(infos.every((i) => i.path.endsWith('.ts'))).toBe(true);
    });

    it('should support recursive patterns', async () => {
      const infos = await backend.glob_info('**/*.ts');

      expect(infos.length).toBe(3);
      expect(infos.some((i) => i.path.includes('/src/'))).toBe(true);
      expect(infos.some((i) => i.path.includes('/test/'))).toBe(true);
    });

    it('should return empty array for no matches', async () => {
      const infos = await backend.glob_info('*.xyz');

      expect(infos).toHaveLength(0);
    });
  });
});
