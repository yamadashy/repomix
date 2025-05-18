# MCP 伺服器

Repomix 支援 [模型上下文協議 (MCP)](https://modelcontextprotocol.io)，允許 AI 助手直接與您的程式碼庫互動。當作為 MCP 伺服器運行時，Repomix 提供工具，使 AI 助手能夠打包本地或遠端儲存庫進行分析，無需手動準備檔案。這種整合透過消除手動生成和上傳檔案的需求，簡化了程式碼分析的過程。

> [!NOTE]  
> 這是一項實驗性功能，我們將根據用戶反饋和實際使用情況積極改進

## 將 Repomix 作為 MCP 伺服器運行

要將 Repomix 作為 MCP 伺服器運行，使用 `--mcp` 標誌：

```bash
repomix --mcp
```

這會在 MCP 伺服器模式下啟動 Repomix，使其可用於支援模型上下文協議的 AI 助手。

## 配置 MCP 伺服器

要將 Repomix 作為 MCP 伺服器與像 Claude 這樣的 AI 助手一起使用，您需要配置 MCP 設置：

### 對於 VS Code

您可以使用以下方法之一在 VS Code 中安裝 Repomix MCP 伺服器：

1. **使用安裝徽章：**

  [![在 VS Code 中安裝](https://img.shields.io/badge/VS_Code-VS_Code?style=flat-square&label=Install%20Server&color=0098FF)](vscode:mcp/install?%7B%22name%22%3A%22repomix%22%2C%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22repomix%22%2C%22--mcp%22%5D%7D)<br>
  [![在 VS Code Insiders 中安裝](https://img.shields.io/badge/VS_Code_Insiders-VS_Code_Insiders?style=flat-square&label=Install%20Server&color=24bfa5)](vscode-insiders:mcp/install?%7B%22name%22%3A%22repomix%22%2C%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22repomix%22%2C%22--mcp%22%5D%7D)

2. **使用命令行：**

  ```bash
  code --add-mcp '{"name":"repomix","command":"npx","args":["-y","repomix","--mcp"]}'
  ```

  對於 VS Code Insiders：
  ```bash
  code-insiders --add-mcp '{"name":"repomix","command":"npx","args":["-y","repomix","--mcp"]}'
  ```

### 對於 Cline（VS Code 擴展）

編輯 `cline_mcp_settings.json` 檔案：

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

在 Cursor 中，從 `Cursor 設置` > `MCP` > `+ 添加新的全局 MCP 伺服器` 添加新的 MCP 伺服器，配置類似於 Cline。

### 對於 Claude Desktop

編輯 `claude_desktop_config.json` 檔案，配置類似於 Cline 的配置。

### 使用 Docker 代替 npx

除了使用 npx，您還可以使用 Docker 運行 Repomix 作為 MCP 伺服器：

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

此工具將本地程式碼目錄打包成一個合併檔案，用於 AI 分析。

**參數：**
- `directory`：（必需）要打包的目錄的絕對路徑
- `compress`：（可選，預設：true）是否執行智能程式碼提取以減少令牌數量
- `includePatterns`：（可選）包含模式的逗號分隔列表
- `ignorePatterns`：（可選）忽略模式的逗號分隔列表

**範例：**
```json
{
  "directory": "/path/to/your/project",
  "compress": true,
  "includePatterns": "src/**/*.ts,**/*.md",
  "ignorePatterns": "**/*.log,tmp/"
}
```

### pack_remote_repository

此工具獲取、克隆並將 GitHub 儲存庫打包成一個合併檔案，用於 AI 分析。

**參數：**
- `remote`：（必需）GitHub 儲存庫 URL 或 user/repo 格式（例如，yamadashy/repomix）
- `compress`：（可選，預設：true）是否執行智能程式碼提取以減少令牌數量
- `includePatterns`：（可選）包含模式的逗號分隔列表
- `ignorePatterns`：（可選）忽略模式的逗號分隔列表

**範例：**
```json
{
  "remote": "yamadashy/repomix",
  "compress": true,
  "includePatterns": "src/**/*.ts,**/*.md",
  "ignorePatterns": "**/*.log,tmp/"
}
```

### read_repomix_output

此工具在無法直接訪問檔案的環境中讀取 Repomix 輸出檔案的內容。

**參數：**
- `outputId`：（必需）要讀取的 Repomix 輸出檔案的 ID

**功能：**
- 專為基於網頁的環境或沙盒應用程序設計
- 使用 ID 檢索先前生成的輸出的內容
- 提供對打包程式碼庫的安全訪問，無需檔案系統訪問

**範例：**
```json
{
  "outputId": "8f7d3b1e2a9c6054"
}
```

### file_system_read_file 和 file_system_read_directory

Repomix 的 MCP 伺服器提供兩個檔案系統工具，允許 AI 助手安全地與本地檔案系統互動：

1. `file_system_read_file`
  - 使用絕對路徑讀取檔案內容
  - 使用 [Secretlint](https://github.com/secretlint/secretlint) 實現安全驗證
  - 防止訪問包含敏感信息的檔案
  - 返回格式化內容，並為無效路徑或安全問題提供清晰的錯誤消息

2. `file_system_read_directory`
  - 使用絕對路徑列出目錄內容
  - 顯示檔案和目錄，並有清晰的指示符（`[FILE]` 或 `[DIR]`）
  - 提供安全的目錄遍歷，並有適當的錯誤處理
  - 驗證路徑並確保它們是絕對路徑

這兩個工具都包含強大的安全措施：
- 絕對路徑驗證，防止目錄遍歷攻擊
- 權限檢查，確保適當的訪問權限
- 與 Secretlint 集成，用於敏感信息檢測
- 清晰的錯誤消息，以便更好地調試和安全意識
- 檔案類型驗證，防止訪問二進制或可執行檔案

**範例：**
```typescript
// 讀取檔案
const fileContent = await tools.file_system_read_file({
  path: '/absolute/path/to/file.txt'
});

// 列出目錄內容
const dirContent = await tools.file_system_read_directory({
  path: '/absolute/path/to/directory'
});
```

當 AI 助手需要以下操作時，這些工具特別有用：
- 分析程式碼庫中的特定檔案
- 導航目錄結構
- 驗證檔案存在和可訪問性
- 確保安全的檔案系統操作

## 將 Repomix 作為 MCP 伺服器的優勢

將 Repomix 作為 MCP 伺服器提供了幾個優勢：

1. **直接整合**：AI 助手可以直接分析您的程式碼庫，無需手動準備檔案。
2. **高效工作流程**：透過消除手動生成和上傳檔案的需求，簡化了程式碼分析的過程。
3. **一致輸出**：確保 AI 助手以一致、優化的格式接收程式碼庫。
4. **進階功能**：利用 Repomix 的所有功能，如程式碼壓縮、令牌計數和安全檢查。
5. **安全控制**：提供對程式碼庫的安全訪問，具有內建的安全驗證。

一旦配置完成，您的 AI 助手可以直接使用 Repomix 的功能來分析程式碼庫，使程式碼分析工作流程更加高效。
