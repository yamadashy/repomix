# Using Repomix as a Library

In addition to using Repomix as a CLI tool, you can integrate its functionality directly into your Node.js applications.

## Installation

Install Repomix as a dependency in your project:

```bash
npm install repomix
```

## Basic Usage

The simplest way to use Repomix is through the `runCli` function, which provides the same functionality as the command-line interface:

```javascript
import { runCli, type CliOptions } from 'repomix';

// Process current directory with custom options
async function packProject() {
  const options = {
    output: 'output.xml',
    style: 'xml',
    compress: true,
    quiet: true
  } as CliOptions;
  
  const result = await runCli(['.'], process.cwd(), options);
  return result.packResult;
}
```

The `result.packResult` contains information about the processed files, including:
- `totalFiles`: Number of files processed
- `totalCharacters`: Total character count
- `totalTokens`: Total token count (useful for LLM context limits)
- `fileCharCounts`: Character counts per file
- `fileTokenCounts`: Token counts per file

## Processing Remote Repositories

You can clone and process a remote repository:

```javascript
import { runCli, type CliOptions } from 'repomix';

// Clone and process a GitHub repo
async function processRemoteRepo(repoUrl) {
  const options = {
    remote: repoUrl,
    output: 'output.xml',
    compress: true
  } as CliOptions;
  
  return await runCli(['.'], process.cwd(), options);
}
```

## Using Core Components

For more control, you can use Repomix's low-level APIs directly:

```javascript
import { searchFiles, collectFiles, processFiles, TokenCounter } from 'repomix';

async function analyzeFiles(directory) {
  // Find and collect files
  const { filePaths } = await searchFiles(directory, { /* config */ });
  const rawFiles = await collectFiles(filePaths, directory);
  const processedFiles = await processFiles(rawFiles, { /* config */ });
  
  // Count tokens
  const tokenCounter = new TokenCounter('o200k_base');
  
  // Return analysis results
  return processedFiles.map(file => ({
    path: file.path,
    tokens: tokenCounter.countTokens(file.content)
  }));
}
```

## Bundling

When bundling repomix with tools like Rolldown or esbuild, some dependencies must remain external and WASM files need to be copied:

**External dependencies (cannot be bundled):**
- `tinypool` - Spawns worker threads using file paths
- `tiktoken` - Loads WASM files dynamically at runtime

**WASM files to copy:**
- `web-tree-sitter.wasm` → Same directory as bundled JS (required for code compression feature)
- Tree-sitter language files → Directory specified by `REPOMIX_WASM_DIR` environment variable

For a working example, see [website/server/scripts/bundle.mjs](https://github.com/yamadashy/repomix/blob/main/website/server/scripts/bundle.mjs).

## Real-World Example

The Repomix website ([repomix.com](https://repomix.com)) uses Repomix as a library to process remote repositories. You can see the implementation in [website/server/src/remoteRepo.ts](https://github.com/yamadashy/repomix/blob/main/website/server/src/remoteRepo.ts). 
