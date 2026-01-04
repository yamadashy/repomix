# 作為庫使用 Repomix

除了作為 CLI 工具使用 Repomix 外，您還可以將其功能直接集成到 Node.js 應用程序中。

## 安裝

在您的項目中安裝 Repomix 作為依賴項：

```bash
npm install repomix
```

## 基本用法

使用 Repomix 最簡單的方法是通過 `runCli` 函數，它提供與命令行界面相同的功能：

```javascript
import { runCli, type CliOptions } from 'repomix';

// 使用自定義選項處理當前目錄
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

`result.packResult` 包含有關處理文件的信息，包括：
- `totalFiles`：處理的文件數量
- `totalCharacters`：總字符數
- `totalTokens`：總令牌數（對 LLM 上下文限制有用）
- `fileCharCounts`：每個文件的字符數
- `fileTokenCounts`：每個文件的令牌數

## 處理遠端倉庫

您可以克隆並處理遠端倉庫：

```javascript
import { runCli, type CliOptions } from 'repomix';

// 克隆並處理 GitHub 倉庫
async function processRemoteRepo(repoUrl) {
  const options = {
    remote: repoUrl,
    output: 'output.xml',
    compress: true
  } as CliOptions;
  
  return await runCli(['.'], process.cwd(), options);
}
```

## 使用核心組件

要獲得更多控制，您可以直接使用 Repomix 的低級 API：

```javascript
import { searchFiles, collectFiles, processFiles, TokenCounter } from 'repomix';

async function analyzeFiles(directory) {
  // 查找並收集文件
  const { filePaths } = await searchFiles(directory, { /* 配置 */ });
  const rawFiles = await collectFiles(filePaths, directory);
  const processedFiles = await processFiles(rawFiles, { /* 配置 */ });
  
  // 計算令牌
  const tokenCounter = new TokenCounter('o200k_base');
  
  // 返回分析結果
  return processedFiles.map(file => ({
    path: file.path,
    tokens: tokenCounter.countTokens(file.content)
  }));
}
```

## 打包

使用 Rolldown 或 esbuild 等工具打包 repomix 時，某些依賴項必須保持為 external，並且需要複製 WASM 文件：

**External 依賴項（無法打包）：**
- `tinypool` - 使用文件路徑生成 worker 線程
- `tiktoken` - 在運行時動態加載 WASM 文件

**需要複製的 WASM 文件：**
- `web-tree-sitter.wasm` → 與打包後的 JS 相同的目錄（代碼壓縮功能需要）
- Tree-sitter 語言文件 → `REPOMIX_WASM_DIR` 環境變數指定的目錄

有關實際示例，請參閱 [website/server/scripts/bundle.mjs](https://github.com/yamadashy/repomix/blob/main/website/server/scripts/bundle.mjs)。

## 實際示例

Repomix 網站（[repomix.com](https://repomix.com)）使用 Repomix 作為庫來處理遠端倉庫。您可以在 [website/server/src/remoteRepo.ts](https://github.com/yamadashy/repomix/blob/main/website/server/src/remoteRepo.ts) 中查看實現。
