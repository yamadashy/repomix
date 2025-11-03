import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { applyLineLimit } from '../../src/core/file/lineLimitProcessor.js';
import type { SupportedLang as SupportedLangType } from '../../src/core/treeSitter/lang2Query.js';
import {
  DEFAULT_PERFORMANCE_THRESHOLDS,
  generatePerformanceReport,
  measurePerformance,
  type PerformanceMetrics,
} from './performanceUtils.js';
import { generateLargeFile, type SupportedLang } from './testDataGenerators.js';

describe('Language-Specific Performance Tests', () => {
  beforeEach(() => {
    // Mock console methods to reduce noise during performance tests
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('JavaScript/TypeScript Performance', () => {
    test('should process JavaScript files efficiently', async () => {
      const language: SupportedLangType = 'javascript';
      const testSizes = [500, 2000, 5000];
      const lineLimit = 200;
      const fileMetrics: PerformanceMetrics[] = [];

      for (const size of testSizes) {
        const content = generateLargeFile(language, size);
        const filePath = `test.js`;

        const { metrics } = await measurePerformance(async () => {
          return await applyLineLimit(content, filePath, lineLimit);
        });

        fileMetrics.push(metrics);

        // Performance requirements
        expect(metrics.processingTimeMs).toBeLessThan(size * 2); // Less than 2ms per line
        expect(metrics.memoryUsageMB).toBeLessThan(50);
        expect(metrics.throughputLinesPerSec).toBeGreaterThan(100);
        expect(metrics.linesOutput).toBeLessThanOrEqual(lineLimit);
      }

      // Generate report for analysis
      const report = generatePerformanceReport(
        'JavaScript Performance Test',
        fileMetrics,
        undefined,
        DEFAULT_PERFORMANCE_THRESHOLDS,
      );

      expect(report.meetsRequirements).toBe(true);
      console.log(
        `JavaScript performance report: ${report.aggregateMetrics.throughputLinesPerSec.toFixed(2)} lines/sec avg`,
      );
    });

    test('should process TypeScript files efficiently', async () => {
      const language: SupportedLangType = 'typescript';
      const testSizes = [500, 2000, 5000];
      const lineLimit = 200;
      const fileMetrics: PerformanceMetrics[] = [];

      for (const size of testSizes) {
        const content = generateLargeFile(language, size);
        const filePath = `test.ts`;

        const { metrics } = await measurePerformance(async () => {
          return await applyLineLimit(content, filePath, lineLimit);
        });

        fileMetrics.push(metrics);

        // Performance requirements
        expect(metrics.processingTimeMs).toBeLessThan(size * 2); // Less than 2ms per line
        expect(metrics.memoryUsageMB).toBeLessThan(50);
        expect(metrics.throughputLinesPerSec).toBeGreaterThan(100);
        expect(metrics.linesOutput).toBeLessThanOrEqual(lineLimit);
      }

      const report = generatePerformanceReport(
        'TypeScript Performance Test',
        fileMetrics,
        undefined,
        DEFAULT_PERFORMANCE_THRESHOLDS,
      );

      expect(report.meetsRequirements).toBe(true);
      console.log(
        `TypeScript performance report: ${report.aggregateMetrics.throughputLinesPerSec.toFixed(2)} lines/sec avg`,
      );
    });

    test('should handle complex JavaScript patterns efficiently', async () => {
      const complexJavaScriptContent = `
// Complex JavaScript with various patterns
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { debounce, throttle, cloneDeep } from 'lodash';
import axios from 'axios';

class ComplexJavaScriptClass {
  constructor(options = {}) {
    this.options = {
      timeout: 5000,
      retries: 3,
      cache: true,
      ...options
    };
    this.cache = new Map();
    this.observers = new Set();
    this.state = {};
  }

  async fetchData(url, params = {}) {
    const cacheKey = this.generateCacheKey(url, params);
    
    if (this.options.cache && this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const response = await axios.get(url, { 
        params,
        timeout: this.options.timeout 
      });
      
      const data = response.data;
      
      if (this.options.cache) {
        this.cache.set(cacheKey, data);
      }
      
      this.notifyObservers('dataLoaded', data);
      return data;
    } catch (error) {
      if (this.options.retries > 0) {
        this.options.retries--;
        await new Promise(resolve => setTimeout(resolve, 1000));
        return this.fetchData(url, params);
      }
      throw error;
    }
  }

  generateCacheKey(url, params) {
    return \`\${url}?\${JSON.stringify(params)}\`;
  }

  subscribe(observer) {
    this.observers.add(observer);
    return () => this.observers.delete(observer);
  }

  notifyObservers(event, data) {
    this.observers.forEach(observer => {
      try {
        observer(event, data);
      } catch (error) {
        console.error('Observer error:', error);
      }
    });
  }

  debounce(fn, delay) {
    let timeoutId;
    return (...args) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  throttle(fn, limit) {
    let inThrottle;
    return (...args) => {
      if (!inThrottle) {
        fn.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  memoize(fn) {
    const cache = new Map();
    return (...args) => {
      const key = JSON.stringify(args);
      if (cache.has(key)) {
        return cache.get(key);
      }
      const result = fn.apply(this, args);
      cache.set(key, result);
      return result;
    };
  }
}

const ComplexFunctionalComponent = ({ data, onUpdate }) => {
  const [state, setState] = useState({
    loading: false,
    error: null,
    data: []
  });

  const processedData = useMemo(() => {
    return data.map(item => ({
      ...item,
      processed: true,
      timestamp: Date.now(),
      hash: btoa(JSON.stringify(item))
    }));
  }, [data]);

  const debouncedUpdate = useCallback(
    debounce((newData) => {
      onUpdate(newData);
    }, 300),
    [onUpdate]
  );

  useEffect(() => {
    setState(prev => ({ ...prev, loading: true }));
    
    // Simulate async processing
    setTimeout(() => {
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        data: processedData 
      }));
      debouncedUpdate(processedData);
    }, 1000);
  }, [processedData, debouncedUpdate]);

  return {
    ...state,
    processedData,
    refresh: () => setState(prev => ({ ...prev, loading: true }))
  };
};

export { ComplexJavaScriptClass, ComplexFunctionalComponent };
      `
        .trim()
        .repeat(100); // Repeat to create a large file

      const filePath = 'complex.js';
      const lineLimit = 500;

      const { metrics } = await measurePerformance(async () => {
        return await applyLineLimit(complexJavaScriptContent, filePath, lineLimit);
      });

      expect(metrics.processingTimeMs).toBeLessThan(10000);
      expect(metrics.memoryUsageMB).toBeLessThan(100);
      expect(metrics.throughputLinesPerSec).toBeGreaterThan(50);
      expect(metrics.linesOutput).toBeLessThanOrEqual(lineLimit);

      console.log(
        `Complex JavaScript performance: ${metrics.processingTimeMs.toFixed(2)}ms for ${metrics.linesProcessed} lines`,
      );
    });
  });

  describe('Python Performance', () => {
    test('should process Python files efficiently', async () => {
      const language: SupportedLangType = 'python';
      const testSizes = [500, 2000, 5000];
      const lineLimit = 200;
      const fileMetrics: PerformanceMetrics[] = [];

      for (const size of testSizes) {
        const content = generateLargeFile(language, size);
        const filePath = `test.py`;

        const { metrics } = await measurePerformance(async () => {
          return await applyLineLimit(content, filePath, lineLimit);
        });

        fileMetrics.push(metrics);

        // Performance requirements
        expect(metrics.processingTimeMs).toBeLessThan(size * 2); // Less than 2ms per line
        expect(metrics.memoryUsageMB).toBeLessThan(50);
        expect(metrics.throughputLinesPerSec).toBeGreaterThan(100);
        expect(metrics.linesOutput).toBeLessThanOrEqual(lineLimit);
      }

      const report = generatePerformanceReport(
        'Python Performance Test',
        fileMetrics,
        undefined,
        DEFAULT_PERFORMANCE_THRESHOLDS,
      );

      expect(report.meetsRequirements).toBe(true);
      console.log(
        `Python performance report: ${report.aggregateMetrics.throughputLinesPerSec.toFixed(2)} lines/sec avg`,
      );
    });

    test('should handle complex Python patterns efficiently', async () => {
      const complexPythonContent = `
# Complex Python with various patterns
import asyncio
import aiohttp
import json
import logging
from typing import Dict, List, Optional, Any, Union, Tuple
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from functools import wraps, lru_cache
from contextlib import asynccontextmanager

@dataclass
class DataProcessor:
    """Complex data processor with async operations."""
    name: str
    config: Dict[str, Any] = field(default_factory=dict)
    cache: Dict[str, Any] = field(default_factory=dict)
    logger: logging.Logger = field(default_factory=lambda: logging.getLogger(__name__))
    
    def __post_init__(self):
        self.setup_logging()
        self.validate_config()
    
    def setup_logging(self):
        """Setup logging configuration."""
        handler = logging.StreamHandler()
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        handler.setFormatter(formatter)
        self.logger.addHandler(handler)
        self.logger.setLevel(logging.INFO)
    
    def validate_config(self):
        """Validate configuration parameters."""
        required_keys = ['timeout', 'retries', 'batch_size']
        for key in required_keys:
            if key not in self.config:
                raise ValueError(f"Missing required config key: {key}")
    
    @lru_cache(maxsize=128)
    def process_item(self, item: Dict[str, Any]) -> Dict[str, Any]:
        """Process a single item with caching."""
        processed = {
            'id': item.get('id'),
            'name': item.get('name', '').upper(),
            'value': item.get('value', 0) * 2,
            'processed_at': datetime.now().isoformat(),
            'hash': hash(json.dumps(item, sort_keys=True))
        }
        
        if 'metadata' in item:
            processed['metadata'] = {
                **item['metadata'],
                'processed': True
            }
        
        return processed
    
    async def fetch_data(self, url: str) -> List[Dict[str, Any]]:
        """Fetch data from URL with retry logic."""
        retries = self.config.get('retries', 3)
        timeout = self.config.get('timeout', 30)
        
        for attempt in range(retries):
            try:
                async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=timeout)) as session:
                    async with session.get(url) as response:
                        response.raise_for_status()
                        data = await response.json()
                        
                        self.logger.info(f"Successfully fetched {len(data)} items from {url}")
                        return data
                        
            except Exception as e:
                self.logger.warning(f"Attempt {attempt + 1} failed: {e}")
                if attempt == retries - 1:
                    raise
                await asyncio.sleep(2 ** attempt)  # Exponential backoff
    
    @asynccontextmanager
    async def batch_processor(self, batch_size: Optional[int] = None):
        """Context manager for batch processing."""
        batch_size = batch_size or self.config.get('batch_size', 100)
        batch = []
        
        try:
            yield batch
        finally:
            if batch:
                await self.process_batch(batch)
    
    async def process_batch(self, batch: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Process a batch of items."""
        results = []
        
        # Process items concurrently
        semaphore = asyncio.Semaphore(self.config.get('max_concurrent', 10))
        
        async def process_with_semaphore(item):
            async with semaphore:
                return self.process_item(item)
        
        tasks = [process_with_semaphore(item) for item in batch]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Filter out exceptions and log them
        processed_results = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                self.logger.error(f"Error processing item {i}: {result}")
            else:
                processed_results.append(result)
        
        return processed_results
    
    def retry_on_failure(self, max_retries: int = 3):
        """Decorator for retry logic."""
        def decorator(func):
            @wraps(func)
            async def wrapper(*args, **kwargs):
                for attempt in range(max_retries):
                    try:
                        return await func(*args, **kwargs)
                    except Exception as e:
                        if attempt == max_retries - 1:
                            raise
                        self.logger.warning(f"Retry {attempt + 1} for {func.__name__}: {e}")
                        await asyncio.sleep(2 ** attempt)
                return None
            return wrapper
        return decorator
    
    @retry_on_failure(max_retries=3)
    async def process_all_data(self, sources: List[str]) -> Dict[str, Any]:
        """Process data from multiple sources."""
        all_data = []
        
        # Fetch data from all sources concurrently
        tasks = [self.fetch_data(source) for source in sources]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                self.logger.error(f"Failed to fetch from source {i}: {result}")
            else:
                all_data.extend(result)
        
        # Process in batches
        batch_size = self.config.get('batch_size', 100)
        processed_data = []
        
        async with self.batch_processor(batch_size) as batch:
            for i in range(0, len(all_data), batch_size):
                batch_data = all_data[i:i + batch_size]
                batch.extend(batch_data)
                
                # Process the batch
                batch_results = await self.process_batch(batch_data)
                processed_data.extend(batch_results)
                
                # Clear batch for next iteration
                batch.clear()
        
        return {
            'total_items': len(all_data),
            'processed_items': len(processed_data),
            'success_rate': len(processed_data) / len(all_data) if all_data else 0,
            'processing_time': datetime.now().isoformat()
        }

# Usage example
async def main():
    processor = DataProcessor(
        name='test_processor',
        config={
            'timeout': 30,
            'retries': 3,
            'batch_size': 50,
            'max_concurrent': 5
        }
    )
    
    sources = [
        'https://api.example.com/data1',
        'https://api.example.com/data2',
        'https://api.example.com/data3'
    ]
    
    try:
        result = await processor.process_all_data(sources)
        print(f"Processing completed: {result}")
    except Exception as e:
        print(f"Processing failed: {e}")

if __name__ == '__main__':
    asyncio.run(main())
      `
        .trim()
        .repeat(100); // Repeat to create a large file

      const filePath = 'complex.py';
      const lineLimit = 500;

      const { metrics } = await measurePerformance(async () => {
        return await applyLineLimit(complexPythonContent, filePath, lineLimit);
      });

      expect(metrics.processingTimeMs).toBeLessThan(10000);
      expect(metrics.memoryUsageMB).toBeLessThan(100);
      expect(metrics.throughputLinesPerSec).toBeGreaterThan(50);
      expect(metrics.linesOutput).toBeLessThanOrEqual(lineLimit);

      console.log(
        `Complex Python performance: ${metrics.processingTimeMs.toFixed(2)}ms for ${metrics.linesProcessed} lines`,
      );
    });
  });

  describe('Java Performance', () => {
    test('should process Java files efficiently', async () => {
      const language: SupportedLangType = 'java';
      const testSizes = [500, 2000, 5000];
      const lineLimit = 200;
      const fileMetrics: PerformanceMetrics[] = [];

      for (const size of testSizes) {
        const content = generateLargeFile(language, size);
        const filePath = `test.java`;

        const { metrics } = await measurePerformance(async () => {
          return await applyLineLimit(content, filePath, lineLimit);
        });

        fileMetrics.push(metrics);

        // Performance requirements
        expect(metrics.processingTimeMs).toBeLessThan(size * 2); // Less than 2ms per line
        expect(metrics.memoryUsageMB).toBeLessThan(50);
        expect(metrics.throughputLinesPerSec).toBeGreaterThan(100);
        expect(metrics.linesOutput).toBeLessThanOrEqual(lineLimit);
      }

      const report = generatePerformanceReport(
        'Java Performance Test',
        fileMetrics,
        undefined,
        DEFAULT_PERFORMANCE_THRESHOLDS,
      );

      expect(report.meetsRequirements).toBe(true);
      console.log(`Java performance report: ${report.aggregateMetrics.throughputLinesPerSec.toFixed(2)} lines/sec avg`);
    });
  });

  describe('Go Performance', () => {
    test('should process Go files efficiently', async () => {
      const language: SupportedLangType = 'go';
      const testSizes = [500, 2000, 5000];
      const lineLimit = 200;
      const fileMetrics: PerformanceMetrics[] = [];

      for (const size of testSizes) {
        const content = generateLargeFile(language, size);
        const filePath = `test.go`;

        const { metrics } = await measurePerformance(async () => {
          return await applyLineLimit(content, filePath, lineLimit);
        });

        fileMetrics.push(metrics);

        // Performance requirements
        expect(metrics.processingTimeMs).toBeLessThan(size * 2); // Less than 2ms per line
        expect(metrics.memoryUsageMB).toBeLessThan(50);
        expect(metrics.throughputLinesPerSec).toBeGreaterThan(100);
        expect(metrics.linesOutput).toBeLessThanOrEqual(lineLimit);
      }

      const report = generatePerformanceReport(
        'Go Performance Test',
        fileMetrics,
        undefined,
        DEFAULT_PERFORMANCE_THRESHOLDS,
      );

      expect(report.meetsRequirements).toBe(true);
      console.log(`Go performance report: ${report.aggregateMetrics.throughputLinesPerSec.toFixed(2)} lines/sec avg`);
    });
  });

  describe('Multi-Language Performance Comparison', () => {
    test('should maintain consistent performance across languages', async () => {
      const languages: SupportedLangType[] = ['javascript', 'typescript', 'python', 'java', 'go'];
      const testSize = 2000;
      const lineLimit = 200;
      const languageMetrics: Record<string, PerformanceMetrics> = {};

      for (const language of languages) {
        const content = generateLargeFile(language, testSize);
        const filePath = `test.${getFileExtension(language)}`;

        const { metrics } = await measurePerformance(async () => {
          return await applyLineLimit(content, filePath, lineLimit);
        });

        languageMetrics[language] = metrics;

        // All languages should meet basic performance requirements
        expect(metrics.processingTimeMs).toBeLessThan(5000);
        expect(metrics.memoryUsageMB).toBeLessThan(50);
        expect(metrics.throughputLinesPerSec).toBeGreaterThan(100);
        expect(metrics.linesOutput).toBeLessThanOrEqual(lineLimit);
      }

      // Calculate performance variance across languages
      const times = Object.values(languageMetrics).map((m) => m.processingTimeMs);
      const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
      const variance = times.reduce((sum, time) => sum + (time - avgTime) ** 2, 0) / times.length;
      const stdDev = Math.sqrt(variance);
      const coefficientOfVariation = (stdDev / avgTime) * 100;

      // Performance should be consistent across languages (CV < 50%)
      expect(coefficientOfVariation).toBeLessThan(50);

      console.log('Language Performance Comparison:');
      Object.entries(languageMetrics).forEach(([lang, metrics]) => {
        console.log(
          `  ${lang}: ${metrics.processingTimeMs.toFixed(2)}ms, ${metrics.throughputLinesPerSec.toFixed(2)} lines/sec`,
        );
      });
      console.log(`Performance CV across languages: ${coefficientOfVariation.toFixed(2)}%`);
    });

    test('should handle all supported languages without errors', async () => {
      const languages: SupportedLangType[] = [
        'javascript',
        'typescript',
        'python',
        'java',
        'go',
        'c',
        'cpp',
        'c_sharp',
        'rust',
        'php',
        'ruby',
        'swift',
        'solidity',
        'css',
        'vue',
        'dart',
      ];
      const testSize = 500;
      const lineLimit = 50;

      for (const language of languages) {
        const content = generateLargeFile(language, testSize);
        const filePath = `test.${getFileExtension(language)}`;

        const { metrics } = await measurePerformance(async () => {
          return await applyLineLimit(content, filePath, lineLimit);
        });

        // All languages should process without errors and meet basic requirements
        expect(metrics.processingTimeMs).toBeGreaterThan(0);
        expect(metrics.memoryUsageMB).toBeGreaterThan(0);
        expect(metrics.linesProcessed).toBe(testSize);
        expect(metrics.linesOutput).toBeLessThanOrEqual(lineLimit);

        console.log(`${language}: ${metrics.processingTimeMs.toFixed(2)}ms for ${testSize} lines`);
      }
    });
  });

  describe('Language-Specific Edge Cases', () => {
    test('should handle files with language-specific syntax efficiently', async () => {
      const languageSpecificFiles = [
        {
          language: 'javascript' as SupportedLang,
          content: `
// JavaScript with modern syntax
import { useState, useEffect } from 'react';
import { debounce } from 'lodash';

const useCustomHook = (initialValue) => {
  const [value, setValue] = useState(initialValue);
  const [loading, setLoading] = useState(false);

  const debouncedSetValue = debounce((newValue) => {
    setLoading(true);
    setTimeout(() => {
      setValue(newValue);
      setLoading(false);
    }, 100);
  }, 300);

  useEffect(() => {
    return () => {
      // Cleanup
    };
  }, []);

  return [value, debouncedSetValue, loading];
};

export default useCustomHook;
          `
            .trim()
            .repeat(50),
          lineLimit: 100,
        },
        {
          language: 'python' as SupportedLang,
          content: `
# Python with modern syntax
from typing import Dict, List, Optional, Union
from dataclasses import dataclass
from contextlib import asynccontextmanager
import asyncio

@dataclass
class AsyncDataProcessor:
    name: str
    config: Dict = None
    
    def __post_init__(self):
        self.config = self.config or {}
    
    @asynccontextmanager
    async def process_context(self):
        try:
            yield self
        finally:
            await self.cleanup()
    
    async def process(self, data: List[Dict]) -> List[Dict]:
        async with self.process_context():
            return [item for item in data if item.get('active')]
    
    async def cleanup(self):
        pass
          `
            .trim()
            .repeat(50),
          lineLimit: 100,
        },
        {
          language: 'java' as SupportedLang,
          content: `
// Java with modern syntax
import java.util.*;
import java.util.concurrent.*;
import java.util.stream.*;

public class ModernJavaClass {
    private final Map<String, Object> cache = new ConcurrentHashMap<>();
    private final ExecutorService executor = Executors.newVirtualThreadPerTaskExecutor();
    
    public Optional<Object> getCachedValue(String key) {
        return Optional.ofNullable(cache.get(key));
    }
    
    public CompletableFuture<List<Object>> processAsync(List<String> inputs) {
        return CompletableFuture.supplyAsync(() -> 
            inputs.parallelStream()
                  .filter(Objects::nonNull)
                  .map(this::processItem)
                  .collect(Collectors.toList())
        , executor);
    }
    
    private Object processItem(String input) {
        return cache.computeIfAbsent(input, this::expensiveOperation);
    }
    
    private Object expensiveOperation(String input) {
        try {
            Thread.sleep(100);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
        return input.toUpperCase();
    }
}
          `
            .trim()
            .repeat(50),
          lineLimit: 100,
        },
      ];

      for (const { language, content, lineLimit } of languageSpecificFiles) {
        const filePath = `test.${getFileExtension(language)}`;

        const { metrics } = await measurePerformance(async () => {
          return await applyLineLimit(content, filePath, lineLimit);
        });

        // Should handle language-specific syntax efficiently
        expect(metrics.processingTimeMs).toBeLessThan(2000);
        expect(metrics.memoryUsageMB).toBeLessThan(50);
        expect(metrics.throughputLinesPerSec).toBeGreaterThan(50);
        expect(metrics.linesOutput).toBeLessThanOrEqual(lineLimit);

        console.log(`${language} syntax performance: ${metrics.processingTimeMs.toFixed(2)}ms`);
      }
    });
  });
});

/**
 * Helper function to get file extension for language
 */
function getFileExtension(language: SupportedLangType): string {
  const extensions: Record<SupportedLangType, string> = {
    javascript: 'js',
    typescript: 'ts',
    python: 'py',
    java: 'java',
    go: 'go',
    c: 'c',
    cpp: 'cpp',
    c_sharp: 'cs',
    rust: 'rs',
    php: 'php',
    ruby: 'rb',
    swift: 'swift',
    solidity: 'sol',
    css: 'css',
    vue: 'vue',
    dart: 'dart',
  };

  return extensions[language] || 'txt';
}
