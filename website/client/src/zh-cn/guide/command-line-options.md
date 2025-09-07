# 命令行选项

## 基本选项
- `-v, --version`: 显示工具版本

## CLI输入/输出选项
- `--verbose`: 启用详细日志记录
- `--quiet`: 禁用所有输出到标准输出
- `--stdout`: 输出到标准输出而不是写入文件（不能与`--output`选项同时使用）
- `--stdin`: 从标准输入读取文件路径，而不是自动发现文件
- `--copy`: 另外将生成的输出复制到系统剪贴板
- `--token-count-tree [threshold]`: 显示带有令牌计数摘要的文件树（可选：最小令牌计数阈值）。对于识别大文件和优化AI上下文限制的令牌使用很有用
- `--top-files-len <number>`: 摘要中显示的顶级文件数

## Repomix输出选项
- `-o, --output <file>`: 指定输出文件名
- `--style <style>`: 指定输出样式（`xml`、`markdown`、`plain`）
- `--parsable-style`: 基于所选样式架构启用可解析输出。注意这可能会增加令牌数。
- `--compress`: 执行智能代码提取，专注于基本函数和类签名以减少令牌数
- `--output-show-line-numbers`: 在输出中显示行号
- `--no-file-summary`: 禁用文件摘要部分输出
- `--no-directory-structure`: 禁用目录结构部分输出
- `--no-files`: 禁用文件内容输出（仅元数据模式）
- `--remove-comments`: 从支持的文件类型中移除注释
- `--remove-empty-lines`: 从输出中移除空行
- `--truncate-base64`: 启用base64数据字符串截断
- `--header-text <text>`: 要包含在文件头中的自定义文本
- `--instruction-file-path <path>`: 包含详细自定义指令的文件路径
- `--include-empty-directories`: 在输出中包含空目录
- `--include-diffs`: 在输出中包含git差异（分别包含工作树和暂存的更改）
- `--include-logs`: 在输出中包含git日志（包含日期、消息和文件路径的提交历史）
- `--include-logs-count <count>`: 要包含的git日志提交数量（默认：50）
- `--no-git-sort-by-changes`: 禁用按git更改次数排序文件（默认启用）

## 文件选择选项
- `--include <patterns>`: 包含模式列表（逗号分隔）
- `-i, --ignore <patterns>`: 附加忽略模式（逗号分隔）
- `--ignore-content <patterns>`: Skip file content for matched patterns (comma-separated; prefix with `!` to keep specific paths)
- `--no-gitignore`: 禁用.gitignore文件使用
- `--no-default-patterns`: 禁用默认模式

## 远程仓库选项
- `--remote <url>`: 处理远程仓库
- `--remote-branch <name>`: 指定远程分支名称、标签或提交哈希（默认为仓库默认分支）

## 配置选项
- `-c, --config <path>`: 自定义配置文件路径
- `--init`: 创建配置文件
- `--global`: 使用全局配置

## 安全选项
- `--no-security-check`: 禁用安全检查（默认：`true`）

## 令牌计数选项
- `--token-count-encoding <encoding>`: 指定OpenAI的[tiktoken](https://github.com/openai/tiktoken)分词器使用的令牌计数编码（例如，GPT-4o使用`o200k_base`，GPT-4/3.5使用`cl100k_base`）。有关编码详细信息，请参阅[tiktoken model.py](https://github.com/openai/tiktoken/blob/main/tiktoken/model.py#L24)。


## 示例

```bash
# 基本使用
repomix

# 自定义输出
repomix -o output.xml --style xml

# 输出到标准输出
repomix --stdout > custom-output.txt

# 输出到标准输出，然后管道到另一个命令（例如，simonw/llm）
repomix --stdout | llm "请解释这段代码的作用。"

# 使用压缩的自定义输出
repomix --compress

# Git集成功能
repomix --include-logs   # 包含git日志（默认50个提交）
repomix --include-logs --include-logs-count 10  # 包含最近10个提交
repomix --include-diffs --include-logs  # 同时包含差异和日志

# 处理特定文件
repomix --include "src/**/*.ts" --ignore "**/*.test.ts"

# Ignore file contents for matching patterns
repomix --ignore-content "components/**,!components/slider/**"

# 带分支的远程仓库
repomix --remote https://github.com/user/repo/tree/main

# 带提交的远程仓库
repomix --remote https://github.com/user/repo/commit/836abcd7335137228ad77feb28655d85712680f1

# 使用简写的远程仓库
repomix --remote user/repo

# 使用stdin的文件列表
find src -name "*.ts" -type f | repomix --stdin
git ls-files "*.js" | repomix --stdin
echo -e "src/index.ts\nsrc/utils.ts" | repomix --stdin

# 令牌计数分析
repomix --token-count-tree
repomix --token-count-tree 1000  # 仅显示拥有1000+令牌的文件/目录
```

