# 远程仓库处理

Repomix 支持处理远程 Git 仓库，无需手动克隆。此功能允许您通过单个命令快速分析任何公共 Git 仓库，简化代码分析工作流程。

## 基本用法

处理公共仓库：
```bash
# 使用完整 URL
repomix --remote https://github.com/user/repo

# 使用 GitHub 简写
repomix --remote user/repo
```

## 分支和提交选择

您可以指定分支名称、标签或提交哈希：

```bash
# 使用 --remote-branch 选项指定特定分支
repomix --remote user/repo --remote-branch main

# 直接使用分支 URL
repomix --remote https://github.com/user/repo/tree/main

# 指定标签
repomix --remote user/repo --remote-branch v1.0.0

# 使用 --remote-branch 选项指定特定提交哈希
repomix --remote user/repo --remote-branch 935b695
```

## 系统要求

- 必须安装 Git（用于克隆和处理远程仓库）
- 需要网络连接（用于访问远程仓库）
- 需要仓库的读取权限（对于私有仓库）
- 足够的磁盘空间（用于临时克隆仓库）

## 输出控制

```bash
# 自定义输出位置
repomix --remote user/repo -o custom-output.xml

# 使用 XML 格式
repomix --remote user/repo --style xml

# 移除注释
repomix --remote user/repo --remove-comments
```

## Docker 使用方法

```bash
# 在当前目录处理并输出
docker run -v .:/app -it --rm ghcr.io/yamadashy/repomix \
  --remote user/repo

# 输出到指定目录
docker run -v ./output:/app -it --rm ghcr.io/yamadashy/repomix \
  --remote user/repo
```

## 常见问题

### 访问问题
- 确保仓库是公开的（或者您有私有仓库的访问权限）
- 检查 Git 是否已安装并可在命令行中使用
- 验证网络连接并确保可以访问 GitHub 或其他 Git 托管服务
- 检查防火墙或代理设置是否阻止了 Git 操作

### 大型仓库处理
- 使用 `--include` 选择特定路径以减少处理的文件数量
- 启用 `--remove-comments` 以减少令牌数量
- 使用 `--compress` 选项提取关键代码结构
- 分开处理不同分支或目录以管理大型代码库
