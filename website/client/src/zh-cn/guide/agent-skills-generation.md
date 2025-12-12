# Agent Skills 生成

Repomix 可以生成 [Claude Agent Skills](https://docs.anthropic.com/en/docs/claude-code/skills) 格式的输出，创建一个结构化的 Skills 目录，可作为 AI 助手的可重用代码库参考。

当您想要参考远程仓库的实现时，此功能特别强大。通过从开源项目生成 Skills，您可以轻松让 Claude 在您编写代码时参考特定的模式或实现。

Skills 生成不是生成单个打包文件，而是创建一个包含多个参考文件的结构化目录，这些文件针对 AI 理解和 grep 友好搜索进行了优化。

> [!NOTE]
> 这是一个实验性功能。输出格式和选项可能会根据用户反馈在未来版本中发生变化。

## 基本用法

从本地目录生成 Skills：

```bash
# 从当前目录生成 Skills
repomix --skill-generate

# 使用自定义 Skills 名称生成
repomix --skill-generate my-project-reference

# 从特定目录生成
repomix path/to/directory --skill-generate

# 从远程仓库生成
repomix --remote https://github.com/user/repo --skill-generate
```

## Skills 保存位置选择

运行命令时，Repomix 会提示您选择 Skills 的保存位置：

1. **Personal Skills** (`~/.claude/skills/`) - 在您机器上的所有项目中可用
2. **Project Skills** (`.claude/skills/`) - 通过 git 与团队共享

如果 Skills 目录已存在，系统会提示您确认是否覆盖。

> [!TIP]
> 生成 Project Skills 时，建议将其添加到 `.gitignore` 以避免提交大文件：
> ```gitignore
> .claude/skills/repomix-reference-*/
> ```

## 生成的结构

Skills 按以下结构生成：

```text
.claude/skills/<skill-name>/
├── SKILL.md                    # Skills 主元数据和文档
└── references/
    ├── summary.md              # 目的、格式和统计信息
    ├── project-structure.md    # 带行数的目录树
    ├── files.md                # 所有文件内容（grep 友好）
    └── tech-stack.md           # 语言、框架、依赖项
```

### 文件说明

#### SKILL.md

主 Skills 文件包含：
- Skills 名称、描述和项目信息
- 文件数、行数和 token 数
- Skills 使用方法概述
- 文件位置和格式说明
- 常见用例和提示

#### references/summary.md

包含：
- **目的**：说明这是供 AI 使用的参考代码库
- **文件结构**：记录每个参考文件的内容
- **使用指南**：如何有效使用 Skills
- **统计信息**：按文件类型、语言和最大文件的分类

#### references/project-structure.md

带有每个文件行数的目录树，便于文件发现：

```text
src/
  index.ts (42 lines)
  utils/
    helpers.ts (128 lines)
    math.ts (87 lines)
```

#### references/files.md

所有带语法高亮头的文件内容，针对 grep 友好搜索优化：

````markdown
## File: src/index.ts
```typescript
import { sum } from './utils/helpers';

export function main() {
  console.log(sum(1, 2));
}
```
````

#### references/tech-stack.md

从依赖文件自动检测的技术栈：
- **语言**：TypeScript、JavaScript、Python 等
- **框架**：React、Next.js、Express、Django 等
- **运行时版本**：Node.js、Python、Go 等
- **包管理器**：npm、pnpm、poetry 等
- **依赖项**：所有直接依赖和开发依赖
- **配置文件**：所有检测到的配置文件

检测来源文件：`package.json`、`requirements.txt`、`Cargo.toml`、`go.mod`、`.nvmrc`、`pyproject.toml` 等。

## 自动生成的 Skills 名称

如果未提供名称，Repomix 会使用以下模式自动生成：

```bash
repomix src/ --skill-generate                # → repomix-reference-src
repomix --remote user/repo --skill-generate  # → repomix-reference-repo
repomix --skill-generate CustomName          # → custom-name（规范化为 kebab-case）
```

Skills 名称会：
- 转换为 kebab-case（小写，连字符分隔）
- 限制最多 64 个字符
- 防止路径遍历攻击

## 与 Repomix 选项集成

Skills 生成支持所有标准 Repomix 选项：

```bash
# 使用文件过滤生成 Skills
repomix --skill-generate --include "src/**/*.ts" --ignore "**/*.test.ts"

# 使用压缩生成 Skills
repomix --skill-generate --compress

# 从远程仓库生成 Skills
repomix --remote yamadashy/repomix --skill-generate

# 使用特定输出格式选项生成 Skills
repomix --skill-generate --remove-comments --remove-empty-lines
```

### 仅文档 Skills

使用 `--include`，您可以生成仅包含 GitHub 仓库文档的 Skills。当您希望 Claude 在编写代码时参考特定库或框架的文档时，这很有用：

```bash
# Claude Code Action 文档
repomix --remote https://github.com/anthropics/claude-code-action --include docs --skill-generate

# Vite 文档
repomix --remote https://github.com/vitejs/vite --include docs --skill-generate

# React 文档
repomix --remote https://github.com/reactjs/react.dev --include src/content --skill-generate
```

## 限制

`--skill-generate` 选项不能与以下选项一起使用：
- `--stdout` - Skills 输出需要写入文件系统
- `--copy` - Skills 输出是目录，无法复制到剪贴板

## 使用生成的 Skills

生成后，您可以在 Claude 中使用这些 Skills：

1. **Claude Code**：如果保存到 `~/.claude/skills/` 或 `.claude/skills/`，Skills 会自动可用
2. **Claude Web**：将 Skills 目录上传到 Claude 进行代码库分析
3. **团队共享**：将 `.claude/skills/` 提交到仓库供团队使用

## 示例工作流

### 创建个人参考库

```bash
# 克隆并分析一个有趣的开源项目
repomix --remote facebook/react --skill-generate react-reference

# Skills 保存到 ~/.claude/skills/react-reference/
# 现在您可以在任何 Claude 对话中参考 React 的代码库
```

### 团队项目文档

```bash
# 在您的项目目录中
cd my-project

# 为团队生成 Skills
repomix --skill-generate

# 提示时选择 "Project Skills"
# Skills 保存到 .claude/skills/repomix-reference-my-project/

# 提交并与团队共享
git add .claude/skills/
git commit -m "Add codebase reference Skills"
```

## 相关资源

- [Claude Code 插件](/zh-cn/guide/claude-code-plugins) - 了解 Claude Code 的 Repomix 插件
- [MCP 服务器](/zh-cn/guide/mcp-server) - 替代集成方法
- [代码压缩](/zh-cn/guide/code-compress) - 通过压缩减少 token 数
- [配置](/zh-cn/guide/configuration) - 自定义 Repomix 行为
