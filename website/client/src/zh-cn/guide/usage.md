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

### 文件列表输入（pipe via stdin）

通过 stdin 传递文件路径以获得终极灵活性：

```bash
# 使用 find 命令
find src -name "*.ts" -type f | repomix

# 使用 git 获取跟踪的文件
git ls-files "*.ts" | repomix

# 使用 ls 和 glob 模式
ls src/**/*.ts | repomix

# 从包含文件路径的文件中读取
cat file-list.txt | repomix

# 使用 echo 直接输入
echo -e "src/index.ts\nsrc/utils.ts" | repomix
```

Repomix 自动检测通过 stdin 传递的文件路径，在选择要打包的文件时提供终极灵活性。

> [!NOTE]
> 使用 stdin 输入时，文件路径可以是相对路径或绝对路径，Repomix 会自动处理路径解析和去重。

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
