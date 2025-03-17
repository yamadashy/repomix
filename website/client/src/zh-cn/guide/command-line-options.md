# 命令行选项

## 基本选项
- `-v, --version`: 显示版本

## 输出选项
- `-o, --output <file>`: 输出文件名（默认：`repomix-output.txt`）
- `--style <type>`: 输出样式（`plain`、`xml`、`markdown`）（默认：`plain`）
- `--parsable-style`: 启用基于所选样式模式的可解析输出（默认：`false`）
- `--compress`: 执行智能代码提取，专注于基本函数和类签名，同时移除实现细节
- `--output-show-line-numbers`: 添加行号（默认：`false`）
- `--copy`: 复制到剪贴板（默认：`false`）
- `--no-file-summary`: 禁用文件摘要（默认：`true`）
- `--no-directory-structure`: 禁用目录结构（默认：`true`）
- `--remove-comments`: 移除注释（默认：`false`）
- `--remove-empty-lines`: 移除空行（默认：`false`）
- `--header-text <text>`: 文件头部包含的自定义文本
- `--instruction-file-path <path>`: 包含详细自定义指令的文件路径
- `--include-empty-directories`: 在输出中包含空目录（默认：`false`）

## 过滤选项
- `--include <patterns>`: 包含模式（逗号分隔）
- `-i, --ignore <patterns>`: 忽略模式（逗号分隔）
- `--no-gitignore`: 禁用 .gitignore 文件
- `--no-default-patterns`: 禁用默认模式

## 远程仓库选项
- `--remote <url>`: 处理远程仓库
- `--remote-branch <name>`: 指定远程分支名称、标签或提交哈希（默认为仓库的默认分支）

## 配置选项
- `-c, --config <path>`: 自定义配置文件路径
- `--init`: 创建配置文件
- `--global`: 使用全局配置

## 安全选项
- `--no-security-check`: 禁用安全检查（默认：`true`）

## 令牌计数选项
- `--token-count-encoding <encoding>`: 指定令牌计数编码（如 `o200k_base`、`cl100k_base`）（默认：`o200k_base`）

## 其他选项
- `--top-files-len <number>`: 显示的顶部文件数量（默认：`5`）
- `--verbose`: 启用详细日志
- `--quiet`: 禁止所有标准输出

## 示例

```bash
# 基本用法
repomix

# 自定义输出
repomix -o output.xml --style xml

# 使用压缩的自定义输出
repomix --compress

# 处理特定文件
repomix --include "src/**/*.ts" --ignore "**/*.test.ts"

# 带分支的远程仓库
repomix --remote https://github.com/user/repo/tree/main

# 带提交的远程仓库
repomix --remote https://github.com/user/repo/commit/836abcd7335137228ad77feb28655d85712680f1

# 使用简写的远程仓库
repomix --remote user/repo
```

例如，使用 `--compress` 选项时，这段代码：

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

将被压缩为：

```typescript
const calculateTotal = (items: ShoppingItem[]) => {
interface Item {
```

这种压缩有助于减少令牌数量，同时保留代码的重要结构信息。
