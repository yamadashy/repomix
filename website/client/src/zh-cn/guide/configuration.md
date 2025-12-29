# 配置

Repomix可以通过配置文件或命令行选项进行配置。配置文件允许您自定义代码库的处理和输出方式。

## 配置文件格式

Repomix支持多种配置文件格式，以提供灵活性和易用性。

Repomix将按以下优先级自动搜索配置文件：

1. **TypeScript** (`repomix.config.ts`, `repomix.config.mts`, `repomix.config.cts`)
2. **JavaScript/ES Module** (`repomix.config.js`, `repomix.config.mjs`, `repomix.config.cjs`)
3. **JSON** (`repomix.config.json5`, `repomix.config.jsonc`, `repomix.config.json`)

### JSON配置

在项目目录中创建配置文件：
```bash
repomix --init
```

这将创建一个带有默认设置的`repomix.config.json`文件。您还可以创建一个全局配置文件，在找不到本地配置时将使用它作为后备：

```bash
repomix --init --global
```

### TypeScript配置

TypeScript配置文件提供最佳的开发体验，具有完整的类型检查和IDE支持。

**安装：**

要使用带有`defineConfig`的TypeScript或JavaScript配置，您需要将Repomix安装为开发依赖：

```bash
npm install -D repomix
```

**示例：**

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

**优势：**
- ✅ IDE中的完整TypeScript类型检查
- ✅ 出色的IDE自动完成和IntelliSense
- ✅ 使用动态值（时间戳、环境变量等）

**动态值示例：**

```typescript
// repomix.config.ts
import { defineConfig } from 'repomix';

// 生成基于时间戳的文件名
const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');

export default defineConfig({
  output: {
    filePath: `output-${timestamp}.xml`,
    style: 'xml',
  },
});
```

### JavaScript配置

JavaScript配置文件的工作方式与TypeScript相同，支持`defineConfig`和动态值。

## 配置选项

