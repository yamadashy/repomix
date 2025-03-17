# Output Formats

Repomix supports three output formats:
- Plain Text (default)
- XML
- Markdown

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

## XML Format

```bash
repomix --style xml
```

XML format is optimized for AI processing:

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
XML tags help AI models like Claude parse content more accurately. [Claude Documentation](https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/use-xml-tags) recommends using XML tags for structured prompts.
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
- Use XML for Claude (best parsing accuracy)
- Use Markdown for general readability
- Use Plain Text for simplicity and universal compatibility

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
