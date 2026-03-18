/**
 * Benchmark script for file tree generation performance
 *
 * This benchmark measures the improvement from:
 * 1. Map-based lookup for O(1) child node access
 * 2. Single sort pass instead of recursive sorting
 */

import nodepath from 'node:path';

interface TreeNode {
  name: string;
  children: TreeNode[];
  isDirectory: boolean;
}

// Original O(N) array search implementation
const createTreeNodeOriginal = (name: string, isDirectory: boolean): TreeNode => ({
  name,
  children: [],
  isDirectory,
});

const addPathToTreeOriginal = (root: TreeNode, path: string, isDirectory: boolean): void => {
  const parts = path.split(nodepath.sep);
  let currentNode = root;

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const isLastPart = i === parts.length - 1;
    let child = currentNode.children.find((c) => c.name === part);

    if (!child) {
      child = createTreeNodeOriginal(part, !isLastPart || isDirectory);
      currentNode.children.push(child);
    }

    currentNode = child;
  }
};

const generateFileTreeOriginal = (files: string[]): TreeNode => {
  const root: TreeNode = createTreeNodeOriginal('root', true);
  for (const file of files) {
    addPathToTreeOriginal(root, file, false);
  }
  return root;
};

const sortTreeNodesOriginal = (node: TreeNode) => {
  node.children.sort((a, b) => {
    if (a.isDirectory === b.isDirectory) {
      return a.name.localeCompare(b.name);
    }
    return a.isDirectory ? -1 : 1;
  });
  for (const child of node.children) {
    sortTreeNodesOriginal(child);
  }
};

const treeToStringOriginal = (node: TreeNode, prefix = ''): string => {
  sortTreeNodesOriginal(node);
  let result = '';
  for (const child of node.children) {
    result += `${prefix}${child.name}${child.isDirectory ? '/' : ''}\n`;
    if (child.isDirectory) {
      result += treeToStringOriginal(child, `${prefix}  `);
    }
  }
  return result;
};

// Optimized implementation with Map-based lookup
interface InternalTreeNode extends TreeNode {
  childrenMap: Map<string, InternalTreeNode>;
}

const createInternalNode = (name: string, isDirectory: boolean): InternalTreeNode => ({
  name,
  children: [],
  isDirectory,
  childrenMap: new Map(),
});

const addPathToTreeOptimized = (root: InternalTreeNode, path: string, isDirectory: boolean): void => {
  const parts = path.split(nodepath.sep);
  let currentNode = root;

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const isLastPart = i === parts.length - 1;
    let child = currentNode.childrenMap.get(part);

    if (!child) {
      child = createInternalNode(part, !isLastPart || isDirectory);
      currentNode.children.push(child);
      currentNode.childrenMap.set(part, child);
    }

    currentNode = child;
  }
};

const cleanupInternalRefs = (node: InternalTreeNode): TreeNode => {
  for (const child of node.children) {
    cleanupInternalRefs(child as InternalTreeNode);
  }
  node.childrenMap.clear();
  return node;
};

const generateFileTreeOptimized = (files: string[]): TreeNode => {
  const root: InternalTreeNode = createInternalNode('root', true);
  for (const file of files) {
    addPathToTreeOptimized(root, file, false);
  }
  return cleanupInternalRefs(root);
};

const sortTreeNodesOptimized = (node: TreeNode): void => {
  node.children.sort((a, b) => {
    if (a.isDirectory === b.isDirectory) {
      return a.name.localeCompare(b.name);
    }
    return a.isDirectory ? -1 : 1;
  });
  for (const child of node.children) {
    sortTreeNodesOptimized(child);
  }
};

const treeToStringInternalOptimized = (node: TreeNode, prefix: string): string => {
  let result = '';
  for (const child of node.children) {
    result += `${prefix}${child.name}${child.isDirectory ? '/' : ''}\n`;
    if (child.isDirectory) {
      result += treeToStringInternalOptimized(child, `${prefix}  `);
    }
  }
  return result;
};

