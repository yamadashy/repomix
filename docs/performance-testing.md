# Performance Testing for Repomix Line Limiting Feature

## Overview

This document describes the comprehensive performance testing approach for the line limiting feature in Repomix. The testing suite ensures that the feature meets the performance requirements outlined in the PRD and maintains efficient performance across various file sizes and languages.

## Performance Requirements

Based on the PRD requirements, the line limiting feature must meet these performance criteria:

### Processing Time Requirements
- **Small Files** (< 100 lines): < 1 second
- **Medium Files** (100-1000 lines): < 10 seconds
- **Large Files** (1000-10000 lines): < 100 seconds
- **Very Large Files** (> 10000 lines): < 500 seconds

### Performance Impact Requirements
- **< 5% performance impact** compared to baseline processing
- **Memory efficiency** with minimal overhead
- **Scalability** for processing multiple files

## Test Architecture

### Test Structure

```
tests/performance/
├── performanceUtils.ts              # Performance measurement utilities
├── testDataGenerators.ts           # Test data generation
├── lineLimitPerformance.test.ts    # Baseline performance tests
├── largeFilePerformance.test.ts    # Large file specific tests
├── languagePerformance.test.ts     # Language-specific tests
└── scalabilityPerformance.test.ts   # Scalability tests

scripts/
└── performance-benchmark.ts        # Benchmarking infrastructure
```

### Core Components

#### 1. Performance Measurement Utilities (`performanceUtils.ts`)

Provides comprehensive performance measurement capabilities:

- **PerformanceMetrics Interface**: Standardized metrics collection
- **PerformanceMeasurement Class**: Real-time performance tracking
- **Baseline Comparison**: Compare performance with and without line limiting
- **Requirements Validation**: Check against PRD requirements
- **Report Generation**: Comprehensive performance reports

Key metrics tracked:
- Processing time (ms)
- Memory usage (MB)
- Peak memory usage (MB)
- Lines processed/output
- Throughput (lines/sec)
- Memory efficiency (lines/MB)
- Performance impact percentage

#### 2. Test Data Generators (`testDataGenerators.ts`)

Generates realistic test files for performance testing:

- **Language-Specific Generators**: JavaScript, TypeScript, Python, Java, Go
- **Realistic Code Structure**: Classes, functions, imports, comments
- **Configurable Sizes**: From 50 to 50,000+ lines
- **Mixed Repository Generation**: Realistic project structures

#### 3. Benchmarking Infrastructure (`performance-benchmark.ts`)

Comprehensive benchmarking tool with CLI interface:

- **Automated Benchmarking**: Run full performance test suite
- **Baseline Management**: Track performance over time
- **Regression Detection**: Identify performance degradations
- **HTML Reports**: Visual performance reports
- **Trend Analysis**: Performance tracking over time

## Test Categories

### 1. Baseline Performance Tests

**File**: `lineLimitPerformance.test.ts`

**Purpose**: Measure baseline performance and compare with line limiting enabled

**Test Cases**:
- Small files (50-100 lines) with various line limits
- Medium files (250-1000 lines) with different limits
- Large files (2000-10000 lines) with scaling limits
- Very large files (15000-50000 lines) with aggressive limits

**Validations**:
- Processing time within PRD limits
- Memory usage within acceptable bounds
- Performance impact < 5% compared to baseline
- Throughput requirements met

### 2. Large File Performance Tests

**File**: `largeFilePerformance.test.ts`

**Purpose**: Test performance with increasingly large files

**Test Cases**:
- Small files (< 100 lines): Should process in < 1 second
- Medium files (100-1000 lines): Should process in < 10 seconds
- Large files (1000-10000 lines): Should process in < 100 seconds
- Very large files (> 10000 lines): Should process in < 500 seconds

**Validations**:
- Time complexity analysis (linear/sub-linear scaling)
- Memory efficiency analysis
- Performance degradation detection
- Edge case handling (extremely large files)

### 3. Language-Specific Performance Tests

**File**: `languagePerformance.test.ts`

**Purpose**: Test performance across all supported languages

**Test Cases**:
- JavaScript/TypeScript: Modern web development patterns
- Python: Data science and web applications
- Java: Enterprise applications with complex structures
- Go: Systems programming with concurrent patterns
- C/C++: Low-level systems code
- Other supported languages

