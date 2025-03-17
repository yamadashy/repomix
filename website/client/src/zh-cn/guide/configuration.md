# 配置

## 快速开始

创建配置文件：
```bash
repomix --init
```

## 配置文件

`repomix.config.json`：
```json
{
  "output": {
    "filePath": "repomix-output.xml",
    "style": "xml",
    "parsableStyle": true,
    "compress": false,
    "headerText": "自定义头部文本",
    "instructionFilePath": "repomix-instruction.md",
    "fileSummary": true,
    "directoryStructure": true,
    "removeComments": false,
    "removeEmptyLines": false,
    "topFilesLength": 5,
    "showLineNumbers": false,
    "copyToClipboard": false,
    "includeEmptyDirectories": false
  },
  "include": ["**/*"],
  "ignore": {
    "useGitignore": true,
    "useDefaultPatterns": true,
    "customPatterns": ["tmp/", "*.log"]
  },
  "security": {
    "enableSecurityCheck": true
  }
}
```

## 全局配置

创建全局配置：
```bash
repomix --init --global
```

位置：
- Windows: `%LOCALAPPDATA%\Repomix\repomix.config.json`
- macOS/Linux: `~/.config/repomix/repomix.config.json`

## 忽略模式

优先级：
1. CLI 选项 (`--ignore`)
2. `.repomixignore`
3. `.gitignore` 和 `.git/info/exclude`
4. 默认模式

`.repomixignore` 示例：
```text
# 缓存目录
.cache/
tmp/

# 构建输出
dist/
build/

# 日志
*.log
```

## 默认忽略模式

默认包含的常见模式：
```text
node_modules/**
.git/**
coverage/**
dist/**
```

完整列表：[defaultIgnore.ts](https://github.com/yamadashy/repomix/blob/main/src/config/defaultIgnore.ts)

## 示例

### 代码压缩

当 `output.compress` 设置为 `true` 时，Repomix 将智能提取基本代码结构，同时移除实现细节。这在需要减少令牌数量的同时保持重要的结构信息时特别有用。

例如，这段代码：

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

### 注释移除

当 `output.removeComments` 设置为 `true` 时，所有代码注释将被移除。这在需要专注于代码实现或进一步减少令牌数量时很有用。