| 选项                             | 说明                                                                                                                         | 默认值                 |
|----------------------------------|------------------------------------------------------------------------------------------------------------------------------|------------------------|
| `input.maxFileSize`              | 要处理的最大文件大小（字节）。超过此大小的文件将被跳过。用于排除大型二进制文件或数据文件                                  | `50000000`            |
| `output.filePath`                | 输出文件名。支持XML、Markdown和纯文本格式                                                                                   | `"repomix-output.xml"` |
| `output.style`                   | 输出样式（`xml`、`markdown`、`json`、`plain`）。每种格式对不同的AI工具都有其优势                                                   | `"xml"`                |
| `output.parsableStyle`           | 是否根据所选样式模式转义输出。可以提供更好的解析，但可能会增加令牌数量                                                    | `false`                |
| `output.compress`                | 是否使用Tree-sitter执行智能代码提取，在保持结构的同时减少令牌数量                                                         | `false`                |
| `output.headerText`              | 要包含在文件头部的自定义文本。对于为AI工具提供上下文或指令很有用                                                          | `null`                 |
| `output.instructionFilePath`     | 包含用于AI处理的详细自定义指令的文件路径                                                                                   | `null`                 |
| `output.fileSummary`             | 是否在输出开头包含显示文件计数、大小和其他指标的摘要部分                                                                   | `true`                 |
| `output.directoryStructure`      | 是否在输出中包含目录结构。帮助AI理解项目组织                                                                               | `true`                 |
| `output.files`                   | 是否在输出中包含文件内容。设置为false时只包含结构和元数据                                                                  | `true`                 |
| `output.removeComments`          | 是否从支持的文件类型中删除注释。可以减少噪音和令牌数量                                                                    | `false`                |
| `output.removeEmptyLines`        | 是否从输出中删除空行以减少令牌数量                                                                                         | `false`                |
| `output.showLineNumbers`         | 是否为每行添加行号。有助于引用代码的特定部分                                                                               | `false`                |
| `output.truncateBase64`          | 是否截断长的base64数据字符串（例如图像）以减少令牌数量                                                                      | `false`                |
| `output.copyToClipboard`         | 是否除了保存文件外还将输出复制到系统剪贴板                                                                                 | `false`                |
| `output.splitOutput`             | 按每部分最大大小将输出拆分为多个编号文件（例如，`1000000` 表示约1MB）。CLI 接受可读大小如 `500kb` 或 `2mb`。使每个文件保持在限制以下，并避免跨部分拆分源文件 | 未设置 |
| `output.topFilesLength`          | 在摘要中显示的顶部文件数量。如果设置为0，则不显示摘要                                                                      | `5`                    |
| `output.includeEmptyDirectories` | 是否在仓库结构中包含空目录                                                                                                 | `false`                |
| `output.includeFullDirectoryStructure` | 使用`include`模式时，是否显示完整的目录树（遵守ignore模式）同时仅处理包含的文件。为AI分析提供完整的仓库上下文 | `false`                |
| `output.git.sortByChanges`       | 是否按Git更改次数对文件进行排序。更改较多的文件显示在底部                                                                 | `true`                 |
| `output.git.sortByChangesMaxCommits` | 分析Git更改时要分析的最大提交数。限制历史深度以提高性能                                                               | `100`                  |
| `output.git.includeDiffs`        | 是否在输出中包含Git差异。分别显示工作树和暂存区的更改                                                                     | `false`                |
| `output.git.includeLogs`         | 是否在输出中包含Git日志。显示提交历史的日期、消息和文件路径                                                              | `false`                |
| `output.git.includeLogsCount`    | 要包含的Git日志提交数量。限制历史深度以了解开发模式                                                                      | `50`                   |
| `include`                        | 要包含的文件模式（使用[glob模式](https://github.com/mrmlnc/fast-glob?tab=readme-ov-file#pattern-syntax)）                 | `[]`                   |
| `ignore.useGitignore`            | 是否使用项目的`.gitignore`文件中的模式                                                                                     | `true`                 |
| `ignore.useDotIgnore`            | 是否使用项目的`.ignore`文件中的模式                                                                                        | `true`                 |
| `ignore.useDefaultPatterns`      | 是否使用默认忽略模式（node_modules、.git等）                                                                              | `true`                 |
| `ignore.customPatterns`          | 额外的忽略模式（使用[glob模式](https://github.com/mrmlnc/fast-glob?tab=readme-ov-file#pattern-syntax)）                   | `[]`                   |
| `security.enableSecurityCheck`   | 是否使用Secretlint执行安全检查以检测敏感信息                                                                              | `true`                 |
| `tokenCount.encoding`            | OpenAI的[tiktoken](https://github.com/openai/tiktoken)分词器使用的令牌计数编码。GPT-4o使用`o200k_base`，GPT-4/3.5使用`cl100k_base`。详见[tiktoken model.py](https://github.com/openai/tiktoken/blob/main/tiktoken/model.py#L24) | `"o200k_base"`         |

配置文件支持[JSON5](https://json5.org/)语法，允许：
- 注释（单行和多行）
- 对象和数组中的尾随逗号
- 无引号属性名
- 更灵活的字符串语法

## 模式验证

您可以通过添加`$schema`属性为配置文件启用模式验证：

```json
{
  "$schema": "https://repomix.com/schemas/latest/schema.json",
  "output": {
    "filePath": "repomix-output.md",
    "style": "markdown"
  }
}
```

这在支持JSON模式的编辑器中提供自动完成和验证功能。

## 配置文件示例

以下是完整配置文件（`repomix.config.json`）的示例：

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
    "headerText": "打包文件的自定义头部信息",
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
    // 模式也可以在 .repomixignore 中指定
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

## 配置文件位置

Repomix按以下顺序查找配置文件：
1. 当前目录中的本地配置文件（优先级：TS > JS > JSON）
   - TypeScript: `repomix.config.ts`, `repomix.config.mts`, `repomix.config.cts`
   - JavaScript: `repomix.config.js`, `repomix.config.mjs`, `repomix.config.cjs`
   - JSON: `repomix.config.json5`, `repomix.config.jsonc`, `repomix.config.json`
2. 全局配置文件（优先级：TS > JS > JSON）
   - Windows：
     - TypeScript: `%LOCALAPPDATA%\Repomix\repomix.config.ts`, `.mts`, `.cts`
     - JavaScript: `%LOCALAPPDATA%\Repomix\repomix.config.js`, `.mjs`, `.cjs`
     - JSON: `%LOCALAPPDATA%\Repomix\repomix.config.json5`, `.jsonc`, `.json`
   - macOS/Linux：
     - TypeScript: `~/.config/repomix/repomix.config.ts`, `.mts`, `.cts`
     - JavaScript: `~/.config/repomix/repomix.config.js`, `.mjs`, `.cjs`
     - JSON: `~/.config/repomix/repomix.config.json5`, `.jsonc`, `.json`

命令行选项优先于配置文件设置。

## 包含模式

Repomix支持使用[glob模式](https://github.com/mrmlnc/fast-glob?tab=readme-ov-file#pattern-syntax)指定要包含的文件。这允许更灵活和强大的文件选择：

- 使用`**/*.js`包含任何目录中的所有JavaScript文件
- 使用`src/**/*`包含`src`目录及其子目录中的所有文件
- 组合多个模式，如`["src/**/*.js", "**/*.md"]`以包含`src`中的JavaScript文件和所有Markdown文件

您可以在配置文件中指定包含模式：

```json
{
  "include": ["src/**/*", "tests/**/*.test.js"]
}
```

或使用`--include`命令行选项进行一次性过滤。

## 忽略模式

Repomix提供多种方法来设置忽略模式，以在打包过程中排除特定文件或目录：

- **.gitignore**：默认情况下，使用项目的`.gitignore`文件和`.git/info/exclude`中列出的模式。此行为可以通过`ignore.useGitignore`设置或`--no-gitignore` CLI选项控制。
- **.ignore**：您可以在项目根目录中使用`.ignore`文件，遵循与`.gitignore`相同的格式。ripgrep和the silver searcher等工具也会遵守此文件，减少了维护多个忽略文件的需要。此行为可以通过`ignore.useDotIgnore`设置或`--no-dot-ignore` CLI选项控制。
- **默认模式**：Repomix包含常见排除文件和目录的默认列表（例如node_modules、.git、二进制文件）。此功能可以通过`ignore.useDefaultPatterns`设置或`--no-default-patterns` CLI选项控制。有关详细信息，请参阅[defaultIgnore.ts](https://github.com/yamadashy/repomix/blob/main/src/config/defaultIgnore.ts)。
- **.repomixignore**：您可以在项目根目录中创建`.repomixignore`文件来定义Repomix特定的忽略模式。此文件遵循与`.gitignore`相同的格式。
- **自定义模式**：可以使用配置文件中的`ignore.customPatterns`选项指定其他忽略模式。您可以使用`-i, --ignore`命令行选项覆盖此设置。

**优先顺序**（从高到低）：

1. 自定义模式（`ignore.customPatterns`）
2. 忽略文件（`.repomixignore`、`.ignore`、`.gitignore`和`.git/info/exclude`）：
   - 在嵌套目录中时，更深层目录中的文件具有更高优先级
   - 在同一目录中时，这些文件以不特定的顺序合并
3. 默认模式（如果`ignore.useDefaultPatterns`为true且未使用`--no-default-patterns`）

这种方法允许根据项目需求灵活配置文件排除。它通过确保排除安全敏感文件和大型二进制文件来帮助优化生成的打包文件的大小，同时防止机密信息泄漏。

**注意：**默认情况下，二进制文件不包含在打包输出中，但它们的路径列在输出文件的"仓库结构"部分。这提供了仓库结构的完整概述，同时保持打包文件高效且基于文本。有关详细信息，请参阅[二进制文件处理](#二进制文件处理)。

`.repomixignore`示例：
```text
# 缓存目录
.cache/
tmp/

# 构建输出
dist/
build/

# 日志
*.log
```

## 默认忽略模式

当`ignore.useDefaultPatterns`为true时，Repomix自动忽略以下常见模式：
```text
node_modules/**
.git/**
coverage/**
dist/**
```

完整列表请参见[defaultIgnore.ts](https://github.com/yamadashy/repomix/blob/main/src/config/defaultIgnore.ts)

## 二进制文件处理

二进制文件（如图像、PDF、编译的二进制文件、归档文件等）经过特殊处理以保持高效的基于文本的输出：

- **文件内容**：二进制文件**不包含**在打包输出中，以保持文件基于文本且对AI处理高效
- **目录结构**：二进制文件**路径被列出**在目录结构部分，提供仓库的完整概述

这种方法确保您获得仓库结构的完整视图，同时保持针对AI消费优化的高效的基于文本的输出。

**示例：**

如果您的仓库包含`logo.png`和`app.jar`：
- 它们将出现在目录结构部分
- 它们的内容将不会包含在文件部分

**目录结构输出：**
```
src/
  index.ts
  utils.ts
assets/
  logo.png
build/
  app.jar
```

这样，AI工具可以理解这些二进制文件存在于您的项目结构中，而无需处理其二进制内容。

**注意：**您可以使用`input.maxFileSize`配置选项（默认值：50MB）控制最大文件大小阈值。大于此限制的文件将被完全跳过。

## 高级功能

### 代码压缩

代码压缩功能（通过`output.compress: true`启用）使用[Tree-sitter](https://github.com/tree-sitter/tree-sitter)智能提取基本代码结构，同时移除实现细节。这有助于在保持重要的结构信息的同时减少令牌数量。

主要优点：
- 显著减少令牌数量
- 保留类和函数签名
- 保持导入和导出
- 保留类型定义和接口
- 移除函数体和实现细节

更多详细信息和示例，请参阅[代码压缩指南](code-compress)。

### Git集成

`output.git`配置提供强大的Git感知功能：

- `sortByChanges`：当设置为true时，文件按Git更改次数（修改该文件的提交数）排序。更改次数较多的文件出现在输出的底部。这有助于优先处理更活跃开发的文件。默认值：`true`
- `sortByChangesMaxCommits`：计算文件更改次数时要分析的最大提交数。默认值：`100`
- `includeDiffs`：当设置为true时，在输出中包含Git差异（同时分别包含工作树和暂存区的更改）。这允许读者查看存储库中的待处理更改。默认值：`false`
- `includeLogs`：当设置为true时，在输出中包含Git日志。显示提交历史的日期、消息和文件路径，帮助AI理解哪些文件通常一起更改。默认值：`false`
- `includeLogsCount`：要包含的Git日志提交数量。控制用于分析开发模式的历史深度。默认值：`50`

配置示例：
```json
{
  "output": {
    "git": {
      "sortByChanges": true,
      "sortByChangesMaxCommits": 100,
      "includeDiffs": true,
      "includeLogs": true,
      "includeLogsCount": 30
    }
  }
}
```

### 安全检查

当`security.enableSecurityCheck`启用时，Repomix使用[Secretlint](https://github.com/secretlint/secretlint)在将代码库包含在输出中之前检测敏感信息。这有助于防止意外暴露：

- API密钥
- 访问令牌
- 私钥
- 密码
- 其他敏感凭据

### 注释移除

当`output.removeComments`设置为`true`时，将从支持的文件类型中移除注释，以减少输出大小并专注于核心代码内容。这在以下情况特别有用：

- 处理大量文档化的代码
- 尝试减少令牌数量
- 专注于代码结构和逻辑

有关支持的语言和详细示例，请参阅[注释移除指南](comment-removal)。
