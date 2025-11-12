import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { loadFileConfig, mergeConfigs } from '../../src/config/configLoad.js';
import { collectFiles } from '../../src/core/file/fileCollect.js';
import { searchFiles } from '../../src/core/file/fileSearch.js';
import type { FileCollectTask } from '../../src/core/file/workers/fileCollectWorker.js';
import fileCollectWorker from '../../src/core/file/workers/fileCollectWorker.js';
import fileProcessWorker from '../../src/core/file/workers/fileProcessWorker.js';
import type { GitDiffResult } from '../../src/core/git/gitDiffHandle.js';
import { generateOutput } from '../../src/core/output/outputGenerate.js';
import { copyToClipboardIfEnabled } from '../../src/core/packager/copyToClipboardIfEnabled.js';
import { writeOutputToDisk } from '../../src/core/packager/writeOutputToDisk.js';
import { pack } from '../../src/core/packager.js';
import { filterOutUntrustedFiles } from '../../src/core/security/filterOutUntrustedFiles.js';
import { validateFileSafety } from '../../src/core/security/validateFileSafety.js';
import type { WorkerOptions } from '../../src/shared/processConcurrency.js';
import { isWindows } from '../testing/testUtils.js';

const mockCollectFileInitTaskRunner = <T, R>(_options: WorkerOptions) => {
  return {
    run: async (task: T) => {
      return (await fileCollectWorker(task as FileCollectTask)) as R;
    },
    cleanup: async () => {
      // Mock cleanup - no-op for tests
    },
  };
};

