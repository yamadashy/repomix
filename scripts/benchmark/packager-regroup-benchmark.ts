/**
 * Benchmark script for packager file path regrouping performance
 *
 * This benchmark compares the O(N²) current implementation with the optimized O(N) version
 * using Map/Set-based lookups instead of nested array operations.
 */

// Generate test data
function generateTestData(
  fileCount: number,
  rootCount: number,
): {
  rootDirs: string[];
  filePathsByDir: Array<{ rootDir: string; filePaths: string[] }>;
  sortedFilePaths: string[];
} {
  const rootDirs: string[] = [];
  const filePathsByDir: Array<{ rootDir: string; filePaths: string[] }> = [];

  for (let i = 0; i < rootCount; i++) {
    const rootDir = `/home/user/project${i}`;
    rootDirs.push(rootDir);

    const filePaths: string[] = [];
    const filesPerRoot = Math.floor(fileCount / rootCount);

    for (let j = 0; j < filesPerRoot; j++) {
      // Generate realistic file paths with varying depths
      const depth = (j % 5) + 1;
      const dirs = Array.from({ length: depth }, (_, k) => `dir${k}`).join('/');
      filePaths.push(`${rootDir}/${dirs}/file${j}.ts`);
    }

    filePathsByDir.push({ rootDir, filePaths });
  }

  // Create sorted file paths (all files combined and sorted)
  const sortedFilePaths = filePathsByDir.flatMap(({ filePaths }) => filePaths).sort();

  return { rootDirs, filePathsByDir, sortedFilePaths };
}

// Current O(N²) implementation
function regroupCurrentImpl(
  rootDirs: string[],
  sortedFilePaths: string[],
  filePathsByDir: Array<{ rootDir: string; filePaths: string[] }>,
): Array<{ rootDir: string; filePaths: string[] }> {
  return rootDirs.map((rootDir) => ({
    rootDir,
    filePaths: sortedFilePaths.filter((filePath: string) =>
      filePathsByDir.find((item) => item.rootDir === rootDir)?.filePaths.includes(filePath),
    ),
  }));
}

// Optimized O(N) implementation using Map and Set
function regroupOptimizedImpl(
  rootDirs: string[],
  sortedFilePaths: string[],
  filePathsByDir: Array<{ rootDir: string; filePaths: string[] }>,
): Array<{ rootDir: string; filePaths: string[] }> {
  // Build a Map from rootDir -> Set of filePaths for O(1) lookup
  const pathsByRootMap = new Map<string, Set<string>>(
    filePathsByDir.map((item) => [item.rootDir, new Set(item.filePaths)]),
  );

  return rootDirs.map((rootDir) => {
    const fileSet = pathsByRootMap.get(rootDir);
    return {
      rootDir,
      filePaths: fileSet ? sortedFilePaths.filter((filePath) => fileSet.has(filePath)) : [],
    };
  });
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
  { files: 1000, roots: 1, name: 'Small (1k files, 1 root)' },
  { files: 5000, roots: 1, name: 'Medium (5k files, 1 root)' },
  { files: 10000, roots: 1, name: 'Large (10k files, 1 root)' },
  { files: 10000, roots: 3, name: 'Large Multi-root (10k files, 3 roots)' },
  { files: 50000, roots: 1, name: 'Very Large (50k files, 1 root)' },
  { files: 50000, roots: 3, name: 'Very Large Multi-root (50k files, 3 roots)' },
];

console.log('='.repeat(80));
console.log('Packager File Path Regrouping Benchmark');
console.log('='.repeat(80));
console.log();

for (const config of testConfigs) {
  console.log(`\n📊 ${config.name}`);
  console.log('-'.repeat(60));

  const { rootDirs, filePathsByDir, sortedFilePaths } = generateTestData(config.files, config.roots);

  // Skip very large tests for current implementation if it takes too long
  let currentResult: { avgMs: number; minMs: number; maxMs: number } | null = null;
  let iterations = config.files >= 50000 ? 3 : 10;

  if (config.files <= 10000) {
    currentResult = runBenchmark('Current (O(N²))', () => regroupCurrentImpl(rootDirs, sortedFilePaths, filePathsByDir), iterations);
    console.log(`  Current (O(N²)):   avg=${currentResult.avgMs.toFixed(2)}ms, min=${currentResult.minMs.toFixed(2)}ms, max=${currentResult.maxMs.toFixed(2)}ms`);
  } else {
    // For very large datasets, only run once to get an estimate
    const start = performance.now();
    regroupCurrentImpl(rootDirs, sortedFilePaths, filePathsByDir);
    const elapsed = performance.now() - start;
    currentResult = { avgMs: elapsed, minMs: elapsed, maxMs: elapsed };
    console.log(`  Current (O(N²)):   ~${elapsed.toFixed(2)}ms (single run - too slow for multiple iterations)`);
  }

  const optimizedResult = runBenchmark('Optimized (O(N))', () => regroupOptimizedImpl(rootDirs, sortedFilePaths, filePathsByDir), iterations);
  console.log(`  Optimized (O(N)):  avg=${optimizedResult.avgMs.toFixed(2)}ms, min=${optimizedResult.minMs.toFixed(2)}ms, max=${optimizedResult.maxMs.toFixed(2)}ms`);

  if (currentResult) {
    const speedup = currentResult.avgMs / optimizedResult.avgMs;
    console.log(`  🚀 Speedup: ${speedup.toFixed(1)}x faster`);
  }

  // Verify correctness
  const currentOutput = regroupCurrentImpl(rootDirs, sortedFilePaths, filePathsByDir);
  const optimizedOutput = regroupOptimizedImpl(rootDirs, sortedFilePaths, filePathsByDir);

  let isCorrect = true;
  for (let i = 0; i < rootDirs.length; i++) {
    if (
      currentOutput[i].rootDir !== optimizedOutput[i].rootDir ||
      currentOutput[i].filePaths.length !== optimizedOutput[i].filePaths.length ||
      !currentOutput[i].filePaths.every((fp, idx) => fp === optimizedOutput[i].filePaths[idx])
    ) {
      isCorrect = false;
      break;
    }
  }

  console.log(`  ✅ Correctness: ${isCorrect ? 'PASS' : 'FAIL'}`);
}

console.log('\n' + '='.repeat(80));
console.log('Benchmark Complete');
console.log('='.repeat(80));
