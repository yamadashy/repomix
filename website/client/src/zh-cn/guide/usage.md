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

### 纯文本（默认）
```bash
repomix --style plain
```

### XML
```bash
repomix --style xml
```

### Markdown
```bash
repomix --style markdown
```

## 其他选项

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
