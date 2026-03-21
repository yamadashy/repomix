# GitHub 仓库处理

## 基本用法

处理公共仓库：
```bash
# 使用完整 URL
repomix --remote https://github.com/user/repo

# 使用 GitHub 简写
repomix --remote user/repo
```

## 分支和提交选择

```bash
# 指定分支
repomix --remote user/repo --remote-branch main

# 指定标签
repomix --remote user/repo --remote-branch v1.0.0

# 指定提交哈希
repomix --remote user/repo --remote-branch 935b695
```

## 系统要求

- 必须安装 Git
- 需要网络连接
- 需要仓库的读取权限

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

## 安全性

出于安全考虑，远程仓库中的配置文件（`repomix.config.*`）默认不会被加载。这可以防止不受信任的仓库通过 `repomix.config.ts` 等配置文件执行代码。

你的全局配置和 CLI 选项仍然会正常生效。

如需信任远程仓库的配置：

```bash
# 使用 CLI 标志
repomix --remote user/repo --remote-trust-config

# 使用环境变量
REPOMIX_REMOTE_TRUST_CONFIG=true repomix --remote user/repo
```

## 常见问题

### 访问问题
- 确保仓库是公开的
- 检查 Git 是否已安装
- 验证网络连接

### 大型仓库处理
- 使用 `--include` 选择特定路径
- 启用 `--remove-comments`
- 分开处理不同分支
