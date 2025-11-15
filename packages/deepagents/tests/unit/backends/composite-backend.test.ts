/**
 * Tests for CompositeBackend
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CompositeBackend } from '../../../src/backends/composite-backend.js';
import { StateBackend } from '../../../src/backends/state-backend.js';

describe('CompositeBackend', () => {
  let defaultBackend: StateBackend;
  let memoryBackend: StateBackend;
  let workspaceBackend: StateBackend;
  let backend: CompositeBackend;

  beforeEach(() => {
    defaultBackend = new StateBackend();
    memoryBackend = new StateBackend();
    workspaceBackend = new StateBackend();

    backend = new CompositeBackend({
      default: defaultBackend,
      routes: {
        '/memories/': memoryBackend,
        '/workspace/': workspaceBackend,
      },
    });
  });

  describe('write and read routing', () => {
    it('should route to default backend', async () => {
      const result = await backend.write('/default.txt', 'default content');
      expect(result.error).toBeUndefined();

      const content = await backend.read('/default.txt');
      expect(content).toContain('default content');

      // Verify it's in default backend
      const defaultContent = await defaultBackend.read('/default.txt');
      expect(defaultContent).toContain('default content');
    });

    it('should route to memory backend', async () => {
      const result = await backend.write('/memories/note.txt', 'memory content');
      expect(result.error).toBeUndefined();

      const content = await backend.read('/memories/note.txt');
      expect(content).toContain('memory content');

      // Verify it's in memory backend (with stripped prefix)
      const memoryContent = await memoryBackend.read('/note.txt');
      expect(memoryContent).toContain('memory content');
    });

    it('should route to workspace backend', async () => {
      const result = await backend.write('/workspace/file.ts', 'workspace content');
      expect(result.error).toBeUndefined();

      const content = await backend.read('/workspace/file.ts');
      expect(content).toContain('workspace content');

      // Verify it's in workspace backend (with stripped prefix)
      const workspaceContent = await workspaceBackend.read('/file.ts');
      expect(workspaceContent).toContain('workspace content');
    });
  });

  describe('edit routing', () => {
    it('should route edit to correct backend', async () => {
      await backend.write('/memories/note.txt', 'old value');
      const result = await backend.edit('/memories/note.txt', 'old', 'new');

      expect(result.error).toBeUndefined();
      expect(result.occurrences).toBe(1);

      const content = await backend.read('/memories/note.txt');
      expect(content).toContain('new value');
    });
  });

  describe('ls_info', () => {
    beforeEach(async () => {
      await backend.write('/default.txt', 'content');
      await backend.write('/memories/memory.txt', 'content');
      await backend.write('/workspace/work.ts', 'content');
    });

    it('should list all routes and default files at root', async () => {
      const infos = await backend.ls_info('/');

      expect(infos.length).toBeGreaterThanOrEqual(3);

      // Should have default file
      expect(infos.some((i) => i.path === '/default.txt')).toBe(true);

      // Should have route directories
      expect(infos.some((i) => i.path === '/memories/' && i.is_dir)).toBe(true);
      expect(infos.some((i) => i.path === '/workspace/' && i.is_dir)).toBe(true);
    });

    it('should list files in routed directory', async () => {
      const infos = await backend.ls_info('/memories/');

      // Should have memory file with correct prefix
      expect(infos.some((i) => i.path === '/memories/memory.txt')).toBe(true);

      // Should not have files from other backends
      expect(infos.some((i) => i.path.includes('default'))).toBe(false);
      expect(infos.some((i) => i.path.includes('work'))).toBe(false);
    });
  });

  describe('grep_raw', () => {
    beforeEach(async () => {
      await backend.write('/file1.py', 'import os');
      await backend.write('/memories/file2.py', 'import sys');
      await backend.write('/workspace/file3.py', 'import json');
    });

    it('should search all backends when no path specified', async () => {
      const result = await backend.grep_raw('import');

      expect(Array.isArray(result)).toBe(true);
      if (Array.isArray(result)) {
        expect(result.length).toBe(3);
        expect(result.some((m) => m.path === '/file1.py')).toBe(true);
        expect(result.some((m) => m.path === '/memories/file2.py')).toBe(true);
        expect(result.some((m) => m.path === '/workspace/file3.py')).toBe(true);
      }
    });

    it('should search only routed backend when path specified', async () => {
      const result = await backend.grep_raw('import', '/memories');

      expect(Array.isArray(result)).toBe(true);
      if (Array.isArray(result)) {
        expect(result.length).toBe(1);
        expect(result[0]?.path).toBe('/memories/file2.py');
      }
    });
  });

  describe('glob_info', () => {
    beforeEach(async () => {
      await backend.write('/file1.ts', 'content');
      await backend.write('/memories/file2.ts', 'content');
      await backend.write('/workspace/file3.ts', 'content');
      await backend.write('/workspace/file4.js', 'content');
    });

    it('should search all backends when no path specified', async () => {
      const infos = await backend.glob_info('*.ts');

      expect(infos.length).toBe(3);
      expect(infos.some((i) => i.path === '/file1.ts')).toBe(true);
      expect(infos.some((i) => i.path === '/memories/file2.ts')).toBe(true);
      expect(infos.some((i) => i.path === '/workspace/file3.ts')).toBe(true);
    });

    it('should search only routed backend when path specified', async () => {
      const infos = await backend.glob_info('*.ts', '/workspace/');

      expect(infos.length).toBe(1);
      expect(infos[0]?.path).toBe('/workspace/file3.ts');
    });
  });

  describe('path prefix stripping', () => {
    it('should strip prefix correctly for nested paths', async () => {
      await backend.write('/memories/deep/nested/file.txt', 'content');

      // Verify in memory backend the path is stripped
      const memoryContent = await memoryBackend.read('/deep/nested/file.txt');
      expect(memoryContent).toContain('content');

      // Verify composite backend keeps full path
      const compositeContent = await backend.read('/memories/deep/nested/file.txt');
      expect(compositeContent).toContain('content');
    });

    it('should handle longest prefix first', async () => {
      // Create a backend with overlapping prefixes
      const longPrefixBackend = new StateBackend();
      const shortPrefixBackend = new StateBackend();

      const testBackend = new CompositeBackend({
        default: defaultBackend,
        routes: {
          '/mem/': shortPrefixBackend,
          '/mem/long/': longPrefixBackend,
        },
      });

      await testBackend.write('/mem/long/file.txt', 'long prefix');
      await testBackend.write('/mem/file.txt', 'short prefix');

      // Verify routing to longest prefix
      const longContent = await longPrefixBackend.read('/file.txt');
      expect(longContent).toContain('long prefix');

      const shortContent = await shortPrefixBackend.read('/file.txt');
      expect(shortContent).toContain('short prefix');
    });
  });
});
