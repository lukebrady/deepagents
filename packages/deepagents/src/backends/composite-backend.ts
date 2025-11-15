/**
 * CompositeBackend: Route operations to different backends based on path prefix.
 *
 * This backend enables hybrid storage strategies by routing file operations
 * to different backends based on the file path. For example:
 * - /workspace/ → FilesystemBackend
 * - /memories/ → StoreBackend (persistent)
 * - / (default) → StateBackend (ephemeral)
 */

import type {
  BackendProtocol,
  EditResult,
  FileInfo,
  GrepMatch,
  WriteResult,
} from '../types/backend.js';

/**
 * Backend that routes operations to different backends based on path prefix.
 *
 * Routes are checked in order of length (longest first) for correct prefix matching.
 *
 * @example
 * ```typescript
 * const backend = new CompositeBackend({
 *   default: new StateBackend(),
 *   routes: {
 *     '/workspace/': new FilesystemBackend({ rootDir: './workspace' }),
 *     '/memories/': new StoreBackend(),
 *   }
 * });
 *
 * // Routes to FilesystemBackend
 * await backend.write('/workspace/file.txt', 'content');
 *
 * // Routes to StoreBackend
 * await backend.write('/memories/note.txt', 'note');
 *
 * // Routes to default StateBackend
 * await backend.write('/temp.txt', 'temp');
 * ```
 */
export class CompositeBackend implements BackendProtocol {
  private readonly defaultBackend: BackendProtocol;
  private readonly routes: Record<string, BackendProtocol>;
  private readonly sortedRoutes: Array<[string, BackendProtocol]>;

  /**
   * Create a CompositeBackend with routing configuration.
   *
   * @param config - Configuration object
   * @param config.default - Default backend for non-routed paths
   * @param config.routes - Map of path prefixes to backends (e.g., { '/memories/': storeBackend })
   */
  constructor(config: { default: BackendProtocol; routes: Record<string, BackendProtocol> }) {
    this.defaultBackend = config.default;
    this.routes = config.routes;

    // Sort routes by length (longest first) for correct prefix matching
    this.sortedRoutes = Object.entries(this.routes).sort(
      ([a], [b]) => b.length - a.length
    );
  }

  /**
   * Determine which backend handles this key and strip prefix.
   *
   * @param key - Original file path
   * @returns Tuple of [backend, strippedKey] where strippedKey has the route
   *          prefix removed (but keeps leading slash)
   */
  private getBackendAndKey(key: string): [BackendProtocol, string] {
    // Check routes in order of length (longest first)
    for (const [prefix, backend] of this.sortedRoutes) {
      if (key.startsWith(prefix)) {
        // Strip full prefix and ensure a leading slash remains
        // e.g., "/memories/notes.txt" → "/notes.txt"; "/memories/" → "/"
        const suffix = key.slice(prefix.length);
        const strippedKey = suffix ? '/' + suffix : '/';
        return [backend, strippedKey];
      }
    }

    return [this.defaultBackend, key];
  }

  /**
   * List files and directories in the specified directory (non-recursive).
   *
   * @param path - Absolute path to directory
   * @returns List of FileInfo objects with route prefixes added
   */
  async ls_info(path: string): Promise<FileInfo[]> {
    // Check if path matches a specific route
    for (const [routePrefix, backend] of this.sortedRoutes) {
      const cleanRoutePrefix = routePrefix.replace(/\/$/, '');
      if (path.startsWith(cleanRoutePrefix)) {
        // Query only the matching routed backend
        const suffix = path.slice(routePrefix.length);
        const searchPath = suffix ? '/' + suffix : '/';
        const infos = await backend.ls_info(searchPath);

        // Add route prefix to all paths
        return infos.map((fi) => ({
          ...fi,
          path: routePrefix.replace(/\/$/, '') + fi.path,
        }));
      }
    }

    // At root, aggregate default and all routed backends
    if (path === '/') {
      const results: FileInfo[] = [];

      // Add files from default backend
      results.push(...(await this.defaultBackend.ls_info(path)));

      // Add route directories themselves
      for (const [routePrefix] of this.sortedRoutes) {
        results.push({
          path: routePrefix,
          is_dir: true,
          size: 0,
          modified_at: '',
        });
      }

      // Sort by path
      results.sort((a, b) => a.path.localeCompare(b.path));
      return results;
    }

    // Path doesn't match a route: query only default backend
    return this.defaultBackend.ls_info(path);
  }