const treeToStringOptimized = (node: TreeNode, prefix = ''): string => {
  sortTreeNodesOptimized(node);
  return treeToStringInternalOptimized(node, prefix);
};

// Generate test data
function generateTestFiles(fileCount: number, maxDepth: number): string[] {
  const files: string[] = [];
  const dirs = ['src', 'lib', 'test', 'docs', 'config', 'utils', 'components', 'services'];

  for (let i = 0; i < fileCount; i++) {
    const depth = (i % maxDepth) + 1;
    const parts: string[] = [];

    for (let d = 0; d < depth; d++) {
      const dirIndex = (i + d) % dirs.length;
      parts.push(`${dirs[dirIndex]}${Math.floor(i / 100)}`);
    }

    parts.push(`file${i}.ts`);
    files.push(parts.join(nodepath.sep));
  }

  return files;
}

// Run benchmark
function runBenchmark(name: string, fn: () => unknown, iterations: number = 10): { avgMs: number; minMs: number; maxMs: number } {
  const times: number[] = [];

  // Warmup
  for (let i = 0; i < 3; i++) {
    fn();
  }

  // Actual runs
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    fn();
    const end = performance.now();
    times.push(end - start);
  }

  const avgMs = times.reduce((a, b) => a + b, 0) / times.length;
  const minMs = Math.min(...times);
  const maxMs = Math.max(...times);

  return { avgMs, minMs, maxMs };
}

// Test configurations
const testConfigs = [
  { files: 1000, depth: 5, name: 'Small (1k files, depth 5)' },
  { files: 5000, depth: 8, name: 'Medium (5k files, depth 8)' },
  { files: 10000, depth: 10, name: 'Large (10k files, depth 10)' },
  { files: 30000, depth: 12, name: 'Very Large (30k files, depth 12)' },
];

console.log('='.repeat(80));
console.log('File Tree Generation Benchmark');
console.log('='.repeat(80));
console.log();

for (const config of testConfigs) {
  console.log(`\n📊 ${config.name}`);
  console.log('-'.repeat(60));

  const files = generateTestFiles(config.files, config.depth);
  const iterations = config.files >= 30000 ? 3 : 10;

  // Benchmark tree generation
  console.log('  Tree Generation:');

  const origGenResult = runBenchmark('Original', () => generateFileTreeOriginal(files), iterations);
  console.log(`    Original:  avg=${origGenResult.avgMs.toFixed(2)}ms`);

  const optGenResult = runBenchmark('Optimized', () => generateFileTreeOptimized(files), iterations);
  console.log(`    Optimized: avg=${optGenResult.avgMs.toFixed(2)}ms`);
  console.log(`    🚀 Speedup: ${(origGenResult.avgMs / optGenResult.avgMs).toFixed(1)}x faster`);

  // Benchmark tree to string (includes sorting)
  console.log('  Tree to String (with sort):');

  const origTree = generateFileTreeOriginal(files);
  const origStrResult = runBenchmark('Original', () => treeToStringOriginal(origTree), iterations);
  console.log(`    Original:  avg=${origStrResult.avgMs.toFixed(2)}ms`);

  const optTree = generateFileTreeOptimized(files);
  const optStrResult = runBenchmark('Optimized', () => treeToStringOptimized(optTree), iterations);
  console.log(`    Optimized: avg=${optStrResult.avgMs.toFixed(2)}ms`);
  console.log(`    🚀 Speedup: ${(origStrResult.avgMs / optStrResult.avgMs).toFixed(1)}x faster`);

  // Verify correctness
  const origOutput = treeToStringOriginal(generateFileTreeOriginal(files));
  const optOutput = treeToStringOptimized(generateFileTreeOptimized(files));
  const isCorrect = origOutput === optOutput;
  console.log(`  ✅ Correctness: ${isCorrect ? 'PASS' : 'FAIL'}`);
}

console.log('\n' + '='.repeat(80));
console.log('Benchmark Complete');
console.log('='.repeat(80));
