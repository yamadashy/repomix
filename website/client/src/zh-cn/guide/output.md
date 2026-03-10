# 输出格式

Repomix 支持四种输出格式：
- XML（默认）
- Markdown
- JSON
- 纯文本

## XML 格式

```bash
repomix --style xml
```

XML 格式针对 AI 处理进行了优化：

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

<git_logs>
<git_log_commit>
<date>2025-08-20 00:47:19 +0900</date>
<message>feat(cli): Add --include-logs option for git commit history</message>
<files>
README.md
src/cli/cliRun.ts
src/core/git/gitCommand.ts
src/core/git/gitLogHandle.ts
src/core/output/outputGenerate.ts
</files>
</git_log_commit>

<git_log_commit>
<date>2025-08-21 00:09:43 +0900</date>
<message>Merge pull request #795 from yamadashy/chore/ratchet-update-ci</message>
<files>
.github/workflows/ratchet-update.yml
</files>
</git_log_commit>
</git_logs>
```

### 为什么选择 XML 作为默认格式？

Repomix 基于广泛的研究和测试，选择 XML 作为默认输出格式。这一决定基于实证证据和 AI 辅助代码分析的实际考量。

我们选择 XML 主要受到各大 AI 提供商官方推荐的影响：
- **Anthropic (Claude)**: 明确推荐使用 XML 标签来构建提示，声明"Claude 在训练过程中接触过此类提示"（[文档](https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/use-xml-tags)）
- **Google (Gemini)**: 推荐在复杂任务中使用包括 XML 在内的结构化格式（[文档](https://cloud.google.com/vertex-ai/generative-ai/docs/learn/prompts/structure-prompts)）
- **OpenAI (GPT)**: 在复杂场景中倡导结构化提示（[公告](https://x.com/OpenAIDevs/status/1890147300493914437)、[cookbook](https://cookbook.openai.com/examples/gpt-5/gpt-5_prompting_guide)）

## Markdown 格式

```bash
repomix --style markdown
```

Markdown 提供了易读的格式：

````markdown
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

# Git Logs

## 提交：2025-08-20 00:47:19 +0900
**消息：** feat(cli): Add --include-logs option for git commit history

**文件：**
- README.md
- src/cli/cliRun.ts
- src/core/git/gitCommand.ts
- src/core/git/gitLogHandle.ts
- src/core/output/outputGenerate.ts

## 提交：2025-08-21 00:09:43 +0900
**消息：** Merge pull request #795 from yamadashy/chore/ratchet-update-ci

**文件：**
- .github/workflows/ratchet-update.yml
````

## JSON 格式

```bash
repomix --style json
```

JSON 格式提供使用 camelCase 属性名的结构化、可程序化访问的输出：

```json
{
  "fileSummary": {
    "generationHeader": "本文件是由 Repomix 将整个代码库合并到单个文档中的表示形式。",
    "purpose": "本文件包含整个存储库内容的打包表示...",
    "fileFormat": "内容组织如下...",
    "usageGuidelines": "- 此文件应视为只读...",
    "notes": "- 某些文件可能已根据 .gitignore 规则被排除..."
  },
  "userProvidedHeader": "指定时的自定义标题文本",
  "directoryStructure": "src/
  cli/
    cliOutput.ts
    index.ts
  config/
    configLoader.ts",
  "files": {
    "src/index.js": "// 文件内容",
    "src/utils.js": "// 文件内容"
  },
  "instruction": "来自 instructionFilePath 的自定义指令"
}
```

### JSON 格式的优势

JSON 格式非常适合：
- **程序化处理**: 使用任何编程语言中的 JSON 库都能轻松解析和操作
- **API 集成**: 可直接被 Web 服务和应用程序使用
- **AI 工具兼容性**: 为机器学习和 AI 系统优化的结构化格式
- **数据分析**: 使用 `jq` 等工具轻松提取特定信息

### 使用 `jq` 处理 JSON 输出

JSON 格式使得程序化提取特定信息变得容易。以下是常见示例：

#### 基本文件操作
```bash
# 列出所有文件路径
cat repomix-output.json | jq -r '.files | keys[]'

# 计算文件总数
cat repomix-output.json | jq '.files | keys | length'

# 提取特定文件内容
cat repomix-output.json | jq -r '.files["README.md"]'
cat repomix-output.json | jq -r '.files["src/index.js"]'
```

#### 文件过滤和分析
```bash
# 按扩展名查找文件
cat repomix-output.json | jq -r '.files | keys[] | select(endswith(".ts"))'
cat repomix-output.json | jq -r '.files | keys[] | select(endswith(".js") or endswith(".ts"))'

# 查找包含特定文本的文件
cat repomix-output.json | jq -r '.files | to_entries[] | select(.value | contains("function")) | .key'

# 创建包含字符计数的文件列表
cat repomix-output.json | jq -r '.files | to_entries[] | "\(.key): \(.value | length) 个字符"'
```

#### 元数据提取
```bash
# 提取目录结构
cat repomix-output.json | jq -r '.directoryStructure'

# 获取文件概要信息
cat repomix-output.json | jq '.fileSummary.purpose'
cat repomix-output.json | jq -r '.fileSummary.generationHeader'

# 提取用户提供的标题（如果存在）
cat repomix-output.json | jq -r '.userProvidedHeader // "未提供标题"'

# 获取自定义指令
cat repomix-output.json | jq -r '.instruction // "未提供指令"'
```

#### 高级分析
```bash
# 按内容长度查找最大的文件
cat repomix-output.json | jq -r '.files | to_entries[] | [.key, (.value | length)] | @tsv' | sort -k2 -nr | head -10

# 搜索包含特定模式的文件
cat repomix-output.json | jq -r '.files | to_entries[] | select(.value | test("import.*react"; "i")) | .key'

# 提取匹配多个扩展名的文件路径
cat repomix-output.json | jq -r '.files | keys[] | select(test("\.(js|ts|jsx|tsx)$"))'
```

## 纯文本格式

```bash
repomix --style plain
```

输出结构：
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

================
Git Logs
================
================
Date: 2025-08-20 00:47:19 +0900
Message: feat(cli): Add --include-logs option for git commit history
Files:
  - README.md
  - src/cli/cliRun.ts
  - src/core/git/gitCommand.ts
  - src/core/git/gitLogHandle.ts
  - src/core/output/outputGenerate.ts
================

================
Date: 2025-08-21 00:09:43 +0900
Message: Merge pull request #795 from yamadashy/chore/ratchet-update-ci
Files:
  - .github/workflows/ratchet-update.yml
================
```

## 在 AI 模型中的使用

每种格式都能在 AI 模型中正常工作，但需要考虑以下几点：
- 配合 Claude 使用时推荐 XML（解析精度最高）
- 注重可读性时使用 Markdown
- 需要程序化处理或 API 集成时使用 JSON
- 追求简洁和通用兼容性时使用纯文本

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
