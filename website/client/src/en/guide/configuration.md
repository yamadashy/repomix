# Configuration

## Quick Start

Create configuration file:
```bash
repomix --init
```

## Configuration File

`repomix.config.json`:
```json
{
  "output": {
    "filePath": "repomix-output.xml",
    "style": "xml",
    "parsableStyle": true,
    "compress": false,
    "headerText": "Custom header text",
    "instructionFilePath": "repomix-instruction.md",
    "fileSummary": true,
    "directoryStructure": true,
    "removeComments": false,
    "removeEmptyLines": false,
    "topFilesLength": 5,
    "showLineNumbers": false,
    "copyToClipboard": false,
    "includeEmptyDirectories": false
  },
  "include": ["**/*"],
  "ignore": {
    "useGitignore": true,
    "useDefaultPatterns": true,
    "customPatterns": ["tmp/", "*.log"]
  },
  "security": {
    "enableSecurityCheck": true
  }
}
```

## Global Configuration

Create global configuration:
```bash
repomix --init --global
```

Location:
- Windows: `%LOCALAPPDATA%\Repomix\repomix.config.json`
- macOS/Linux: `~/.config/repomix/repomix.config.json`

## Ignore Patterns

Priority:
1. CLI options (`--ignore`)
2. `.repomixignore`
3. `.gitignore` and `.git/info/exclude`
4. Default patterns

`.repomixignore` example:
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

Common patterns included by default:
```text
node_modules/**
.git/**
coverage/**
dist/**
```

Full list: [defaultIgnore.ts](https://github.com/yamadashy/repomix/blob/main/src/config/defaultIgnore.ts)

## Examples

### Code Compression

When `output.compress` is set to `true`, Repomix will intelligently extract essential code structures while removing implementation details. This is particularly useful for reducing token count while maintaining important structural information.

For example, this code:

```typescript
const calculateTotal = (items: ShoppingItem[]) => {
  let total = 0;
  for (const item of items) {
    total += item.price * item.quantity;
  }
  return total;
}
interface Item {
  name: string;
  price: number;
  quantity: number;
}
```

Will be compressed to:

```typescript
const calculateTotal = (items: ShoppingItem[]) => {
interface Item {
```

### Comment Removal