**Validations**:
- Language-specific parsing performance
- Complex syntax handling
- Language-specific edge cases
- Cross-language performance consistency

### 4. Scalability Performance Tests

**File**: `scalabilityPerformance.test.ts`

**Purpose**: Test scalability under various loads

**Test Cases**:
- **Single Large File**: Processing one very large file
- **Multiple Large Files**: Processing many large files
- **Mixed Repository**: Realistic repository with mixed file types
- **Concurrent Processing**: Parallel file processing
- **Performance Under Load**: Sustained processing performance
- **Memory Pressure**: Performance under memory constraints

**Validations**:
- Linear scaling with file count
- Concurrent processing efficiency
- Memory pressure handling
- Performance consistency under load
- Scalability limits identification

## Usage

### Running Performance Tests

#### Individual Test Suites

```bash
# Run baseline performance tests
npm test -- tests/performance/lineLimitPerformance.test.ts

# Run large file performance tests
npm test -- tests/performance/largeFilePerformance.test.ts

# Run language-specific tests
npm test -- tests/performance/languagePerformance.test.ts

# Run scalability tests
npm test -- tests/performance/scalabilityPerformance.test.ts
```

#### Complete Performance Test Suite

```bash
# Run all performance tests
npm test -- tests/performance/
```

### Using the Benchmarking Tool

#### Basic Benchmark Run

```bash
# Run comprehensive benchmarks
node scripts/performance-benchmark.ts run

# Custom configuration
node scripts/performance-benchmark.ts run \
  --output ./my-results \
  --iterations 5 \
  --warmup 3
```

#### Performance Comparison

```bash
# Compare with baseline
node scripts/performance-benchmark.ts compare \
  --baseline ./performance-results/baseline.json \
  --current ./performance-results/latest.json
```

#### Trend Analysis

```bash
# Analyze performance trends
node scripts/performance-benchmark.ts trend \
  --dir ./performance-results/
```

## Performance Metrics

### Primary Metrics

1. **Processing Time (ms)**
   - Total time to process file with line limiting
   - Measured from start to completion
   - Includes parsing, limiting, and output generation

2. **Memory Usage (MB)**
   - Heap memory used during processing
   - Measured at completion
   - Excludes temporary allocations

3. **Throughput (lines/sec)**
   - Processing speed metric
   - Calculated as: `linesProcessed / processingTimeMs * 1000`
   - Indicates overall efficiency

4. **Performance Impact (%)**
   - Overhead compared to baseline processing
   - Calculated as: `((limitedTime - baselineTime) / baselineTime) * 100`
   - Should be < 5% according to PRD

### Secondary Metrics

1. **Peak Memory Usage (MB)**
   - Maximum memory usage during processing
   - Important for memory pressure analysis

2. **Memory Efficiency (lines/MB)**
   - Lines processed per MB of memory
   - Higher values indicate better efficiency

3. **Scaling Factor**
   - Performance scaling with file size
   - Should be linear or sub-linear

## Performance Thresholds

### Default Thresholds (from PRD)

```typescript
const DEFAULT_PERFORMANCE_THRESHOLDS = {
  smallFileMaxTimeMs: 1000,      // < 1 second for small files
  mediumFileMaxTimeMs: 10000,    // < 10 seconds for medium files
  largeFileMaxTimeMs: 100000,     // < 100 seconds for large files
  veryLargeFileMaxTimeMs: 500000, // < 500 seconds for very large files
  maxPerformanceImpactPercentage: 5, // < 5% performance impact
  smallFileMaxMemoryMB: 10,
  mediumFileMaxMemoryMB: 20,
  largeFileMaxMemoryMB: 50,
  veryLargeFileMaxMemoryMB: 100,
};
```

### Custom Thresholds

Thresholds can be customized for specific environments:

```typescript
const customThresholds = {
  ...DEFAULT_PERFORMANCE_THRESHOLDS,
  smallFileMaxTimeMs: 500,        // More aggressive for CI/CD
  maxPerformanceImpactPercentage: 3,  // Stricter impact requirement
};
```

## Performance Reports

### Console Output

