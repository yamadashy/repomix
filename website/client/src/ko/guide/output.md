# Output Formats

Repomix supports three output formats:
- XML (default): Most structured format, ideal for AI tools like Claude that parse XML efficiently
- Markdown: Balances readability with structure, great for GitHub and document-oriented workflows
- Plain Text: Simplest format with universal compatibility across all tools and platforms

## XML Format

```bash
repomix --style xml
```

XML format is optimized for AI processing with clearly defined sections and structure:

```xml
This file is a merged representation of the entire codebase...

<file_summary>
(Metadata and AI instructions)
</file_summary>

<directory_structure>
src/
  index.ts
  utils/
    helper.ts
</directory_structure>

<files>
<file path="src/index.ts">
// File contents here
</file>
</files>
```

::: tip Why XML?
XML tags help AI models like Claude parse content more accurately. Claude's documentation [recommends using XML tags](https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/use-xml-tags) for structured prompts, making it easier for the model to understand different sections of your codebase.
:::

## Markdown Format

```bash
repomix --style markdown
```

Markdown provides readable formatting:

```markdown
This file is a merged representation of the entire codebase...

# File Summary
(Metadata and AI instructions)

# Directory Structure
```
src/
index.ts
utils/
helper.ts
```

# Files

## File: src/index.ts
```typescript
// File contents here
```
```

## Usage with AI Models

Each format works well with AI models, but consider:
- Use XML for Claude and other AI models that prefer structured input with clear section delineation
- Use Markdown for general readability and when sharing with humans alongside AI analysis
- Use Plain Text for simplicity, universal compatibility, and when working with tools that don't parse markup

## Customization

Set default format in `repomix.config.json`:
```json
{
  "output": {
    "style": "xml",
    "filePath": "output.xml"
  }
}
```

## Plain Text Format

```bash
repomix --style plain
```

Output structure:
```text
This file is a merged representation of the entire codebase...

================
File Summary
================
(Metadata and AI instructions)

================
Directory Structure
================
src/
  index.ts
  utils/
    helper.ts

================
Files
================

================
File: src/index.ts
================
// File contents here
```
