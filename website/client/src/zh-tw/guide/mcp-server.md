# MCP伺服器

Repomix 支援 [Model Context Protocol (MCP)](https://modelcontextprotocol.io)，允許 AI 助手直接與您的程式碼庫交互。當作為 MCP 伺服器運行時，Repomix 提供了工具，使 AI 助手能夠在無需手動準備文件的情況下打包本地或遠端倉庫進行分析。

> [!NOTE]  
> 這是一個實驗性功能，我們將根據用戶反饋和實際使用情況積極改進

## 將 Repomix 作為 MCP 伺服器運行

要將 Repomix 作為 MCP 伺服器運行，請使用 `--mcp` 標誌：

```bash
repomix --mcp
```

這會以 MCP 伺服器模式啟動 Repomix，使其可供支援 Model Context Protocol 的 AI 助手使用。

## 配置 MCP 伺服器

要將 Repomix 作為 MCP 伺服器與 Claude 等 AI 助手一起使用，您需要配置 MCP 設置：

### 對於 VS Code

您可以使用以下方法之一在 VS Code 中安裝 Repomix MCP 伺服器：

1. **使用安裝徽章：**

  [![Install in VS Code](https://img.shields.io/badge/VS_Code-VS_Code?style=flat-square&label=Install%20Server&color=0098FF)](vscode:mcp/install?%7B%22name%22%3A%22repomix%22%2C%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22repomix%22%2C%22--mcp%22%5D%7D)<br>
  [![Install in VS Code Insiders](https://img.shields.io/badge/VS_Code_Insiders-VS_Code_Insiders?style=flat-square&label=Install%20Server&color=24bfa5)](vscode-insiders:mcp/install?%7B%22name%22%3A%22repomix%22%2C%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22repomix%22%2C%22--mcp%22%5D%7D)

2. **使用命令行：**

  ```bash
  code --add-mcp '{"name":"repomix","command":"npx","args":["-y","repomix","--mcp"]}'
  ```

  對於 VS Code Insiders：
  ```bash
  code-insiders --add-mcp '{"name":"repomix","command":"npx","args":["-y","repomix","--mcp"]}'
  ```

### 對於 Cline（VS Code 擴展）

編輯 `cline_mcp_settings.json` 文件：

```json
{
  "mcpServers": {
    "repomix": {
      "command": "npx",
      "args": [
        "-y",
        "repomix",
        "--mcp"
      ]
    }
  }
}
```

### 對於 Cursor

在 Cursor 中，從 `Cursor Settings` > `MCP` > `+ Add new global MCP server` 添加一個新的 MCP 伺服器，配置與 Cline 類似。

### 對於 Claude Desktop

使用與 Cline 類似的配置編輯 `claude_desktop_config.json` 文件。

### 對於 Claude Code

要在 [Claude Code](https://docs.anthropic.com/en/docs/claude-code/overview) 中配置 Repomix 作為 MCP 伺服器，請使用以下命令：

```bash
claude mcp add repomix -- npx -y repomix --mcp
```

或者，您可以使用**官方Repomix外掛**獲得更便捷的體驗。外掛提供自然語言指令和更簡單的設定。詳情請參閱[Claude Code外掛](/zh-tw/guide/claude-code-plugins)文件。

### 使用 Docker 代替 npx

您可以使用 Docker 代替 npx 來運行 Repomix 作為 MCP 伺服器：

```json
{
  "mcpServers": {
    "repomix-docker": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "ghcr.io/yamadashy/repomix",
        "--mcp"
      ]
    }
  }
}
```

## 可用的 MCP 工具

當作為 MCP 伺服器運行時，Repomix 提供以下工具：

### pack_codebase

此工具將本地程式碼目錄打包成一個用於 AI 分析的 XML 文件。它分析程式碼庫結構，提取相關程式碼內容，並生成包含指標、文件樹和格式化程式碼內容的綜合報告。

**參數：**

| 參數 | 必需 | 預設值 | 說明 |
|------|------|--------|------|
| `directory` | 是 | — | 要打包的目錄的絕對路徑 |
| `compress` | 否 | `false` | 啟用 Tree-sitter 壓縮以提取基本程式碼簽名和結構，同時刪除實現細節。在保持語義含義的同時減少約 70% 的令牌使用量。由於 `grep_repomix_output` 允許增量內容檢索，通常不需要。 |
| `includePatterns` | 否 | — | 使用 fast-glob 模式指定要包含的檔案。多個模式用逗號分隔（例如 `"**/*.{js,ts}"`、`"src/**,docs/**"`） |
| `ignorePatterns` | 否 | — | 使用 fast-glob 模式指定要排除的其他檔案。多個模式用逗號分隔（例如 `"test/**,*.spec.js"`）。補充 `.gitignore` 和內建排除。 |
| `topFilesLength` | 否 | `10` | 在指標摘要中顯示的最大檔案數（按大小排序） |
| `style` | 否 | `xml` | 輸出格式樣式：`xml`、`markdown`、`json` 或 `plain` |

**示例：**
```json
{
  "directory": "/path/to/your/project",
  "compress": false,
  "includePatterns": "src/**/*.ts,**/*.md",
  "ignorePatterns": "**/*.log,tmp/",
  "topFilesLength": 10
}
```

### pack_remote_repository

此工具獲取、克隆並將 GitHub 倉庫打包成一個用於 AI 分析的 XML 文件。它自動克隆遠端倉庫，分析其結構，並生成綜合報告。

**參數：**

| 參數 | 必需 | 預設值 | 說明 |
|------|------|--------|------|
| `remote` | 是 | — | GitHub 儲存庫 URL 或 `user/repo` 格式（例如 `"yamadashy/repomix"`、`"https://github.com/user/repo"` 或 `"https://github.com/user/repo/tree/branch"`） |
| `compress` | 否 | `false` | 啟用 Tree-sitter 壓縮以提取基本程式碼簽名和結構，同時刪除實現細節。在保持語義含義的同時減少約 70% 的令牌使用量。由於 `grep_repomix_output` 允許增量內容檢索，通常不需要。 |
| `includePatterns` | 否 | — | 使用 fast-glob 模式指定要包含的檔案。多個模式用逗號分隔（例如 `"**/*.{js,ts}"`、`"src/**,docs/**"`） |
| `ignorePatterns` | 否 | — | 使用 fast-glob 模式指定要排除的其他檔案。多個模式用逗號分隔（例如 `"test/**,*.spec.js"`）。補充 `.gitignore` 和內建排除。 |
| `topFilesLength` | 否 | `10` | 在指標摘要中顯示的最大檔案數（按大小排序） |
| `style` | 否 | `xml` | 輸出格式樣式：`xml`、`markdown`、`json` 或 `plain` |

**示例：**
```json
{
  "remote": "yamadashy/repomix",
  "compress": false,
  "includePatterns": "src/**/*.ts,**/*.md",
  "ignorePatterns": "**/*.log,tmp/",
  "topFilesLength": 10
}
```

### read_repomix_output

此工具讀取 Repomix 生成的輸出文件的內容。支援對大文件進行行範圍指定的部分讀取。此工具專為直接文件系統存取受限的環境而設計。

**參數：**

| 參數 | 必需 | 預設值 | 說明 |
|------|------|--------|------|
| `outputId` | 是 | — | 要讀取的 Repomix 輸出檔案的 ID |
| `startLine` | 否 | 檔案開頭 | 起始行號（從 1 開始，包含） |
| `endLine` | 否 | 檔案末尾 | 結束行號（從 1 開始，包含） |

**功能：**
- 專為基於 Web 的環境或沙箱應用程式設計
- 使用其 ID 檢索先前生成的輸出內容
- 無需文件系統存取權限即可安全存取打包的程式碼庫
- 支援大文件的部分讀取

**示例：**
```json
{
  "outputId": "8f7d3b1e2a9c6054",
  "startLine": 100,
  "endLine": 200
}
```

### grep_repomix_output

此工具使用 JavaScript RegExp 語法的類似 grep 的功能在 Repomix 輸出文件中搜尋模式。返回匹配行及其周圍的可選上下文行。

**參數：**

| 參數 | 必需 | 預設值 | 說明 |
|------|------|--------|------|
| `outputId` | 是 | — | 要搜尋的 Repomix 輸出檔案的 ID |
| `pattern` | 是 | — | 搜尋模式（JavaScript RegExp 語法） |
| `contextLines` | 否 | `0` | 在每個匹配項前後顯示的上下文行數。如果指定了 `beforeLines`/`afterLines`，則被覆蓋。 |
| `beforeLines` | 否 | — | 在每個匹配項前顯示的行數（類似 `grep -B`）。優先於 `contextLines`。 |
| `afterLines` | 否 | — | 在每個匹配項後顯示的行數（類似 `grep -A`）。優先於 `contextLines`。 |
| `ignoreCase` | 否 | `false` | 執行不區分大小寫的匹配 |

**功能：**
- 使用 JavaScript RegExp 語法進行強大的模式匹配
- 支援上下文行以更好地理解匹配
- 允許單獨控制前/後上下文行
- 區分大小寫和不區分大小寫的搜尋選項

**示例：**
```json
{
  "outputId": "8f7d3b1e2a9c6054",
  "pattern": "function\\s+\\w+\\(",
  "contextLines": 3,
  "ignoreCase": false
}
```

### file_system_read_file 和 file_system_read_directory

Repomix 的 MCP 伺服器提供了兩個文件系統工具，允許 AI 助手安全地與本地文件系統交互：

1. `file_system_read_file`
  - 使用絕對路徑從本地文件系統讀取文件內容
  - 包含內建安全驗證以檢測和防止存取包含敏感資訊的文件
  - 使用 [Secretlint](https://github.com/secretlint/secretlint) 實現安全驗證
  - 防止存取包含敏感資訊的文件（API 金鑰、密碼、機密）
  - 驗證絕對路徑以防止目錄遍歷攻擊
  - 對無效路徑和安全問題返回清晰的錯誤訊息

2. `file_system_read_directory`
  - 使用絕對路徑列出目錄的內容
  - 返回顯示文件和子目錄的格式化列表，帶有清晰的指示符
  - 使用清晰的指示符（`[FILE]` 或 `[DIR]`）顯示文件和目錄
  - 提供安全的目錄遍歷和適當的錯誤處理
  - 驗證路徑並確保使用絕對路徑
  - 對探索專案結構和理解程式碼庫組織很有用

這兩個工具都包含了強大的安全措施：
- 絕對路徑驗證以防止目錄遍歷攻擊
- 權限檢查以確保適當的存取權限
- 與 Secretlint 整合以檢測敏感資訊
- 清晰的錯誤訊息以便於除錯和安全意識

**示例：**
```typescript
// 讀取文件
const fileContent = await tools.file_system_read_file({
  path: '/absolute/path/to/file.txt'
});

// 列出目錄內容
const dirContent = await tools.file_system_read_directory({
  path: '/absolute/path/to/directory'
});
```

這些工具在 AI 助手需要執行以下操作時特別有用：
- 分析程式碼庫中的特定文件
- 導航目錄結構
- 驗證文件存在性和可存取性
- 確保安全的文件系統操作

## 將 Repomix 作為 MCP 伺服器使用的好處

將 Repomix 作為 MCP 伺服器使用提供了幾個優勢：

1. **直接整合**：AI 助手可以直接分析您的程式碼庫，無需手動文件準備。
2. **高效工作流程**：通過消除手動生成和上傳文件的需求，簡化了程式碼分析過程。
3. **一致輸出**：確保 AI 助手以一致、最佳化的格式接收程式碼庫。
4. **進階功能**：利用 Repomix 的所有功能，如程式碼壓縮、令牌計數和安全檢查。

配置完成後，您的 AI 助手可以直接使用 Repomix 的功能來分析程式碼庫，使程式碼分析工作流程更加高效。

## 相關資源

- [Claude Code 外掛](/zh-tw/guide/claude-code-plugins) - 便捷的 Claude Code 外掛整合
- [設定](/zh-tw/guide/configuration) - 自訂 Repomix 行為
- [命令列選項](/zh-tw/guide/command-line-options) - 完整的 CLI 參考
- [輸出格式](/zh-tw/guide/output) - 了解可用的輸出格式
