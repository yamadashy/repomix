# Configuration

Repomix can be configured using a configuration file (`repomix.config.json`) or command-line options. The configuration file allows you to customize various aspects of how Repomix processes and outputs your codebase.

## Quick Start

Create a configuration file in your project directory:
```bash
repomix --init
```

This will create a `repomix.config.json` file with default settings. You can also create a global configuration file that will be used as a fallback when no local configuration is found:

```bash
repomix --init --global
```

## Configuration File Locations

Repomix looks for configuration files in the following order:
1. Local configuration file (`repomix.config.json`) in the current directory
2. Global configuration file:
   - Windows: `%LOCALAPPDATA%\Repomix\repomix.config.json`
   - macOS/Linux: `~/.config/repomix/repomix.config.json`

Command-line options take precedence over configuration file settings.

## Configuration Options

| Option                           | Description                                                                                                                  | Default                |
|----------------------------------|------------------------------------------------------------------------------------------------------------------------------|------------------------|
| `input.maxFileSize`              | Maximum file size in bytes to process. Files larger than this will be skipped. Useful for excluding large binary files or data files | `50000000`            |
| `output.filePath`                | The name of the output file. Supports XML, Markdown, and plain text formats                                                   | `"repomix-output.xml"` |
| `output.style`                   | The style of the output (`xml`, `markdown`, `plain`). Each format has its own advantages for different AI tools              | `"xml"`                |
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
| `output.copyToClipboard`         | Whether to copy the output to system clipboard in addition to saving the file                                                | `false`                |
| `output.topFilesLength`          | Number of top files to display in the summary. If set to 0, no summary will be displayed                                     | `5`                    |
| `output.includeEmptyDirectories` | Whether to include empty directories in the repository structure                                                             | `false`                |
| `output.git.sortByChanges`       | Whether to sort files by git change count. Files with more changes appear at the bottom                                      | `true`                 |
| `output.git.sortByChangesMaxCommits` | Maximum number of commits to analyze for git changes. Limits the history depth for performance                           | `100`                  |
| `output.git.includeDiffs`        | Whether to include git diffs in the output. Shows both work tree and staged changes separately                               | `false`                |
| `include`                        | Patterns of files to include using [glob patterns](https://github.com/mrmlnc/fast-glob?tab=readme-ov-file#pattern-syntax)    | `[]`                   |
| `ignore.useGitignore`            | Whether to use patterns from the project's `.gitignore` file                                                                 | `true`                 |
| `ignore.useDefaultPatterns`      | Whether to use default ignore patterns (node_modules, .git, etc.)                                                           | `true`                 |
| `ignore.customPatterns`          | Additional patterns to ignore using [glob patterns](https://github.com/mrmlnc/fast-glob?tab=readme-ov-file#pattern-syntax)   | `[]`                   |
| `security.enableSecurityCheck`   | Whether to perform security checks using Secretlint to detect sensitive information                                          | `true`                 |
| `tokenCount.encoding`            | Token count encoding used by OpenAI's [tiktoken](https://github.com/openai/tiktoken) tokenizer. Use `o200k_base` for GPT-4o, `cl100k_base` for GPT-4/3.5. See [tiktoken model.py](https://github.com/openai/tiktoken/blob/main/tiktoken/model.py#L24) for details. | `"o200k_base"`         |

The configuration file supports [JSON5](https://json5.org/) syntax, which allows:
- Comments (both single-line and multi-line)
- Trailing commas in objects and arrays
- Unquoted property names
- More relaxed string syntax

## Example Configuration File

Here's an example of a complete configuration file (`repomix.config.json`):

```json
{
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
    "copyToClipboard": false,
    "includeEmptyDirectories": false,
    "git": {
      "sortByChanges": true,
      "sortByChangesMaxCommits": 100,
      "includeDiffs": false
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

## Ignore Patterns

Repomix provides multiple ways to specify which files should be ignored. The patterns are processed in the following priority order:

1. CLI options (`--ignore`)
2. `.repomixignore` file in the project directory
3. `.gitignore` and `.git/info/exclude` (if `ignore.useGitignore` is true)
4. Default patterns (if `ignore.useDefaultPatterns` is true)

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

Example configuration:
```json
{
  "output": {
    "git": {
      "sortByChanges": true,
      "sortByChangesMaxCommits": 100,
      "includeDiffs": true
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
