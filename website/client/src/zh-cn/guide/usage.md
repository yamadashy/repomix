# 基本用法

## 快速开始

打包整个仓库：
```bash
repomix
```

## 常见使用场景

### 打包指定目录
处理特定目录或文件以专注于相关代码并减少令牌数量：
```bash
repomix path/to/directory
```

### 包含特定文件
使用 [glob 模式](https://github.com/mrmlnc/fast-glob?tab=readme-ov-file#pattern-syntax)精确控制包含哪些文件：
```bash
repomix --include "src/**/*.ts,**/*.md"
```

### 排除文件
使用 glob 模式跳过某些文件或目录，避免包含不必要或敏感内容：
```bash
repomix --ignore "**/*.log,tmp/"
```

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

## 输出格式

### XML（默认）
```bash
repomix --style xml
```

### Markdown
```bash
repomix --style markdown
```

### 纯文本
```bash
repomix --style plain
```

## 其他选项

### 代码压缩
使用 Tree-sitter 智能提取关键代码结构，同时移除实现细节，在保留架构的同时显著减少令牌数量：
```bash
repomix --compress

# 也可以与远程仓库一起使用：
repomix --remote yamadashy/repomix --compress
```

### 移除注释
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
```bash
repomix --no-security-check
```

## 配置

初始化配置文件：
```bash
repomix --init
```

更多详细配置选项请参阅[配置指南](/zh-cn/guide/configuration)。
