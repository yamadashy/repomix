# 输出格式

Repomix 支持三种输出格式：
- XML（默认）
- Markdown
- 纯文本

## XML 格式

```bash
repomix --style xml
```

XML 格式针对 AI 处理进行了优化，提供清晰的结构和标签，使 AI 模型能够更准确地理解代码库的组织：

```xml
本文件是整个代码库的合并表示形式...

<file_summary>
（元数据和 AI 指令）
</file_summary>

<directory_structure>
src/
  index.ts
  utils/
    helper.ts
</directory_structure>

<files>
<file path="src/index.ts">
// 文件内容
</file>
</files>
```

XML 格式的主要优势：
- 明确的标签边界，减少内容混淆
- 结构化的文件和目录表示
- 更容易被 AI 模型解析和理解
- 支持嵌套结构，适合复杂代码库

::: tip 为什么选择 XML？
XML 标签有助于像 Claude 这样的 AI 模型更准确地解析内容。[Claude 官方文档](https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/use-xml-tags)推荐使用 XML 标签来构建结构化提示。
:::

## Markdown 格式

```bash
repomix --style markdown
```

Markdown 提供了易读的格式，平衡了人类可读性和结构化表示：

```markdown
本文件是整个代码库的合并表示形式...

# 文件概要
（元数据和 AI 指令）

# 目录结构
```
src/
index.ts
utils/
helper.ts
```

# 文件

## File: src/index.ts
```typescript
// 文件内容
```
```

Markdown 格式的优势：
- 在大多数平台上可读性好
- 代码块支持语法高亮
- 层次结构清晰，使用标题和列表
- 对人类和 AI 都友好的平衡格式

## 在 AI 模型中的使用

每种格式都能在 AI 模型中正常工作，但需要考虑以下几点：
- 对 Claude 使用 XML（解析最准确）
- 对一般可读性使用 Markdown
- 对简单性和通用兼容性使用纯文本

## 自定义设置

在 `repomix.config.json` 中设置默认格式：
```json
{
  "output": {
    "style": "xml",
    "filePath": "output.xml"
  }
}
```

## 纯文本格式

```bash
repomix --style plain
```

纯文本格式提供了最大的兼容性和简单性，适用于任何环境：

```text
本文件是整个代码库的合并表示形式...

================
文件概要
================
（元数据和 AI 指令）

================
目录结构
================
src/
  index.ts
  utils/
    helper.ts

================
文件
================

================
File: src/index.ts
================
// 文件内容
```

纯文本格式的优势：
- 最大的兼容性，适用于任何环境和工具
- 简单明了，没有特殊格式要求
- 使用分隔符清晰区分不同部分
- 适合不支持复杂格式的场景
