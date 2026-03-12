# 作为库使用 Repomix

除了作为 CLI 工具使用 Repomix 外，您还可以将其功能直接集成到 Node.js 应用程序中。

## 安装

在您的项目中安装 Repomix 作为依赖项：

```bash
npm install repomix
```

## 基本用法

使用 Repomix 最简单的方法是通过 `runCli` 函数，它提供与命令行界面相同的功能：

```javascript
import { runCli, type CliOptions } from 'repomix';

// 使用自定义选项处理当前目录
async function packProject() {
  const options = {
    output: 'output.xml',
    style: 'xml',
    compress: true,
    quiet: true
  } as CliOptions;
  
  const result = await runCli(['.'], process.cwd(), options);
  return result.packResult;
}
```

`result.packResult` 包含有关处理文件的信息，包括：
- `totalFiles`：处理的文件数量
- `totalCharacters`：总字符数
- `totalTokens`：总令牌数（对 LLM 上下文限制有用）
- `fileCharCounts`：每个文件的字符数
- `fileTokenCounts`：每个文件的令牌数

## 处理远程仓库

您可以克隆并处理远程仓库：

```javascript
import { runCli, type CliOptions } from 'repomix';

// 克隆并处理 GitHub 仓库
async function processRemoteRepo(repoUrl) {
  const options = {
    remote: repoUrl,
    output: 'output.xml',
    compress: true
  } as CliOptions;
  
  return await runCli(['.'], process.cwd(), options);
}
```

## 使用核心组件

要获得更多控制，您可以直接使用 Repomix 的低级 API：

```javascript
import { searchFiles, collectFiles, processFiles, TokenCounter } from 'repomix';

async function analyzeFiles(directory) {
  // 查找并收集文件
  const { filePaths } = await searchFiles(directory, { /* 配置 */ });
  const rawFiles = await collectFiles(filePaths, directory);
  const processedFiles = await processFiles(rawFiles, { /* 配置 */ });
  
  // 计算令牌
  const tokenCounter = new TokenCounter('o200k_base');
  
  // 返回分析结果
  return processedFiles.map(file => ({
    path: file.path,
    tokens: tokenCounter.countTokens(file.content)
  }));
}
```

## 打包

使用 Rolldown 或 esbuild 等工具打包 repomix 时，某些依赖项必须保持为 external，并且需要复制 WASM 文件：

**External 依赖项（无法打包）：**
- `tinypool` - 使用文件路径生成 worker 线程
- `tiktoken` - 在运行时动态加载 WASM 文件

**需要复制的 WASM 文件：**
- `web-tree-sitter.wasm` → 与打包后的 JS 相同的目录（代码压缩功能需要）
- Tree-sitter 语言文件 → `REPOMIX_WASM_DIR` 环境变量指定的目录

有关实际示例，请参阅 [website/server/scripts/bundle.mjs](https://github.com/yamadashy/repomix/blob/main/website/server/scripts/bundle.mjs)。

## 实际示例

Repomix 网站（[repomix.com](https://repomix.com)）使用 Repomix 作为库来处理远程仓库。您可以在 [website/server/src/remoteRepo.ts](https://github.com/yamadashy/repomix/blob/main/website/server/src/remoteRepo.ts) 中查看实现。 
