import type { MonorepoConfig } from '../config/monorepoConfigLoader.js';

/**
 * Result of cycle detection
 */
export interface CycleInfo {
  /** Nodes forming the cycle */
  cycle: string[];
  /** Human-readable description */
  description: string;
}

/**
 * Manages dependency relationships between submodules
 */
export class DependencyGraph {
  private graph: Map<string, Set<string>>;
  private reverseGraph: Map<string, Set<string>>;

  constructor(config: MonorepoConfig) {
    this.graph = new Map();
    this.reverseGraph = new Map();

    // Build forward and reverse dependency graphs
    for (const [name, submodule] of Object.entries(config.submodules)) {
      this.graph.set(name, new Set(submodule.dependencies));

      // Initialize reverse graph entry
      if (!this.reverseGraph.has(name)) {
        this.reverseGraph.set(name, new Set());
      }

      // Build reverse edges
      for (const dep of submodule.dependencies) {
        if (!this.reverseGraph.has(dep)) {
          this.reverseGraph.set(dep, new Set());
        }
        this.reverseGraph.get(dep)?.add(name);
      }
    }
  }

  /**
   * Get direct dependencies of a submodule
   */
  getDirectDependencies(submoduleName: string): string[] {
    const deps = this.graph.get(submoduleName);
    return deps ? Array.from(deps) : [];
  }

  /**
   * Get all dependencies of a submodule (recursive)
   * Uses topological order to ensure dependencies come before dependents
   */
  getAllDependencies(submoduleName: string): string[] {
    const visited = new Set<string>();
    const result: string[] = [];

    const visit = (name: string): void => {
      if (visited.has(name)) return;
      visited.add(name);

      const deps = this.graph.get(name) || new Set();
      for (const dep of deps) {
        visit(dep);
      }

      // Add to result after visiting dependencies (topological order)
      if (name !== submoduleName) {
        result.push(name);
      }
    };

    visit(submoduleName);
    return result;
  }

  /**
   * Get submodules that depend on the given submodule (reverse dependencies)
   */
  getDependents(submoduleName: string): string[] {
    const dependents = this.reverseGraph.get(submoduleName);
    return dependents ? Array.from(dependents) : [];
  }

  /**
   * Get all dependents recursively
   */
  getAllDependents(submoduleName: string): string[] {
    const visited = new Set<string>();
    const result: string[] = [];

    const visit = (name: string): void => {
      if (visited.has(name)) return;
      visited.add(name);

      const dependents = this.reverseGraph.get(name) || new Set();
      for (const dep of dependents) {
        visit(dep);
      }

      if (name !== submoduleName) {
        result.push(name);
      }
    };

    visit(submoduleName);
    return result;
  }

  /**
   * Detect cycles in the dependency graph
   * Returns all cycles found
   */
  detectCycles(): CycleInfo[] {
    const cycles: CycleInfo[] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const dfs = (node: string, path: string[]): void => {
      visited.add(node);
      recursionStack.add(node);
      path.push(node);

      const deps = this.graph.get(node) || new Set();
      for (const dep of deps) {
        if (!visited.has(dep)) {
          dfs(dep, [...path]);
        } else if (recursionStack.has(dep)) {
          // Found a cycle
          const cycleStart = path.indexOf(dep);
          const cycle = [...path.slice(cycleStart), dep];
          cycles.push({
            cycle,
            description: `Cycle detected: ${cycle.join(' -> ')}`,
          });
        }
      }

      recursionStack.delete(node);
    };

    for (const node of this.graph.keys()) {
      if (!visited.has(node)) {
        dfs(node, []);
      }
    }

    return cycles;
  }

  /**
   * Check if the graph has any cycles
   */
  hasCycles(): boolean {
    return this.detectCycles().length > 0;
  }

  /**
   * Get topologically sorted list of all submodules
   * Returns null if graph has cycles
   */
  topologicalSort(): string[] | null {
    if (this.hasCycles()) {
      return null;
    }

    const visited = new Set<string>();
    const result: string[] = [];

    const visit = (name: string): void => {
      if (visited.has(name)) return;
      visited.add(name);

      const deps = this.graph.get(name) || new Set();
      for (const dep of deps) {
        visit(dep);
      }

      result.push(name);
    };

    for (const node of this.graph.keys()) {
      visit(node);
    }

    return result;
  }

  /**
   * Get submodules with no dependencies (leaf nodes)
   */
  getLeafNodes(): string[] {
    const leaves: string[] = [];
    for (const [name, deps] of this.graph.entries()) {
      if (deps.size === 0) {
        leaves.push(name);
      }
    }
    return leaves;
  }

  /**
   * Get submodules with no dependents (root nodes)
   */
  getRootNodes(): string[] {
    const roots: string[] = [];
    for (const [name, dependents] of this.reverseGraph.entries()) {
      if (dependents.size === 0) {
        roots.push(name);
      }
    }
    return roots;
  }

  /**
   * Calculate the depth of a submodule in the dependency tree
   * Depth 0 = no dependencies (leaf)
   */
  getDepth(submoduleName: string): number {
    const visited = new Set<string>();

    const calculateDepth = (name: string): number => {
      if (visited.has(name)) return 0;
      visited.add(name);

      const deps = this.graph.get(name) || new Set();
      if (deps.size === 0) return 0;

      let maxDepth = 0;
      for (const dep of deps) {
        maxDepth = Math.max(maxDepth, calculateDepth(dep) + 1);
      }
      return maxDepth;
    };

    return calculateDepth(submoduleName);
  }

  /**
   * Get all submodule names in the graph
   */
  getAllNodes(): string[] {
    return Array.from(this.graph.keys());
  }

  /**
   * Check if a submodule exists in the graph
   */
  hasNode(name: string): boolean {
    return this.graph.has(name);
  }

  /**
   * Get graph statistics
   */
  getStats(): {
    totalNodes: number;
    totalEdges: number;
    leafNodes: number;
    rootNodes: number;
    maxDepth: number;
  } {
    let totalEdges = 0;
    let maxDepth = 0;

    for (const [name, deps] of this.graph.entries()) {
      totalEdges += deps.size;
      maxDepth = Math.max(maxDepth, this.getDepth(name));
    }

    return {
      totalNodes: this.graph.size,
      totalEdges,
      leafNodes: this.getLeafNodes().length,
      rootNodes: this.getRootNodes().length,
      maxDepth,
    };
  }
}
