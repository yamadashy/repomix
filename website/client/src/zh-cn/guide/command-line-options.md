# 命令行选项

## 基本选项
- `-v, --version`: 显示版本信息并退出

## CLI输入/输出选项
- `--verbose`: 启用详细调试日志（显示文件处理、令牌计数和配置详细信息）
- `--quiet`: 抑制除错误外的所有控制台输出（用于脚本编写）
- `--stdout`: 将打包输出直接写入标准输出而不是文件（抑制所有日志记录）
- `--stdin`: 从标准输入逐行读取文件路径（指定的文件直接处理）
- `--copy`: 处理后将生成的输出复制到系统剪贴板
- `--token-count-tree [threshold]`: 显示带有令牌计数的文件树；可选阈值仅显示≥N令牌的文件（例如：--token-count-tree 100）
- `--top-files-len <number>`: 摘要中显示的最大文件数（默认：5，例如：--top-files-len 20）

## Repomix输出选项
- `-o, --output <file>`: 输出文件路径（默认：repomix-output.xml，使用"-"输出到标准输出）
- `--style <type>`: 输出格式：xml、markdown、json或plain（默认：xml）
- `--parsable-style`: 转义特殊字符以确保有效的XML/Markdown（当输出包含破坏格式的代码时需要）
- `--compress`: 使用Tree-sitter解析提取基本代码结构（类、函数、接口）
- `--output-show-line-numbers`: 为输出中的每行添加行号前缀
- `--no-file-summary`: 从输出中省略文件摘要部分
- `--no-directory-structure`: 从输出中省略目录树可视化
- `--no-files`: 仅生成元数据而不包含文件内容（用于仓库分析）
- `--remove-comments`: 打包前剥离所有代码注释
- `--remove-empty-lines`: 从所有文件中删除空行
- `--truncate-base64`: 截断长base64数据字符串以减少输出大小
- `--header-text <text>`: 在输出开头包含的自定义文本
- `--instruction-file-path <path>`: 包含要在输出中包含的自定义指令的文件路径
- `--split-output <size>`: 将输出拆分为多个编号文件（例如 repomix-output.1.xml, repomix-output.2.xml）；例如 500kb、2mb 或 1.5mb
- `--include-empty-directories`: 在目录结构中包含没有文件的文件夹
- `--include-full-directory-structure`: 即使使用 --include 模式，也在目录结构部分显示完整的仓库树
- `--no-git-sort-by-changes`: 不按git更改频率排序文件（默认：最常更改的文件优先）
- `--include-diffs`: 添加显示工作树和暂存更改的git diff部分
- `--include-logs`: 添加包含消息和更改文件的git提交历史
- `--include-logs-count <count>`: 与--include-logs一起包含的最新提交数（默认：50）

## 文件选择选项
- `--include <patterns>`: 仅包含与这些glob模式匹配的文件（逗号分隔，例如："src/**/*.js,*.md"）
- `-i, --ignore <patterns>`: 要排除的附加模式（逗号分隔，例如："*.test.js,docs/**"）
- `--no-gitignore`: 不使用.gitignore规则过滤文件
- `--no-default-patterns`: 不应用内置忽略模式（node_modules、.git、构建目录等）

## 远程仓库选项
- `--remote <url>`: 克隆并打包远程仓库（GitHub URL或user/repo格式）
- `--remote-branch <name>`: 要使用的特定分支、标签或提交（默认：仓库的默认分支）

## 配置选项
- `-c, --config <path>`: 使用自定义配置文件而不是repomix.config.json
- `--init`: 使用默认设置创建新的repomix.config.json文件
- `--global`: 与--init一起使用，在主目录而不是当前目录中创建配置

## 安全选项
- `--no-security-check`: 跳过扫描API密钥和密码等敏感数据

## 令牌计数选项
- `--token-count-encoding <encoding>`: 用于计数的分词器模型：o200k_base（GPT-4o）、cl100k_base（GPT-3.5/4）等（默认：o200k_base）

## MCP选项
- `--mcp`: 作为AI工具集成的Model Context Protocol服务器运行


## 示例

```bash
# 基本使用
repomix

# 自定义输出文件和格式
repomix -o my-output.xml --style xml

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

# 使用模式处理特定文件
repomix --include "src/**/*.ts,*.md" --ignore "*.test.js,docs/**"

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

