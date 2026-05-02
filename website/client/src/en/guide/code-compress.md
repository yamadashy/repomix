---
title: Code Compression
description: Use Tree-sitter based code compression in Repomix to reduce token usage while preserving imports, exports, classes, functions, interfaces, and structure.
---

# Code Compression

Code compression is a powerful feature that intelligently extracts essential code structures while removing implementation details. This is particularly useful for reducing token count while maintaining important structural information about your codebase.

> [!NOTE]  
> This is an experimental feature that we'll be actively improving based on user feedback and real-world usage

## Basic Usage

Enable code compression using the `--compress` flag:

```bash
repomix --compress
```

You can also use it with remote repositories:

```bash
repomix --remote user/repo --compress
```

## How It Works

The compression algorithm processes code using tree-sitter parsing to extract and preserve essential structural elements while removing implementation details.

The compression preserves:
- Function and method signatures
- Interface and type definitions
- Class structures and properties
- Important structural elements

While removing:
- Function and method implementations
- Loop and conditional logic details
- Internal variable declarations
- Implementation-specific code

### Example

Original TypeScript code:

```typescript
import { ShoppingItem } from './shopping-item';

/**
 * Calculate the total price of shopping items
 */
const calculateTotal = (
  items: ShoppingItem[]
) => {
  let total = 0;
  for (const item of items) {
    total += item.price * item.quantity;
  }
  return total;
}

// Shopping item interface
interface Item {
  name: string;
  price: number;
  quantity: number;
}
```

After compression:

```typescript
import { ShoppingItem } from './shopping-item';
⋮----
/**
 * Calculate the total price of shopping items
 */
const calculateTotal = (
  items: ShoppingItem[]
) => {
⋮----
// Shopping item interface
interface Item {
  name: string;
  price: number;
  quantity: number;
}
```

## Configuration

You can enable compression in your configuration file:

```json
{
  "output": {
    "compress": true
  }
}
```

## Use Cases

Code compression is particularly useful when:
- Analyzing code structure and architecture
- Reducing token count for LLM processing
- Creating high-level documentation
- Understanding code patterns and signatures
- Sharing API and interface designs

## Related Options

You can combine compression with other options:
- `--remove-comments`: Remove code comments (see [Comment Removal](/guide/comment-removal))
- `--remove-empty-lines`: Remove empty lines
- `--output-show-line-numbers`: Add line numbers to output

## Related Resources

- [Comment Removal](/guide/comment-removal) - Remove comments for further token reduction
- [Configuration](/guide/configuration) - Set `output.compress` in your config file
- [Command Line Options](/guide/command-line-options) - Full CLI reference