Real-time performance metrics during test execution:

```
Testing: javascript (1000 lines, limit: 100)
  Average time: 45.23ms
  Average memory: 12.45MB
  Throughput: 22108.45 lines/sec
  Status: PASS
```

### HTML Reports

Comprehensive visual reports with:
- Executive summary with key metrics
- Detailed test results table
- Performance charts and graphs
- Regression detection alerts
- Performance recommendations

### JSON Reports

Structured data for programmatic analysis:

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "summary": {
    "totalTests": 25,
    "passedTests": 24,
    "failedTests": 1,
    "averageTimeMs": 156.78,
    "averageMemoryMB": 23.45,
    "regressionDetected": false
  },
  "results": [...],
  "recommendations": [...]
}
```

## Performance Optimization Guidelines

### Based on Test Results

1. **Small Files (< 100 lines)**
   - Focus on minimizing overhead
   - Optimize initialization costs
   - Consider caching for repeated processing

2. **Medium Files (100-1000 lines)**
   - Balance between memory usage and speed
   - Implement efficient parsing strategies
   - Use streaming where possible

3. **Large Files (1000-10000 lines)**
   - Implement chunked processing
   - Optimize memory allocation patterns
   - Consider parallel processing

4. **Very Large Files (> 10000 lines)**
   - Implement streaming algorithms
   - Minimize memory footprint
   - Add progress reporting

### Language-Specific Optimizations

1. **JavaScript/TypeScript**
   - Optimize AST parsing
   - Efficient comment handling
   - Smart import detection

2. **Python**
   - Handle indentation efficiently
   - Optimize docstring processing
   - Efficient class/function detection

3. **Java**
   - Package import optimization
   - Efficient annotation handling
   - Smart class structure parsing

4. **Go**
   - Efficient goroutine simulation
   - Package structure optimization
   - Interface handling

## Continuous Integration

### CI/CD Integration

Add performance tests to CI pipeline:

```yaml
# .github/workflows/performance.yml
name: Performance Tests

on: [push, pull_request]

jobs:
  performance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run performance benchmarks
        run: node scripts/performance-benchmark.ts run
      
      - name: Upload performance results
        uses: actions/upload-artifact@v3
        with:
          name: performance-results
          path: performance-results/
```

### Performance Gates

Set up performance gates in CI:

```bash
# Fail CI if performance degrades
node scripts/performance-benchmark.ts run \
  --baseline ./baseline.json \
  --max-regression 10
```

## Troubleshooting

### Common Performance Issues

1. **High Memory Usage**
   - Check for memory leaks in parsing
   - Verify proper cleanup of temporary objects
   - Consider streaming implementations

2. **Slow Processing**
   - Profile parsing bottlenecks
   - Check for inefficient algorithms
   - Verify proper use of data structures

3. **Performance Regression**
   - Compare with baseline metrics
   - Identify recent changes
   - Run targeted performance tests

### Debugging Tools

1. **Node.js Profiler**
   ```bash
   node --prof scripts/performance-benchmark.ts run
   node --prof-process isolate-*.log > performance.txt
   ```

2. **Memory Profiling**
   ```bash
   node --inspect scripts/performance-benchmark.ts run
   # Connect with Chrome DevTools
   ```

3. **Performance Timings**
   ```bash
   NODE_OPTIONS="--trace-warnings" node scripts/performance-benchmark.ts run
   ```

## Future Enhancements

### Planned Improvements

1. **Advanced Metrics**
   - CPU usage tracking
   - I/O operation analysis
   - Garbage collection impact

2. **Enhanced Reporting**
   - Interactive dashboards
   - Historical trend analysis
   - Performance prediction

3. **Automated Optimization**
   - Performance-based configuration
   - Adaptive algorithms
   - Self-tuning parameters

4. **Integration Testing**
   - End-to-end performance testing
   - Real-world repository testing
   - Production environment monitoring

## Conclusion

This comprehensive performance testing suite ensures that the line limiting feature meets all PRD requirements and maintains excellent performance across various scenarios. The modular architecture allows for easy extension and customization, while the automated benchmarking tools provide continuous performance monitoring.

Regular execution of these tests helps maintain performance standards and detect regressions early in the development cycle.