describe.runIf(!isWindows)('End-to-End Line Limit Workflow Tests', () => {
  let tempDir: string;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(async () => {
    // Create a temporary directory for each test
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'repomix-e2e-line-limit-test-'));

    // Store original environment
    originalEnv = { ...process.env };

    // Clear environment variable for clean testing
    delete process.env.REPOMIX_LINE_LIMIT;

    // Mock clipboard functions
    vi.mock('../../src/core/packager/copyToClipboardIfEnabled.js');
  });

  afterEach(async () => {
    // Restore original environment
    process.env = originalEnv;

    // Restore mocks
    vi.restoreAllMocks();

    // Clean up temporary directory after each test
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  test('should process complete workflow with line limit in XML format', async () => {
    // Create test repository structure
    const srcDir = path.join(tempDir, 'src');
    await fs.mkdir(srcDir, { recursive: true });

    // Create multiple files with different sizes
    await fs.writeFile(
      path.join(srcDir, 'large.js'),
      `// Large JavaScript file
function function1() {
  console.log('This is function 1');
  return 'result1';
}

function function2() {
  console.log('This is function 2');
  return 'result2';
}

function function3() {
  console.log('This is function 3');
  return 'result3';
}

function function4() {
  console.log('This is function 4');
  return 'result4';
}

function function5() {
  console.log('This is function 5');
  return 'result5';
}

const variable1 = 'This is a variable';
const variable2 = 'This is another variable';

export { function1, function2, function3, function4, function5, variable1, variable2 };`,
    );

    await fs.writeFile(
      path.join(srcDir, 'small.js'),
      `// Small JavaScript file
export const hello = () => console.log('Hello World');`,
    );

    await fs.writeFile(
      path.join(srcDir, 'medium.ts'),
      `// Medium TypeScript file
interface User {
  id: number;
  name: string;
  email: string;
}

class UserService {
  private users: User[] = [];

  addUser(user: User): void {
    this.users.push(user);
  }

  getUser(id: number): User | undefined {
    return this.users.find(user => user.id === id);
  }

  getAllUsers(): User[] {
    return [...this.users];
  }
}

export { UserService, User };`,
    );

    // Configure with line limit
    const config = mergeConfigs(
      tempDir,
      {},
      {
        output: {
          lineLimit: 10,
          style: 'xml',
          fileSummary: true,
          directoryStructure: true,
          files: true,
        },
      },
    );

    // Run the complete packager workflow
    const result = await pack([srcDir], config, () => {}, {
      searchFiles,
      sortPaths: (filePaths) => filePaths,
      collectFiles: (filePaths, rootDir, config, progressCallback) => {
        return collectFiles(filePaths, rootDir, config, progressCallback, {
          initTaskRunner: mockCollectFileInitTaskRunner,
        });
      },
      processFiles: async (rawFiles, config, _progressCallback) => {
        const processedFiles = [];
        for (const rawFile of rawFiles) {
          processedFiles.push(await fileProcessWorker({ rawFile, config }));
        }
        return processedFiles;
      },
      generateOutput,
      validateFileSafety: (rawFiles, progressCallback, config) => {
        const gitDiffMock: GitDiffResult = {
          workTreeDiffContent: '',
          stagedDiffContent: '',
        };
        return validateFileSafety(rawFiles, progressCallback, config, gitDiffMock, undefined, {
          runSecurityCheck: async () => [],
          filterOutUntrustedFiles,
        });
      },
      writeOutputToDisk,
      copyToClipboardIfEnabled,
      calculateMetrics: async (processedFiles, _output, _progressCallback, _config, _gitDiffResult, _gitLogResult) => {
        return {
          totalFiles: processedFiles.length,
          totalCharacters: processedFiles.reduce((acc, file) => acc + file.content.length, 0),
          totalTokens: processedFiles.reduce((acc, file) => acc + file.content.split(/\s+/).length, 0),
          gitDiffTokenCount: 0,
          gitLogTokenCount: 0,
          fileCharCounts: processedFiles.reduce(
            (acc, file) => {
              acc[file.path] = file.content.length;
              return acc;
            },
            {} as Record<string, number>,
          ),
          fileTokenCounts: processedFiles.reduce(
            (acc, file) => {
              acc[file.path] = file.content.split(/\s+/).length;
              return acc;
            },
            {} as Record<string, number>,
          ),
          fileOriginalTokenCounts: processedFiles.reduce(
            (acc, file) => {
              if (file.originalContent) {
                acc[file.path] = file.originalContent.split(/\s+/).length;
              }
              return acc;
            },
            {} as Record<string, number>,
          ),
          suspiciousFilesResults: [],
          suspiciousGitDiffResults: [],
          suspiciousGitLogResults: [],
          processedFiles,
          safeFilePaths: processedFiles.map((f) => f.path),
          skippedFiles: [],
        };
      },
    });

    // Verify results
    expect(result.processedFiles).toHaveLength(3);

    // Check that all files have truncation info
    result.processedFiles.forEach((file) => {
      expect(file.truncation).toBeDefined();
      expect(file.truncation!.lineLimit).toBe(10);
    });

    // Generate output and verify structure
    const output = await generateOutput([srcDir], config, result.processedFiles, [
      'src/large.js',
      'src/small.js',
      'src/medium.ts',
    ]);

    expect(output).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(output).toContain('<repomix>');
    expect(output).toContain('<files>');
    expect(output).toContain('</files>');
    expect(output).toContain('</repomix>');
  });

  test('should process complete workflow with line limit in Markdown format', async () => {
    const srcDir = path.join(tempDir, 'src');
    await fs.mkdir(srcDir, { recursive: true });

    await fs.writeFile(
      path.join(srcDir, 'test.py'),
      `# Python Test File
import os
import sys
from typing import List, Dict

class DataProcessor:
    def __init__(self):
        self.data = []
    
    def process_data(self, input_data: List[str]) -> Dict:
        """Process the input data and return results."""
        results = {}
        for item in input_data:
            results[item] = len(item)
        return results
    
    def save_results(self, results: Dict, filename: str) -> None:
        """Save results to file."""
        with open(filename, 'w') as f:
            for key, value in results.items():
                f.write(f"{key}: {value}\\n")

if __name__ == "__main__":
    processor = DataProcessor()
    data = ["apple", "banana", "cherry", "date"]
    results = processor.process_data(data)
    processor.save_results(results, "output.txt")`,
    );

    const config = mergeConfigs(
      tempDir,
      {},
      {
        output: {
          lineLimit: 15,
          style: 'markdown',
          fileSummary: true,
          directoryStructure: true,
          files: true,
        },
      },
    );

    const result = await pack([srcDir], config, () => {}, {
      searchFiles,
      sortPaths: (filePaths) => filePaths,
      collectFiles: (filePaths, rootDir, config, progressCallback) => {
        return collectFiles(filePaths, rootDir, config, progressCallback, {
          initTaskRunner: mockCollectFileInitTaskRunner,
        });
      },
      processFiles: async (rawFiles, config, _progressCallback) => {
        const processedFiles = [];
        for (const rawFile of rawFiles) {
          processedFiles.push(await fileProcessWorker({ rawFile, config }));
        }
        return processedFiles;
      },
      generateOutput,
      validateFileSafety: (rawFiles, progressCallback, config) => {
        const gitDiffMock: GitDiffResult = {
          workTreeDiffContent: '',
          stagedDiffContent: '',
        };
        return validateFileSafety(rawFiles, progressCallback, config, gitDiffMock, undefined, {
          runSecurityCheck: async () => [],
          filterOutUntrustedFiles,
        });
      },
      writeOutputToDisk,
      copyToClipboardIfEnabled,
      calculateMetrics: async (processedFiles, _output, _progressCallback, _config, _gitDiffResult, _gitLogResult) => {
        return {
          totalFiles: processedFiles.length,
          totalCharacters: processedFiles.reduce((acc, file) => acc + file.content.length, 0),
          totalTokens: processedFiles.reduce((acc, file) => acc + file.content.split(/\s+/).length, 0),
          gitDiffTokenCount: 0,
          gitLogTokenCount: 0,
          fileCharCounts: processedFiles.reduce(
            (acc, file) => {
              acc[file.path] = file.content.length;
              return acc;
            },
            {} as Record<string, number>,
          ),
          fileTokenCounts: processedFiles.reduce(
            (acc, file) => {
              acc[file.path] = file.content.split(/\s+/).length;
              return acc;
            },
            {} as Record<string, number>,
          ),
          fileOriginalTokenCounts: processedFiles.reduce(
            (acc, file) => {
              if (file.originalContent) {
                acc[file.path] = file.originalContent.split(/\s+/).length;
              }
              return acc;
            },
            {} as Record<string, number>,
          ),
          suspiciousFilesResults: [],
          suspiciousGitDiffResults: [],
          suspiciousGitLogResults: [],
          processedFiles,
          safeFilePaths: processedFiles.map((f) => f.path),
          skippedFiles: [],
        };
      },
    });

    const output = await generateOutput([srcDir], config, result.processedFiles, ['src/test.py']);

    expect(output).toContain('# Repository Structure');
    expect(output).toContain('## Files');
    expect(output).toContain('```');
    expect(output).toContain('test.py');
  });

  test('should process complete workflow with line limit in Plain format', async () => {
    const srcDir = path.join(tempDir, 'src');
    await fs.mkdir(srcDir, { recursive: true });

    await fs.writeFile(
      path.join(srcDir, 'test.go'),
      `package main

import (
	"fmt"
	"log"
	"net/http"
	"time"
)

type Server struct {
	port    string
	handler http.Handler
}

func NewServer(port string, handler http.Handler) *Server {
	return &Server{
		port:    port,
		handler: handler,
	}
}

func (s *Server) Start() error {
	server := &http.Server{
		Addr:    ":" + s.port,
		Handler: s.handler,
	}

	fmt.Printf("Starting server on port %s\\n", s.port)
	return server.ListenAndServe()
}

func main() {
	mux := http.NewServeMux()
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintf(w, "Hello, World!")
	})

	server := NewServer("8080", mux)
	if err := server.Start(); err != nil {
		log.Fatal(err)
	}
}`,
    );

    const config = mergeConfigs(
      tempDir,
      {},
      {
        output: {
          lineLimit: 12,
          style: 'plain',
          fileSummary: true,
          directoryStructure: true,
          files: true,
        },
      },
    );

    const result = await pack([srcDir], config, () => {}, {
      searchFiles,
      sortPaths: (filePaths) => filePaths,
      collectFiles: (filePaths, rootDir, config, progressCallback) => {
        return collectFiles(filePaths, rootDir, config, progressCallback, {
          initTaskRunner: mockCollectFileInitTaskRunner,
        });
      },
      processFiles: async (rawFiles, config, _progressCallback) => {
        const processedFiles = [];
        for (const rawFile of rawFiles) {
          processedFiles.push(await fileProcessWorker({ rawFile, config }));
        }
        return processedFiles;
      },
      generateOutput,
      validateFileSafety: (rawFiles, progressCallback, config) => {
        const gitDiffMock: GitDiffResult = {
          workTreeDiffContent: '',
          stagedDiffContent: '',
        };
        return validateFileSafety(rawFiles, progressCallback, config, gitDiffMock, undefined, {
          runSecurityCheck: async () => [],
          filterOutUntrustedFiles,
        });
      },
      writeOutputToDisk,
      copyToClipboardIfEnabled,
      calculateMetrics: async (processedFiles, _output, _progressCallback, _config, _gitDiffResult, _gitLogResult) => {
        return {
          totalFiles: processedFiles.length,
          totalCharacters: processedFiles.reduce((acc, file) => acc + file.content.length, 0),
          totalTokens: processedFiles.reduce((acc, file) => acc + file.content.split(/\s+/).length, 0),
          gitDiffTokenCount: 0,
          gitLogTokenCount: 0,
          fileCharCounts: processedFiles.reduce(
            (acc, file) => {
              acc[file.path] = file.content.length;
              return acc;
            },
            {} as Record<string, number>,
          ),
          fileTokenCounts: processedFiles.reduce(
            (acc, file) => {
              acc[file.path] = file.content.split(/\s+/).length;
              return acc;
            },
            {} as Record<string, number>,
          ),
          fileOriginalTokenCounts: processedFiles.reduce(
            (acc, file) => {
              if (file.originalContent) {
                acc[file.path] = file.originalContent.split(/\s+/).length;
              }
              return acc;
            },
            {} as Record<string, number>,
          ),
          suspiciousFilesResults: [],
          suspiciousGitDiffResults: [],
          suspiciousGitLogResults: [],
          processedFiles,
          safeFilePaths: processedFiles.map((f) => f.path),
          skippedFiles: [],
        };
      },
    });

    const output = await generateOutput([srcDir], config, result.processedFiles, ['src/test.go']);

    expect(output).toContain('Repository Structure:');
    expect(output).toContain('Files:');
    expect(output).toContain('test.go');
  });

  test('should process complete workflow with line limit in JSON format', async () => {
    const srcDir = path.join(tempDir, 'src');
    await fs.mkdir(srcDir, { recursive: true });

    await fs.writeFile(
      path.join(srcDir, 'test.java'),
      `package com.example;

import java.util.*;
import java.io.*;

public class DataAnalyzer {
    private List<String> data;
    private Map<String, Integer> wordCounts;
    
    public DataAnalyzer() {
        this.data = new ArrayList<>();
        this.wordCounts = new HashMap<>();
    }
    
    public void loadData(String filename) throws IOException {
        try (BufferedReader reader = new BufferedReader(new FileReader(filename))) {
            String line;
            while ((line = reader.readLine()) != null) {
                data.add(line);
            }
        }
    }
    
    public void analyzeWords() {
        for (String line : data) {
            String[] words = line.split("\\\\s+");
            for (String word : words) {
                word = word.toLowerCase().replaceAll("[^a-zA-Z]", "");
                if (!word.isEmpty()) {
                    wordCounts.put(word, wordCounts.getOrDefault(word, 0) + 1);
                }
            }
        }
    }
    
    public void printResults() {
        System.out.println("Word Count Results:");
        wordCounts.entrySet().stream()
            .sorted(Map.Entry.<String, Integer>comparingByValue().reversed())
            .forEach(entry -> System.out.println(entry.getKey() + ": " + entry.getValue()));
    }
    
    public static void main(String[] args) {
        try {
            DataAnalyzer analyzer = new DataAnalyzer();
            analyzer.loadData("input.txt");
            analyzer.analyzeWords();
            analyzer.printResults();
        } catch (IOException e) {
            System.err.println("Error: " + e.getMessage());
        }
    }
}`,
    );

    const config = mergeConfigs(
      tempDir,
      {},
      {
        output: {
          lineLimit: 20,
          style: 'json',
          fileSummary: true,
          directoryStructure: true,
          files: true,
        },
      },
    );

    const result = await pack([srcDir], config, () => {}, {
      searchFiles,
      sortPaths: (filePaths) => filePaths,
      collectFiles: (filePaths, rootDir, config, progressCallback) => {
        return collectFiles(filePaths, rootDir, config, progressCallback, {
          initTaskRunner: mockCollectFileInitTaskRunner,
        });
      },
      processFiles: async (rawFiles, config, _progressCallback) => {
        const processedFiles = [];
        for (const rawFile of rawFiles) {
          processedFiles.push(await fileProcessWorker({ rawFile, config }));
        }
        return processedFiles;
      },
      generateOutput,
      validateFileSafety: (rawFiles, progressCallback, config) => {
        const gitDiffMock: GitDiffResult = {
          workTreeDiffContent: '',
          stagedDiffContent: '',
        };
        return validateFileSafety(rawFiles, progressCallback, config, gitDiffMock, undefined, {
          runSecurityCheck: async () => [],
          filterOutUntrustedFiles,
        });
      },
      writeOutputToDisk,
      copyToClipboardIfEnabled,
      calculateMetrics: async (processedFiles, _output, _progressCallback, _config, _gitDiffResult, _gitLogResult) => {
        return {
          totalFiles: processedFiles.length,
          totalCharacters: processedFiles.reduce((acc, file) => acc + file.content.length, 0),
          totalTokens: processedFiles.reduce((acc, file) => acc + file.content.split(/\s+/).length, 0),
          gitDiffTokenCount: 0,
          gitLogTokenCount: 0,
          fileCharCounts: processedFiles.reduce(
            (acc, file) => {
              acc[file.path] = file.content.length;
              return acc;
            },
            {} as Record<string, number>,
          ),
          fileTokenCounts: processedFiles.reduce(
            (acc, file) => {
              acc[file.path] = file.content.split(/\s+/).length;
              return acc;
            },
            {} as Record<string, number>,
          ),
          fileOriginalTokenCounts: processedFiles.reduce(
            (acc, file) => {
              if (file.originalContent) {
                acc[file.path] = file.originalContent.split(/\s+/).length;
              }
              return acc;
            },
            {} as Record<string, number>,
          ),
          suspiciousFilesResults: [],
          suspiciousGitDiffResults: [],
          suspiciousGitLogResults: [],
          processedFiles,
          safeFilePaths: processedFiles.map((f) => f.path),
          skippedFiles: [],
        };
      },
    });

    const output = await generateOutput([srcDir], config, result.processedFiles, ['src/test.java']);

    // Parse JSON output to verify structure
    const jsonOutput = JSON.parse(output);
    expect(jsonOutput).toHaveProperty('directoryStructure');
    expect(jsonOutput).toHaveProperty('files');
    expect(jsonOutput).toHaveProperty('summary');
    expect(Array.isArray(jsonOutput.files)).toBe(true);
    expect(jsonOutput.files.length).toBeGreaterThan(0);
  });

  test('should handle multi-file repository with line limiting', async () => {
    // Create a more complex repository structure
    const srcDir = path.join(tempDir, 'src');
    const libDir = path.join(tempDir, 'lib');
    const testsDir = path.join(tempDir, 'tests');

    await fs.mkdir(srcDir, { recursive: true });
    await fs.mkdir(libDir, { recursive: true });
    await fs.mkdir(testsDir, { recursive: true });

    // Create files in different directories
    await fs.writeFile(
      path.join(srcDir, 'app.js'),
      `// Main application file
const express = require('express');
const cors = require('cors');
const database = require('../lib/database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get('/api/users', async (req, res) => {
  try {
    const users = await database.getUsers();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/posts', async (req, res) => {
  try {
    const posts = await database.getPosts();
    res.json(posts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/posts', async (req, res) => {
  try {
    const post = await database.createPost(req.body);
    res.status(201).json(post);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(\`Server running on port \${PORT}\`);
});

module.exports = app;`,
    );

    await fs.writeFile(
      path.join(libDir, 'database.js'),
      `// Database module
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
  constructor(dbPath) {
    this.db = new sqlite3.Database(dbPath);
    this.init();
  }

  async init() {
    await this.run(\`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    \`);

    await this.run(\`
      CREATE TABLE IF NOT EXISTS posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        user_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    \`);
  }

  async run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve(this);
      });
    });
  }

  async get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  async all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  async getUsers() {
    return this.all('SELECT * FROM users ORDER BY created_at DESC');
  }

  async getPosts() {
    return this.all(\`
      SELECT p.*, u.name as author_name 
      FROM posts p 
      JOIN users u ON p.user_id = u.id 
      ORDER BY p.created_at DESC
    \`);
  }

  async createPost(postData) {
    const { title, content, user_id } = postData;
    const result = await this.run(
      'INSERT INTO posts (title, content, user_id) VALUES (?, ?, ?)',
      [title, content, user_id]
    );
    return this.get('SELECT * FROM posts WHERE id = ?', [result.lastID]);
  }

  close() {
    this.db.close();
  }
}

const db = new Database(path.join(__dirname, '../data/app.db'));

module.exports = db;`,
    );

    await fs.writeFile(
      path.join(testsDir, 'app.test.js'),
      `// Application tests
const request = require('supertest');
const app = require('../src/app');

describe('API Endpoints', () => {
  describe('GET /api/users', () => {
    it('should return a list of users', async () => {
      const response = await request(app)
        .get('/api/users')
        .expect(200);
      
      expect(response.body).toBeInstanceOf(Array);
    });
  });

  describe('GET /api/posts', () => {
    it('should return a list of posts', async () => {
      const response = await request(app)
        .get('/api/posts')
        .expect(200);
      
      expect(response.body).toBeInstanceOf(Array);
    });
  });

  describe('POST /api/posts', () => {
    it('should create a new post', async () => {
      const postData = {
        title: 'Test Post',
        content: 'This is a test post',
        user_id: 1
      };

      const response = await request(app)
        .post('/api/posts')
        .send(postData)
        .expect(201);

      expect(response.body.title).toBe(postData.title);
      expect(response.body.content).toBe(postData.content);
    });
  });
});`,
    );

    const config = mergeConfigs(
      tempDir,
      {},
      {
        output: {
          lineLimit: 15,
          style: 'xml',
          fileSummary: true,
          directoryStructure: true,
          files: true,
        },
      },
    );

    const result = await pack([tempDir], config, () => {}, {
      searchFiles,
      sortPaths: (filePaths) => filePaths,
      collectFiles: (filePaths, rootDir, config, progressCallback) => {
        return collectFiles(filePaths, rootDir, config, progressCallback, {
          initTaskRunner: mockCollectFileInitTaskRunner,
        });
      },
      processFiles: async (rawFiles, config, _progressCallback) => {
        const processedFiles = [];
        for (const rawFile of rawFiles) {
          processedFiles.push(await fileProcessWorker({ rawFile, config }));
        }
        return processedFiles;
      },
      generateOutput,
      validateFileSafety: (rawFiles, progressCallback, config) => {
        const gitDiffMock: GitDiffResult = {
          workTreeDiffContent: '',
          stagedDiffContent: '',
        };
        return validateFileSafety(rawFiles, progressCallback, config, gitDiffMock, undefined, {
          runSecurityCheck: async () => [],
          filterOutUntrustedFiles,
        });
      },
      writeOutputToDisk,
      copyToClipboardIfEnabled,
      calculateMetrics: async (processedFiles, _output, _progressCallback, _config, _gitDiffResult, _gitLogResult) => {
        return {
          totalFiles: processedFiles.length,
          totalCharacters: processedFiles.reduce((acc, file) => acc + file.content.length, 0),
          totalTokens: processedFiles.reduce((acc, file) => acc + file.content.split(/\s+/).length, 0),
          gitDiffTokenCount: 0,
          gitLogTokenCount: 0,
          fileCharCounts: processedFiles.reduce(
            (acc, file) => {
              acc[file.path] = file.content.length;
              return acc;
            },
            {} as Record<string, number>,
          ),
          fileTokenCounts: processedFiles.reduce(
            (acc, file) => {
              acc[file.path] = file.content.split(/\s+/).length;
              return acc;
            },
            {} as Record<string, number>,
          ),
          fileOriginalTokenCounts: processedFiles.reduce(
            (acc, file) => {
              if (file.originalContent) {
                acc[file.path] = file.originalContent.split(/\s+/).length;
              }
              return acc;
            },
            {} as Record<string, number>,
          ),
          suspiciousFilesResults: [],
          suspiciousGitDiffResults: [],
          suspiciousGitLogResults: [],
          processedFiles,
          safeFilePaths: processedFiles.map((f) => f.path),
          skippedFiles: [],
        };
      },
    });

    // Verify all files were processed
    expect(result.processedFiles.length).toBeGreaterThan(0);

    // Check that all files have truncation info
    result.processedFiles.forEach((file) => {
      expect(file.truncation).toBeDefined();
      expect(file.truncation!.lineLimit).toBe(15);
    });

    // Generate output
    const output = await generateOutput(
      [tempDir],
      config,
      result.processedFiles,
      result.processedFiles.map((f) => f.path),
    );

    expect(output).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(output).toContain('<repomix>');
    expect(output).toContain('<files>');
    expect(output).toContain('</files>');
    expect(output).toContain('</repomix>');
  });

  test('should handle line limiting with additional options', async () => {
    const srcDir = path.join(tempDir, 'src');
    await fs.mkdir(srcDir, { recursive: true });

    await fs.writeFile(
      path.join(srcDir, 'complex.js'),
      `// Complex JavaScript file with comments
/**
 * Utility class for string manipulation
 */
class StringUtils {
  /**
   * Converts a string to camel case
   * @param {string} str - Input string
   * @returns {string} Camel case string
   */
  static toCamelCase(str) {
    return str.replace(/([-_][a-z])/g, (group) =>
      group.toUpperCase().replace('-', '').replace('_', '')
    );
  }

  /**
   * Converts a string to snake case
   * @param {string} str - Input string
   * @returns {string} Snake case string
   */
  static toSnakeCase(str) {
    return str.replace(/[A-Z]/g, letter => \`_\${letter.toLowerCase()}\`);
  }

  /**
   * Capitalizes the first letter of a string
   * @param {string} str - Input string
   * @returns {string} Capitalized string
   */
  static capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Truncates a string to specified length
   * @param {string} str - Input string
   * @param {number} length - Maximum length
   * @returns {string} Truncated string
   */
  static truncate(str, length) {
    if (str.length <= length) return str;
    return str.substring(0, length) + '...';
  }

  /**
   * Checks if a string is empty or contains only whitespace
   * @param {string} str - Input string
   * @returns {boolean} True if string is empty
   */
  static isEmpty(str) {
    return !str || str.trim().length === 0;
  }

  /**
   * Removes all whitespace from a string
   * @param {string} str - Input string
   * @returns {string} String without whitespace
   */
  static removeWhitespace(str) {
    return str.replace(/\\s/g, '');
  }
}

module.exports = StringUtils;`,
    );

    const config = mergeConfigs(
      tempDir,
      {},
      {
        output: {
          lineLimit: 8,
          style: 'xml',
          fileSummary: true,
          directoryStructure: true,
          files: true,
          removeComments: true,
          removeEmptyLines: true,
          showLineNumbers: true,
        },
      },
    );

    const result = await pack([srcDir], config, () => {}, {
      searchFiles,
      sortPaths: (filePaths) => filePaths,
      collectFiles: (filePaths, rootDir, config, progressCallback) => {
        return collectFiles(filePaths, rootDir, config, progressCallback, {
          initTaskRunner: mockCollectFileInitTaskRunner,
        });
      },
      processFiles: async (rawFiles, config, _progressCallback) => {
        const processedFiles = [];
        for (const rawFile of rawFiles) {
          processedFiles.push(await fileProcessWorker({ rawFile, config }));
        }
        return processedFiles;
      },
      generateOutput,
      validateFileSafety: (rawFiles, progressCallback, config) => {
        const gitDiffMock: GitDiffResult = {
          workTreeDiffContent: '',
          stagedDiffContent: '',
        };
        return validateFileSafety(rawFiles, progressCallback, config, gitDiffMock, undefined, {
          runSecurityCheck: async () => [],
          filterOutUntrustedFiles,
        });
      },
      writeOutputToDisk,
      copyToClipboardIfEnabled,
      calculateMetrics: async (processedFiles, _output, _progressCallback, _config, _gitDiffResult, _gitLogResult) => {
        return {
          totalFiles: processedFiles.length,
          totalCharacters: processedFiles.reduce((acc, file) => acc + file.content.length, 0),
          totalTokens: processedFiles.reduce((acc, file) => acc + file.content.split(/\s+/).length, 0),
          gitDiffTokenCount: 0,
          gitLogTokenCount: 0,
          fileCharCounts: processedFiles.reduce(
            (acc, file) => {
              acc[file.path] = file.content.length;
              return acc;
            },
            {} as Record<string, number>,
          ),
          fileTokenCounts: processedFiles.reduce(
            (acc, file) => {
              acc[file.path] = file.content.split(/\s+/).length;
              return acc;
            },
            {} as Record<string, number>,
          ),
          fileOriginalTokenCounts: processedFiles.reduce(
            (acc, file) => {
              if (file.originalContent) {
                acc[file.path] = file.originalContent.split(/\s+/).length;
              }
              return acc;
            },
            {} as Record<string, number>,
          ),
          suspiciousFilesResults: [],
          suspiciousGitDiffResults: [],
          suspiciousGitLogResults: [],
          processedFiles,
          safeFilePaths: processedFiles.map((f) => f.path),
          skippedFiles: [],
        };
      },
    });

    // Verify truncation info
    const fileResult = result.processedFiles.find((f) => f.path.includes('complex.js'));
    expect(fileResult).toBeDefined();
    expect(fileResult!.truncation).toBeDefined();
    expect(fileResult!.truncation!.lineLimit).toBe(8);

    // Generate output
    const output = await generateOutput([srcDir], config, result.processedFiles, ['src/complex.js']);

    expect(output).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(output).toContain('<repomix>');
    expect(output).toContain('<files>');
    expect(output).toContain('</files>');
    expect(output).toContain('</repomix>');
  });
});
