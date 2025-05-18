# Code Compression

Code compression is a powerful feature that intelligently extracts essential code structures while removing implementation details. This feature utilizes [Tree-sitter](https://github.com/tree-sitter/tree-sitter) to perform intelligent code extraction, focusing on function and class signatures while preserving important structural information. This is particularly useful for reducing token count while maintaining the architectural understanding of your codebase.

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
- Function and method signatures (parameters and return types)
- Interface and type definitions (property types and structure)
- Class structures and properties (inheritance relationships)
- Important structural elements (imports, exports, module structure)

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
- `--remove-comments`: Remove code comments
- `--remove-empty-lines`: Remove empty lines
- `--output-show-line-numbers`: Add line numbers to output
