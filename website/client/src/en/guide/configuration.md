# Configuration

Repomix can be configured using a configuration file or command-line options. The configuration file allows you to customize various aspects of how Repomix processes and outputs your codebase.

## Configuration File Formats

Repomix supports multiple configuration file formats for flexibility and ease of use.

Repomix will automatically search for configuration files in the following priority order:

1. **TypeScript** (`repomix.config.ts`, `repomix.config.mts`, `repomix.config.cts`)
2. **JavaScript/ES Module** (`repomix.config.js`, `repomix.config.mjs`, `repomix.config.cjs`)
3. **JSON** (`repomix.config.json5`, `repomix.config.jsonc`, `repomix.config.json`)

### JSON Configuration

Create a configuration file in your project directory:
```bash
repomix --init
```

This will create a `repomix.config.json` file with default settings. You can also create a global configuration file that will be used as a fallback when no local configuration is found:

```bash
repomix --init --global
```

### TypeScript Configuration

TypeScript configuration files provide the best developer experience with full type checking and IDE support.

**Installation:**

To use TypeScript or JavaScript configuration with `defineConfig`, you need to install Repomix as a dev dependency:

```bash
npm install -D repomix
```

**Example:**

```typescript
// repomix.config.ts
import { defineConfig } from 'repomix';

export default defineConfig({
  output: {
    filePath: 'output.xml',
    style: 'xml',
    removeComments: true,
  },
  ignore: {
    customPatterns: ['**/node_modules/**', '**/dist/**'],
  },
});
```

**Benefits:**
- ✅ Full TypeScript type checking in your IDE
- ✅ Excellent IDE autocomplete and IntelliSense
- ✅ Use dynamic values (timestamps, environment variables, etc.)

**Dynamic Values Example:**

```typescript
// repomix.config.ts
import { defineConfig } from 'repomix';

// Generate timestamp-based filename
const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');

export default defineConfig({
  output: {
    filePath: `output-${timestamp}.xml`,
    style: 'xml',
  },
});
```

### JavaScript Configuration

JavaScript configuration files work the same as TypeScript, supporting `defineConfig` and dynamic values.

## Configuration Options

