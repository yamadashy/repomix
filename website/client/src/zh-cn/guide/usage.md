# 基本用法

## 快速开始

打包整个仓库：
```bash
repomix
```

## 常见使用场景

### 打包指定目录
```bash
repomix path/to/directory
```

### 包含特定文件
使用 [glob 模式](https://github.com/mrmlnc/fast-glob?tab=readme-ov-file#pattern-syntax)：
```bash
repomix --include "src/**/*.ts,**/*.md"
```

### 排除文件
```bash
repomix --ignore "**/*.log,tmp/"
```

### 将输出拆分为多个文件

处理大型代码库时，打包的输出可能会超过某些 AI 工具施加的文件大小限制（例如 Google AI Studio 的 1MB 限制）。使用 `--split-output` 自动将输出拆分为多个文件：

```bash
repomix --split-output 1mb
```

这将生成编号文件如：
- `repomix-output.1.xml`
- `repomix-output.2.xml`
- `repomix-output.3.xml`

大小可以用单位指定：`500kb`、`1mb`、`2mb`、`1.5mb` 等。支持小数值。

> [!NOTE]
> 文件按顶级目录分组以保持上下文。单个文件或目录永远不会被拆分到多个输出文件中。

### 处理远程仓库
```bash
# 使用 GitHub URL
repomix --remote https://github.com/user/repo

# 使用简写形式
repomix --remote user/repo

# 指定分支/标签/提交
repomix --remote user/repo --remote-branch main
repomix --remote user/repo --remote-branch 935b695
```

### 文件列表输入（stdin）

通过 stdin 传递文件路径，实现最大灵活性：

```bash
# 使用 find 命令
find src -name "*.ts" -type f | repomix --stdin

# 使用 git 获取跟踪的文件
git ls-files "*.ts" | repomix --stdin

# 使用 ripgrep (rg) 查找文件
rg --files --type ts | repomix --stdin

# 使用 grep 查找包含特定内容的文件
grep -l "TODO" **/*.ts | repomix --stdin

# 使用 ripgrep 查找包含特定内容的文件
rg -l "TODO|FIXME" --type ts | repomix --stdin

# 使用 sharkdp/fd 查找文件
fd -e ts | repomix --stdin

# 使用 fzf 从所有文件中选择
fzf -m | repomix --stdin

# 使用 fzf 进行交互式文件选择
find . -name "*.ts" -type f | fzf -m | repomix --stdin

# 使用 ls 和 glob 模式
ls src/**/*.ts | repomix --stdin

# 从包含文件路径的文件中读取
cat file-list.txt | repomix --stdin

# 使用 echo 直接输入
echo -e "src/index.ts\nsrc/utils.ts" | repomix --stdin
```

`--stdin` 选项允许你向 Repomix 传递文件路径列表，在选择要打包的文件时提供最大的灵活性。

使用 `--stdin` 时，指定的文件实际上被添加到包含模式中。这意味着正常的包含和忽略行为仍然适用 - 通过 stdin 指定的文件如果匹配忽略模式仍会被排除。

> [!NOTE]
> 使用 `--stdin` 时，文件路径可以是相对路径或绝对路径，Repomix 会自动处理路径解析和去重。

### 代码压缩 {#code-compression}

详情请参阅[代码压缩指南](/zh-cn/guide/code-compress)。

```bash
repomix --compress

# 你也可以将其用于远程仓库：
repomix --remote yamadashy/repomix --compress
```

### Git 集成

包含 Git 信息为 AI 分析提供开发上下文：

```bash
# 包含 git 差异（未提交的更改）
repomix --include-diffs

# 包含 git 提交日志（默认最近50个提交）
repomix --include-logs

# 包含特定数量的提交
repomix --include-logs --include-logs-count 10

# 同时包含差异和日志
repomix --include-diffs --include-logs
```

这增加了有价值的上下文信息：
- **最近更改**：Git 差异显示未提交的修改
- **开发规律**：Git 日志揭示通常一起更改的文件
- **提交历史**：最近的提交消息提供开发重点的洞察
- **文件关系**：理解在同一提交中修改的文件

### Token 数量优化

了解代码库的 token 分布对于优化 AI 交互至关重要。使用 `--token-count-tree` 选项可视化整个项目的 token 使用情况：

```bash
repomix --token-count-tree
```

这将显示带有 token 计数的代码库层次结构视图：

```
🔢 Token Count Tree:
────────────────────
└── src/ (70,925 tokens)
    ├── cli/ (12,714 tokens)
    │   ├── actions/ (7,546 tokens)
    │   └── reporters/ (990 tokens)
    └── core/ (41,600 tokens)
        ├── file/ (10,098 tokens)
        └── output/ (5,808 tokens)
```

你还可以设置最小 token 阈值来关注较大的文件：

```bash
repomix --token-count-tree 1000  # 仅显示拥有 1000+ token 的文件/目录
```

这有助于你：
- **识别高 token 文件** - 可能超出 AI 上下文限制的文件
- **优化文件选择** - 使用 `--include` 和 `--ignore` 模式
- **规划压缩策略** - 针对最大贡献者的策略
- **平衡内容与上下文** - 为 AI 分析准备代码时的平衡

## 输出格式

### XML（默认）
```bash
repomix --style xml
```

### Markdown
```bash
repomix --style markdown
```

### JSON
```bash
repomix --style json
```

### 纯文本
```bash
repomix --style plain
```

## 其他选项

### 移除注释

有关支持的语言和详细信息，请参阅[注释移除](/zh-cn/guide/comment-removal)。

```bash
repomix --remove-comments
```

### 显示行号
```bash
repomix --output-show-line-numbers
```

### 复制到剪贴板
```bash
repomix --copy
```

### 禁用安全检查

有关 Repomix 检测内容的详细信息，请参阅[安全](/zh-cn/guide/security)。

```bash
repomix --no-security-check
```

## 配置

初始化配置文件：
```bash
repomix --init
```

更多详细配置选项请参阅[配置指南](/zh-cn/guide/configuration)。

## 相关资源

- [输出格式](/zh-cn/guide/output) - 了解 XML、Markdown、JSON 和纯文本格式
- [命令行选项](/zh-cn/guide/command-line-options) - 完整的 CLI 参考
- [提示词示例](/zh-cn/guide/prompt-examples) - AI 分析的示例提示词
- [使用场景](/zh-cn/guide/use-cases) - 实际案例和工作流
