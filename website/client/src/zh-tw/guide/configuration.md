# 設定

Repomix可以透過設定檔（`repomix.config.json`）或命令列選項進行設定。設定檔允許您自訂程式碼庫的處理和輸出方式。

## 快速開始

在專案目錄中建立設定檔：
```bash
repomix --init
```

這將建立一個帶有預設設定的`repomix.config.json`檔案。您還可以建立一個全域設定檔，在找不到本地設定時將使用它作為後備：

```bash
repomix --init --global
```

## 設定選項

| 選項                             | 說明                                                                                                                         | 預設值                 |
|----------------------------------|------------------------------------------------------------------------------------------------------------------------------|------------------------|
| `input.maxFileSize`              | 要處理的最大檔案大小（位元組）。超過此大小的檔案將被跳過。用於排除大型二進位檔案或資料檔案                                | `50000000`            |
| `output.filePath`                | 輸出檔案名。支援XML、Markdown和純文字格式                                                                                   | `"repomix-output.xml"` |
| `output.style`                   | 輸出樣式（`xml`、`markdown`、`plain`）。每種格式對不同的AI工具都有其優勢                                                   | `"xml"`                |
| `output.parsableStyle`           | 是否根據所選樣式模式轉義輸出。可以提供更好的解析，但可能會增加令牌數量                                                    | `false`                |
| `output.compress`                | 是否使用Tree-sitter執行智慧程式碼提取，在保持結構的同時減少令牌數量                                                       | `false`                |
| `output.headerText`              | 要包含在檔案頭部的自訂文字。對於為AI工具提供上下文或指令很有用                                                            | `null`                 |
| `output.instructionFilePath`     | 包含用於AI處理的詳細自訂指令的檔案路徑                                                                                     | `null`                 |
| `output.fileSummary`             | 是否在輸出開頭包含顯示檔案計數、大小和其他指標的摘要部分                                                                   | `true`                 |
| `output.directoryStructure`      | 是否在輸出中包含目錄結構。幫助AI理解專案組織                                                                               | `true`                 |
| `output.files`                   | 是否在輸出中包含檔案內容。設定為false時只包含結構和元資料                                                                  | `true`                 |
| `output.removeComments`          | 是否從支援的檔案類型中刪除註解。可以減少雜訊和令牌數量                                                                    | `false`                |
| `output.removeEmptyLines`        | 是否從輸出中刪除空行以減少令牌數量                                                                                         | `false`                |
| `output.showLineNumbers`         | 是否為每行添加行號。有助於引用程式碼的特定部分                                                                             | `false`                |
| `output.truncateBase64`          | 是否截斷長的base64數據字符串（例如圖像）以減少令牌數量                                                                      | `false`                |
| `output.copyToClipboard`         | 是否除了儲存檔案外還將輸出複製到系統剪貼簿                                                                                 | `false`                |
| `output.topFilesLength`          | 在摘要中顯示的頂部檔案數量。如果設定為0，則不顯示摘要                                                                      | `5`                    |
| `output.includeEmptyDirectories` | 是否在儲存庫結構中包含空目錄                                                                                               | `false`                |
| `output.git.sortByChanges`       | 是否按Git更改次數對檔案進行排序。更改較多的檔案顯示在底部                                                                 | `true`                 |
| `output.git.sortByChangesMaxCommits` | 分析Git更改時要分析的最大提交數。限制歷史深度以提高效能                                                               | `100`                  |
| `output.git.includeDiffs`        | 是否在輸出中包含Git差異。分別顯示工作樹和暫存區的更改                                                                     | `false`                |
| `output.git.includeLogs`         | 是否在輸出中包含Git記錄。顯示提交歷史包括日期、訊息和檔案路徑                                                            | `false`                |
| `output.git.includeLogsCount`    | 在輸出中包含的git記錄提交數量                                                                                        | `50`                   |
| `include`                        | 要包含的檔案模式（使用[glob模式](https://github.com/mrmlnc/fast-glob?tab=readme-ov-file#pattern-syntax)）                 | `[]`                   |
| `ignoreContent`                  | Patterns of files whose content should be ignored (using [glob patterns](https://github.com/mrmlnc/fast-glob?tab=readme-ov-file#pattern-syntax)); prefix with `!` to keep specific paths | `[]`                   |
| `ignore.useGitignore`            | 是否使用專案的`.gitignore`檔案中的模式                                                                                     | `true`                 |
| `ignore.useDefaultPatterns`      | 是否使用預設忽略模式（node_modules、.git等）                                                                              | `true`                 |
| `ignore.customPatterns`          | 額外的忽略模式（使用[glob模式](https://github.com/mrmlnc/fast-glob?tab=readme-ov-file#pattern-syntax)）                   | `[]`                   |
| `security.enableSecurityCheck`   | 是否使用Secretlint執行安全檢查以檢測敏感資訊                                                                              | `true`                 |
| `tokenCount.encoding`            | OpenAI的[tiktoken](https://github.com/openai/tiktoken)分詞器使用的令牌計數編碼。GPT-4o使用`o200k_base`，GPT-4/3.5使用`cl100k_base`。詳見[tiktoken model.py](https://github.com/openai/tiktoken/blob/main/tiktoken/model.py#L24) | `"o200k_base"`         |

設定檔支援[JSON5](https://json5.org/)語法，允許：
- 註解（單行和多行）
- 物件和陣列中的尾隨逗號
- 無引號屬性名
- 更靈活的字串語法

## 模式验证

您可以透過添加`$schema`屬性為設定檔啟用模式验证：

```json
{
  "$schema": "https://repomix.com/schemas/latest/schema.json",
  "output": {
    "filePath": "repomix-output.md",
    "style": "markdown"
  }
}
```

這在支援JSON結構描述的編輯器中提供自動完成和驗證功能。

## 設定檔範例

以下是完整設定檔（`repomix.config.json`）的範例：

```json
{
  "$schema": "https://repomix.com/schemas/latest/schema.json",
  "input": {
    "maxFileSize": 50000000
  },
  "output": {
    "filePath": "repomix-output.xml",
    "style": "xml",
    "parsableStyle": false,
    "compress": false,
    "headerText": "打包檔案的自訂頭部資訊",
    "fileSummary": true,
    "directoryStructure": true,
    "files": true,
    "removeComments": false,
    "removeEmptyLines": false,
    "topFilesLength": 5,
    "showLineNumbers": false,
    "truncateBase64": false,
    "copyToClipboard": false,
    "includeEmptyDirectories": false,
    "git": {
      "sortByChanges": true,
      "sortByChangesMaxCommits": 100,
      "includeDiffs": false,
      "includeLogs": false,
      "includeLogsCount": 50
    }
  },
  "include": ["**/*"],
  "ignoreContent": ["components/**", "!components/slider/**"],
  "ignore": {
    "useGitignore": true,
    "useDefaultPatterns": true,
    // 模式也可以在 .repomixignore 中指定
    "customPatterns": [
      "additional-folder",
      "**/*.log"
    ],
  },
  "security": {
    "enableSecurityCheck": true
  },
  "tokenCount": {
    "encoding": "o200k_base"
  }
}
```

## 設定檔位置

Repomix按以下順序尋找設定檔：
1. 當前目錄中的本地設定檔（`repomix.config.json`）
2. 全域設定檔：
   - Windows：`%LOCALAPPDATA%\Repomix\repomix.config.json`
   - macOS/Linux：`~/.config/repomix/repomix.config.json`

命令列選項優先於設定檔設定。

## 忽略模式

Repomix提供多種方式來指定要忽略的檔案。模式按以下優先順序處理：

1. CLI選項（`--ignore`）
2. 專案目錄中的`.repomixignore`檔案
3. `.gitignore`和`.git/info/exclude`（如果`ignore.useGitignore`為true）
4. 預設模式（如果`ignore.useDefaultPatterns`為true）

`.repomixignore`範例：
```text
# 快取目錄
.cache/
tmp/

# 建置輸出
dist/
build/

# 日誌
*.log
```

## 預設忽略模式

當`ignore.useDefaultPatterns`為true時，Repomix自動忽略以下常見模式：
```text
node_modules/**
.git/**
coverage/**
dist/**
```

完整列表請參見[defaultIgnore.ts](https://github.com/yamadashy/repomix/blob/main/src/config/defaultIgnore.ts)

## 進階功能

### 程式碼壓縮

程式碼壓縮功能（透過`output.compress: true`啟用）使用[Tree-sitter](https://github.com/tree-sitter/tree-sitter)智慧提取基本程式碼結構，同時移除實作細節。這有助於在保持重要的結構資訊的同時減少令牌數量。

主要優點：
- 顯著減少令牌數量
- 保留類別和函式簽名
- 保持匯入和匯出
- 保留型別定義和介面
- 移除函式本體和實作細節

更多詳細資訊和範例，請參閱[程式碼壓縮指南](code-compress)。

### Git整合

`output.git`設定提供強大的Git感知功能：

- `sortByChanges`：當設定為true時，檔案按Git更改次數（修改該檔案的提交數）排序。更改次數較多的檔案出現在輸出的底部。這有助於優先處理更活躍開發的檔案。預設值：`true`
- `sortByChangesMaxCommits`：計算檔案更改次數時要分析的最大提交數。預設值：`100`
- `includeDiffs`：當設定為true時，在輸出中包含Git差異（同時分別包含工作樹和暫存區的更改）。這允許讀者查看儲存庫中的待處理更改。預設值：`false`
- `includeLogs`：當設定為true時，在輸出中包含Git記錄。顯示提交歷史包括日期、訊息和檔案路徑。這有助於AI理解開發模式和檔案關係。預設值：`false`
- `includeLogsCount`：在git記錄中包含的最近提交數量。預設值：`50`

設定範例：
```json
{
  "output": {
    "git": {
      "sortByChanges": true,
      "sortByChangesMaxCommits": 100,
      "includeDiffs": true,
      "includeLogs": true,
      "includeLogsCount": 25
    }
  }
}
```

### 安全檢查

當`security.enableSecurityCheck`啟用時，Repomix使用[Secretlint](https://github.com/secretlint/secretlint)在將程式碼庫包含在輸出中之前檢測敏感資訊。這有助於防止意外暴露：

- API金鑰
- 存取令牌
- 私密金鑰
- 密碼
- 其他敏感憑證

### 註解移除

當`output.removeComments`設定為`true`時，將從支援的檔案類型中移除註解，以減少輸出大小並專注於核心程式碼內容。這在以下情況特別有用：

- 處理大量文件化的程式碼
- 嘗試減少令牌數量
- 專注於程式碼結構和邏輯

有關支援的語言和詳細範例，請參閱[註解移除指南](comment-removal)。