| Option                           | Description                                                                                                                  | Default                |
|----------------------------------|------------------------------------------------------------------------------------------------------------------------------|------------------------|
| `input.maxFileSize`              | Maximum file size in bytes to process. Files larger than this will be skipped. Useful for excluding large binary files or data files | `50000000`            |
| `output.filePath`                | The name of the output file. Supports XML, Markdown, and plain text formats                                                   | `"repomix-output.xml"` |
| `output.style`                   | The style of the output (`xml`, `markdown`, `json`, `plain`). Each format has its own advantages for different AI tools              | `"xml"`                |
| `output.parsableStyle`           | Whether to escape the output based on the chosen style schema. Enables better parsing but may increase token count           | `false`                |
| `output.compress`                | Whether to perform intelligent code extraction using Tree-sitter to reduce token count while preserving structure             | `false`                |
| `output.headerText`              | Custom text to include in the file header. Useful for providing context or instructions for AI tools                         | `null`                 |
| `output.instructionFilePath`     | Path to a file containing detailed custom instructions for AI processing                                                     | `null`                 |
| `output.fileSummary`             | Whether to include a summary section at the beginning showing file counts, sizes, and other metrics                          | `true`                 |
| `output.directoryStructure`      | Whether to include the directory structure in the output. Helps AI understand the project organization                       | `true`                 |
| `output.files`                   | Whether to include file contents in the output. Set to false to only include structure and metadata                          | `true`                 |
| `output.removeComments`          | Whether to remove comments from supported file types. Can reduce noise and token count                                       | `false`                |
| `output.removeEmptyLines`        | Whether to remove empty lines from the output to reduce token count                                                          | `false`                |
| `output.showLineNumbers`         | Whether to add line numbers to each line. Helpful for referencing specific parts of code                                     | `false`                |
| `output.truncateBase64`          | Whether to truncate long base64 data strings (e.g., images) to reduce token count                                            | `false`                |
| `output.copyToClipboard`         | Whether to copy the output to system clipboard in addition to saving the file                                                | `false`                |
| `output.splitOutput`             | Split output into multiple numbered files by maximum size per part (e.g., `1000000` for ~1MB). CLI accepts human-readable sizes like `500kb` or `2mb`. Keeps each file under the limit and avoids splitting files across parts | Not set                |
| `output.topFilesLength`          | Number of top files to display in the summary. If set to 0, no summary will be displayed                                     | `5`                    |
| `output.includeEmptyDirectories` | Whether to include empty directories in the repository structure                                                             | `false`                |
| `output.includeFullDirectoryStructure` | When using `include` patterns, whether to display the complete directory tree (respecting ignore patterns) while still processing only the included files. Provides full repository context for AI analysis | `false`                |
| `output.git.sortByChanges`       | Whether to sort files by git change count. Files with more changes appear at the bottom                                      | `true`                 |
| `output.git.sortByChangesMaxCommits` | Maximum number of commits to analyze for git changes. Limits the history depth for performance                           | `100`                  |
| `output.git.includeDiffs`        | Whether to include git diffs in the output. Shows both work tree and staged changes separately                               | `false`                |
| `output.git.includeLogs`         | Whether to include git logs in the output. Shows commit history with dates, messages, and file paths                        | `false`                |
| `output.git.includeLogsCount`    | Number of git log commits to include in the output                                                                          | `50`                   |
| `include`                        | Patterns of files to include using [glob patterns](https://github.com/mrmlnc/fast-glob?tab=readme-ov-file#pattern-syntax)    | `[]`                   |
| `ignore.useGitignore`            | Whether to use patterns from the project's `.gitignore` file                                                                 | `true`                 |
| `ignore.useDotIgnore`            | Whether to use patterns from the project's `.ignore` file                                                                    | `true`                 |
| `ignore.useDefaultPatterns`      | Whether to use default ignore patterns (node_modules, .git, etc.)                                                           | `true`                 |
| `ignore.customPatterns`          | Additional patterns to ignore using [glob patterns](https://github.com/mrmlnc/fast-glob?tab=readme-ov-file#pattern-syntax)   | `[]`                   |
| `security.enableSecurityCheck`   | Whether to perform security checks using Secretlint to detect sensitive information                                          | `true`                 |
| `tokenCount.encoding`            | Token count encoding used by OpenAI's [tiktoken](https://github.com/openai/tiktoken) tokenizer. Use `o200k_base` for GPT-4o, `cl100k_base` for GPT-4/3.5. See [tiktoken model.py](https://github.com/openai/tiktoken/blob/main/tiktoken/model.py#L24) for details. | `"o200k_base"`         |

The configuration file supports [JSON5](https://json5.org/) syntax, which allows:
- Comments (both single-line and multi-line)
- Trailing commas in objects and arrays
- Unquoted property names
- More relaxed string syntax

## Schema Validation

You can enable schema validation for your configuration file by adding the `$schema` property:

```json
{
  "$schema": "https://repomix.com/schemas/latest/schema.json",
  "output": {
    "filePath": "repomix-output.xml",
    "style": "xml"
  }
}
```

This provides auto-completion and validation in editors that support JSON schema.

## Example Configuration File

Here's an example of a complete configuration file (`repomix.config.json`):

```json
{
  "$schema": "https://repomix.com/schemas/latest/schema.json",
  "input": {
    "maxFileSize": 50000000
  },
  "output": {
    "filePath": "repomix-output.xml",
    "style": "xml",
    "parsableStyle": false,
    "compress": false,
    "headerText": "Custom header information for the packed file.",
    "fileSummary": true,
    "directoryStructure": true,
    "files": true,
    "removeComments": false,
    "removeEmptyLines": false,
    "topFilesLength": 5,
    "showLineNumbers": false,
    "truncateBase64": false,
    "copyToClipboard": false,
    "includeEmptyDirectories": false,
    "git": {
      "sortByChanges": true,
      "sortByChangesMaxCommits": 100,
      "includeDiffs": false,
      "includeLogs": false,
      "includeLogsCount": 50
    }
  },
  "include": ["**/*"],
  "ignore": {
    "useGitignore": true,
    "useDefaultPatterns": true,
    // Patterns can also be specified in .repomixignore
    "customPatterns": [
      "additional-folder",
      "**/*.log"
    ],
  },
  "security": {
    "enableSecurityCheck": true
  },
  "tokenCount": {
    "encoding": "o200k_base"
  }
}
```

## Configuration File Locations

Repomix looks for configuration files in the following order:
1. Local configuration file in the current directory (priority order: TS > JS > JSON)
   - TypeScript: `repomix.config.ts`, `repomix.config.mts`, `repomix.config.cts`
   - JavaScript: `repomix.config.js`, `repomix.config.mjs`, `repomix.config.cjs`
   - JSON: `repomix.config.json5`, `repomix.config.jsonc`, `repomix.config.json`
2. Global configuration file (priority order: TS > JS > JSON)
   - Windows:
     - TypeScript: `%LOCALAPPDATA%\Repomix\repomix.config.ts`, `.mts`, `.cts`
     - JavaScript: `%LOCALAPPDATA%\Repomix\repomix.config.js`, `.mjs`, `.cjs`
     - JSON: `%LOCALAPPDATA%\Repomix\repomix.config.json5`, `.jsonc`, `.json`
   - macOS/Linux:
     - TypeScript: `~/.config/repomix/repomix.config.ts`, `.mts`, `.cts`
     - JavaScript: `~/.config/repomix/repomix.config.js`, `.mjs`, `.cjs`
     - JSON: `~/.config/repomix/repomix.config.json5`, `.jsonc`, `.json`

Command-line options take precedence over configuration file settings.

## Include Patterns

Repomix supports specifying files to include using [glob patterns](https://github.com/mrmlnc/fast-glob?tab=readme-ov-file#pattern-syntax). This allows for more flexible and powerful file selection:

- Use `**/*.js` to include all JavaScript files in any directory
- Use `src/**/*` to include all files within the `src` directory and its subdirectories
- Combine multiple patterns like `["src/**/*.js", "**/*.md"]` to include JavaScript files in `src` and all Markdown files

You can specify include patterns in your configuration file:

```json
{
  "include": ["src/**/*", "tests/**/*.test.js"]
}
```

Or use the `--include` command-line option for one-time filtering.

## Ignore Patterns

Repomix offers multiple methods to set ignore patterns for excluding specific files or directories during the packing process:

- **.gitignore**: By default, patterns listed in your project's `.gitignore` files and `.git/info/exclude` are used. This behavior can be controlled with the `ignore.useGitignore` setting or the `--no-gitignore` CLI option.
- **.ignore**: You can use a `.ignore` file in your project root, following the same format as `.gitignore`. This file is respected by tools like ripgrep and the silver searcher, reducing the need to maintain multiple ignore files. This behavior can be controlled with the `ignore.useDotIgnore` setting or the `--no-dot-ignore` CLI option.
- **Default patterns**: Repomix includes a default list of commonly excluded files and directories (e.g., node_modules, .git, binary files). This feature can be controlled with the `ignore.useDefaultPatterns` setting or the `--no-default-patterns` CLI option. Please see [defaultIgnore.ts](https://github.com/yamadashy/repomix/blob/main/src/config/defaultIgnore.ts) for more details.
- **.repomixignore**: You can create a `.repomixignore` file in your project root to define Repomix-specific ignore patterns. This file follows the same format as `.gitignore`.
- **Custom patterns**: Additional ignore patterns can be specified using the `ignore.customPatterns` option in the configuration file. You can overwrite this setting with the `-i, --ignore` command line option.

**Priority Order** (from highest to lowest):

1. Custom patterns (`ignore.customPatterns`)
2. Ignore files (`.repomixignore`, `.ignore`, `.gitignore`, and `.git/info/exclude`):
   - When in nested directories, files in deeper directories have higher priority
   - When in the same directory, these files are merged in no particular order
3. Default patterns (if `ignore.useDefaultPatterns` is true and `--no-default-patterns` is not used)

This approach allows for flexible file exclusion configuration based on your project's needs. It helps optimize the size of the generated pack file by ensuring the exclusion of security-sensitive files and large binary files, while preventing the leakage of confidential information.

**Note:** Binary files are not included in the packed output by default, but their paths are listed in the "Repository Structure" section of the output file. This provides a complete overview of the repository structure while keeping the packed file efficient and text-based. See [Binary Files Handling](#binary-files-handling) for more details.

Example of `.repomixignore`:
```text
# Cache directories
.cache/
tmp/

# Build outputs
dist/
build/

# Logs
*.log
```

## Default Ignore Patterns

When `ignore.useDefaultPatterns` is true, Repomix automatically ignores common patterns:
```text
node_modules/**
.git/**
coverage/**
dist/**
```

For the complete list, see [defaultIgnore.ts](https://github.com/yamadashy/repomix/blob/main/src/config/defaultIgnore.ts)

## Binary Files Handling

Binary files (such as images, PDFs, compiled binaries, archives, etc.) are handled specially to maintain an efficient, text-based output:

- **File Contents**: Binary files are **not included** in the packed output to keep the file text-based and efficient for AI processing
- **Directory Structure**: Binary file **paths are listed** in the directory structure section, providing a complete overview of your repository

This approach ensures you get a complete view of your repository structure while maintaining an efficient, text-based output optimized for AI consumption.

**Example:**

If your repository contains `logo.png` and `app.jar`:
- They will appear in the Directory Structure section
- Their contents will not be included in the Files section

**Directory Structure Output:**
```
src/
  index.ts
  utils.ts
assets/
  logo.png
build/
  app.jar
```

This way, AI tools can understand that these binary files exist in your project structure without processing their binary contents.

**Note:** You can control the maximum file size threshold using the `input.maxFileSize` configuration option (default: 50MB). Files larger than this limit will be skipped entirely.

## Advanced Features

### Code Compression

The code compression feature, enabled with `output.compress: true`, uses [Tree-sitter](https://github.com/tree-sitter/tree-sitter) to intelligently extract essential code structures while removing implementation details. This helps reduce token count while maintaining important structural information.

Key benefits:
- Reduces token count significantly
- Preserves class and function signatures
- Maintains imports and exports
- Keeps type definitions and interfaces
- Removes function bodies and implementation details

For more details and examples, see the [Code Compression Guide](code-compress).

### Git Integration

The `output.git` configuration provides powerful Git-aware features:

- `sortByChanges`: When true, files are sorted by the number of Git changes (commits that modified the file). Files with more changes appear at the bottom of the output. This helps prioritize more actively developed files. Default: `true`
- `sortByChangesMaxCommits`: The maximum number of commits to analyze when counting file changes. Default: `100`
- `includeDiffs`: When true, includes Git differences in the output (includes both work tree and staged changes separately). This allows the reader to see pending changes in the repository. Default: `false`
- `includeLogs`: When true, includes Git commit history in the output. Shows commit dates, messages, and file paths for each commit. This helps AI understand development patterns and file relationships. Default: `false`
- `includeLogsCount`: The number of recent commits to include in the git logs. Default: `50`

Example configuration:
```json
{
  "output": {
    "git": {
      "sortByChanges": true,
      "sortByChangesMaxCommits": 100,
      "includeDiffs": true,
      "includeLogs": true,
      "includeLogsCount": 25
    }
  }
}
```

### Security Checks

When `security.enableSecurityCheck` is enabled, Repomix uses [Secretlint](https://github.com/secretlint/secretlint) to detect sensitive information in your codebase before including it in the output. This helps prevent accidental exposure of:

- API keys
- Access tokens
- Private keys
- Passwords
- Other sensitive credentials

### Comment Removal

When `output.removeComments` is set to `true`, comments are removed from supported file types to reduce output size and focus on essential code content. This can be particularly useful when:

- Working with heavily documented code
- Trying to reduce token count
- Focusing on code structure and logic

For supported languages and detailed examples, see the [Comment Removal Guide](comment-removal).