  /**
   * Read file content, routing to appropriate backend.
   *
   * @param file_path - Absolute file path
   * @param offset - Line offset to start reading from (0-indexed)
   * @param limit - Maximum number of lines to read
   * @returns Formatted file content with line numbers, or error message
   */
  async read(file_path: string, offset?: number, limit?: number): Promise<string> {
    const [backend, strippedKey] = this.getBackendAndKey(file_path);
    return backend.read(strippedKey, offset, limit);
  }

  /**
   * Create a new file, routing to appropriate backend.
   *
   * @param file_path - Absolute file path
   * @param content - File content as a string
   * @returns WriteResult; error populated on failure
   */
  async write(file_path: string, content: string): Promise<WriteResult> {
    const [backend, strippedKey] = this.getBackendAndKey(file_path);
    return backend.write(strippedKey, content);
  }

  /**
   * Edit a file, routing to appropriate backend.
   *
   * @param file_path - Absolute file path
   * @param old_string - String to find and replace
   * @param new_string - Replacement string
   * @param replace_all - If true, replace all occurrences
   * @returns EditResult with operation details
   */
  async edit(
    file_path: string,
    old_string: string,
    new_string: string,
    replace_all?: boolean
  ): Promise<EditResult> {
    const [backend, strippedKey] = this.getBackendAndKey(file_path);
    return backend.edit(strippedKey, old_string, new_string, replace_all);
  }

  /**
   * Search file contents for regex pattern.
   *
   * @param pattern - Regular expression pattern to search for
   * @param path - Directory path to search in (optional)
   * @param glob - Glob pattern to filter files (optional)
   * @returns Array of GrepMatch objects or error string
   */
  async grep_raw(
    pattern: string,
    path?: string | null,
    glob?: string | null
  ): Promise<GrepMatch[] | string> {
    // If path targets a specific route, search only that backend
    for (const [routePrefix, backend] of this.sortedRoutes) {
      const cleanRoutePrefix = routePrefix.replace(/\/$/, '');
      if (path && path.startsWith(cleanRoutePrefix)) {
        const searchPath = path.slice(routePrefix.length - 1);
        const raw = await backend.grep_raw(pattern, searchPath || '/', glob);

        if (typeof raw === 'string') {
          return raw;
        }

        // Add route prefix to all paths
        return raw.map((m) => ({
          ...m,
          path: routePrefix.replace(/\/$/, '') + m.path,
        }));
      }
    }

    // Otherwise, search default and all routed backends and merge
    const allMatches: GrepMatch[] = [];

    // Search default backend
    const rawDefault = await this.defaultBackend.grep_raw(pattern, path, glob);
    if (typeof rawDefault === 'string') {
      return rawDefault; // Error
    }
    allMatches.push(...rawDefault);

    // Search all routed backends
    for (const [routePrefix, backend] of Object.entries(this.routes)) {
      const raw = await backend.grep_raw(pattern, '/', glob);
      if (typeof raw === 'string') {
        return raw; // Error
      }

      // Add route prefix to all paths
      allMatches.push(
        ...raw.map((m) => ({
          ...m,
          path: routePrefix.replace(/\/$/, '') + m.path,
        }))
      );
    }

    return allMatches;
  }

  /**
   * Find files matching glob pattern.
   *
   * @param pattern - Glob pattern to match
   * @param path - Directory path to search in
   * @returns Array of FileInfo objects
   */
  async glob_info(pattern: string, path: string = '/'): Promise<FileInfo[]> {
    const results: FileInfo[] = [];

    // Route based on path, not pattern
    for (const [routePrefix, backend] of this.sortedRoutes) {
      const cleanRoutePrefix = routePrefix.replace(/\/$/, '');
      if (path.startsWith(cleanRoutePrefix)) {
        const searchPath = path.slice(routePrefix.length - 1);
        const infos = await backend.glob_info(pattern, searchPath || '/');

        return infos.map((fi) => ({
          ...fi,
          path: routePrefix.replace(/\/$/, '') + fi.path,
        }));
      }
    }

    // Path doesn't match any specific route - search default backend AND all routed backends
    results.push(...(await this.defaultBackend.glob_info(pattern, path)));

    for (const [routePrefix, backend] of Object.entries(this.routes)) {
      const infos = await backend.glob_info(pattern, '/');
      results.push(
        ...infos.map((fi) => ({
          ...fi,
          path: routePrefix.replace(/\/$/, '') + fi.path,
        }))
      );
    }

    // Deterministic ordering
    results.sort((a, b) => a.path.localeCompare(b.path));
    return results;
  }
}
