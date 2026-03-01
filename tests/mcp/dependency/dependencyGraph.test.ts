import { describe, expect, it } from 'vitest';
import type { MonorepoConfig } from '../../../src/mcp/config/monorepoConfigLoader.js';
import { DependencyGraph } from '../../../src/mcp/dependency/dependencyGraph.js';

describe('DependencyGraph', () => {
  const createConfig = (submodules: Record<string, { path: string; dependencies: string[] }>): MonorepoConfig => ({
    submodules: Object.fromEntries(
      Object.entries(submodules).map(([name, { path, dependencies }]) => [
        name,
        { path, dependencies, isGitSubmodule: false },
      ]),
    ),
    cache: { directory: '.repomix-cache', enabled: true },
    repomix: { compress: true, style: 'xml', removeComments: false, showLineNumbers: true },
  });

  describe('getDirectDependencies', () => {
    it('should return direct dependencies', () => {
      const config = createConfig({
        'crate-a': { path: 'crates/a', dependencies: ['crate-b', 'crate-c'] },
        'crate-b': { path: 'crates/b', dependencies: [] },
        'crate-c': { path: 'crates/c', dependencies: [] },
      });

      const graph = new DependencyGraph(config);
      expect(graph.getDirectDependencies('crate-a')).toEqual(['crate-b', 'crate-c']);
      expect(graph.getDirectDependencies('crate-b')).toEqual([]);
    });

    it('should return empty array for unknown submodule', () => {
      const config = createConfig({
        'crate-a': { path: 'crates/a', dependencies: [] },
      });

      const graph = new DependencyGraph(config);
      expect(graph.getDirectDependencies('unknown')).toEqual([]);
    });
  });

  describe('getAllDependencies', () => {
    it('should return all transitive dependencies', () => {
      const config = createConfig({
        'crate-a': { path: 'crates/a', dependencies: ['crate-b'] },
        'crate-b': { path: 'crates/b', dependencies: ['crate-c'] },
        'crate-c': { path: 'crates/c', dependencies: [] },
      });

      const graph = new DependencyGraph(config);
      const deps = graph.getAllDependencies('crate-a');

      // Should include both b and c
      expect(deps).toContain('crate-b');
      expect(deps).toContain('crate-c');
      expect(deps).not.toContain('crate-a');
    });

    it('should handle diamond dependencies', () => {
      const config = createConfig({
        'crate-a': { path: 'crates/a', dependencies: ['crate-b', 'crate-c'] },
        'crate-b': { path: 'crates/b', dependencies: ['crate-d'] },
        'crate-c': { path: 'crates/c', dependencies: ['crate-d'] },
        'crate-d': { path: 'crates/d', dependencies: [] },
      });

      const graph = new DependencyGraph(config);
      const deps = graph.getAllDependencies('crate-a');

      expect(deps).toContain('crate-b');
      expect(deps).toContain('crate-c');
      expect(deps).toContain('crate-d');
      expect(deps.length).toBe(3);
    });
  });

  describe('getDependents', () => {
    it('should return submodules that depend on the given one', () => {
      const config = createConfig({
        'crate-a': { path: 'crates/a', dependencies: ['crate-c'] },
        'crate-b': { path: 'crates/b', dependencies: ['crate-c'] },
        'crate-c': { path: 'crates/c', dependencies: [] },
      });

      const graph = new DependencyGraph(config);
      const dependents = graph.getDependents('crate-c');

      expect(dependents).toContain('crate-a');
      expect(dependents).toContain('crate-b');
    });
  });

  describe('detectCycles', () => {
    it('should detect no cycles in acyclic graph', () => {
      const config = createConfig({
        'crate-a': { path: 'crates/a', dependencies: ['crate-b'] },
        'crate-b': { path: 'crates/b', dependencies: ['crate-c'] },
        'crate-c': { path: 'crates/c', dependencies: [] },
      });

      const graph = new DependencyGraph(config);
      expect(graph.detectCycles()).toEqual([]);
      expect(graph.hasCycles()).toBe(false);
    });

    it('should detect direct cycle', () => {
      const config = createConfig({
        'crate-a': { path: 'crates/a', dependencies: ['crate-b'] },
        'crate-b': { path: 'crates/b', dependencies: ['crate-a'] },
      });

      const graph = new DependencyGraph(config);
      expect(graph.hasCycles()).toBe(true);
      expect(graph.detectCycles().length).toBeGreaterThan(0);
    });

    it('should detect indirect cycle', () => {
      const config = createConfig({
        'crate-a': { path: 'crates/a', dependencies: ['crate-b'] },
        'crate-b': { path: 'crates/b', dependencies: ['crate-c'] },
        'crate-c': { path: 'crates/c', dependencies: ['crate-a'] },
      });

      const graph = new DependencyGraph(config);
      expect(graph.hasCycles()).toBe(true);
    });
  });

  describe('topologicalSort', () => {
    it('should return sorted list for acyclic graph', () => {
      const config = createConfig({
        'crate-a': { path: 'crates/a', dependencies: ['crate-b'] },
        'crate-b': { path: 'crates/b', dependencies: ['crate-c'] },
        'crate-c': { path: 'crates/c', dependencies: [] },
      });

      const graph = new DependencyGraph(config);
      const sorted = graph.topologicalSort();

      expect(sorted).not.toBeNull();
      if (sorted) {
        // c should come before b, b should come before a
        expect(sorted.indexOf('crate-c')).toBeLessThan(sorted.indexOf('crate-b'));
        expect(sorted.indexOf('crate-b')).toBeLessThan(sorted.indexOf('crate-a'));
      }
    });

    it('should return null for cyclic graph', () => {
      const config = createConfig({
        'crate-a': { path: 'crates/a', dependencies: ['crate-b'] },
        'crate-b': { path: 'crates/b', dependencies: ['crate-a'] },
      });

      const graph = new DependencyGraph(config);
      expect(graph.topologicalSort()).toBeNull();
    });
  });

  describe('getLeafNodes and getRootNodes', () => {
    it('should identify leaf and root nodes', () => {
      const config = createConfig({
        'crate-a': { path: 'crates/a', dependencies: ['crate-b'] },
        'crate-b': { path: 'crates/b', dependencies: ['crate-c'] },
        'crate-c': { path: 'crates/c', dependencies: [] },
      });

      const graph = new DependencyGraph(config);

      // crate-c has no dependencies, so it's a leaf
      expect(graph.getLeafNodes()).toContain('crate-c');

      // crate-a has no dependents, so it's a root
      expect(graph.getRootNodes()).toContain('crate-a');
    });
  });

  describe('getStats', () => {
    it('should return correct statistics', () => {
      const config = createConfig({
        'crate-a': { path: 'crates/a', dependencies: ['crate-b', 'crate-c'] },
        'crate-b': { path: 'crates/b', dependencies: ['crate-c'] },
        'crate-c': { path: 'crates/c', dependencies: [] },
      });

      const graph = new DependencyGraph(config);
      const stats = graph.getStats();

      expect(stats.totalNodes).toBe(3);
      expect(stats.totalEdges).toBe(3);
      expect(stats.leafNodes).toBe(1); // crate-c
      expect(stats.rootNodes).toBe(1); // crate-a
      expect(stats.maxDepth).toBe(2); // a -> b -> c
    });
  });
});
