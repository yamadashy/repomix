---
title: 設定
description: 使用 JSON、JSONC、JSON5、JavaScript 或 TypeScript 檔案設定 Repomix，包括輸出格式、包含與忽略模式以及進階選項。
---

# 設定

Repomix可以透過設定檔或命令列選項進行設定。設定檔允許您自訂程式碼庫的處理和輸出方式。

## 設定檔格式

Repomix支援多種設定檔格式，以提供靈活性和易用性。

Repomix將按以下優先順序自動搜尋設定檔：

1. **TypeScript** (`repomix.config.ts`, `repomix.config.mts`, `repomix.config.cts`)
2. **JavaScript/ES Module** (`repomix.config.js`, `repomix.config.mjs`, `repomix.config.cjs`)
3. **JSON** (`repomix.config.json5`, `repomix.config.jsonc`, `repomix.config.json`)

### JSON設定

在專案目錄中建立設定檔：
```bash
repomix --init
```

這將建立一個帶有預設設定的`repomix.config.json`檔案。您還可以建立一個全域設定檔，在找不到本地設定時將使用它作為後備：

```bash
repomix --init --global
```

### TypeScript設定

TypeScript設定檔提供最佳的開發體驗，具有完整的型別檢查和IDE支援。

**安裝：**

要使用帶有`defineConfig`的TypeScript或JavaScript設定，您需要將Repomix安裝為開發依賴：

```bash
npm install -D repomix
```

**範例：**

```typescript
// repomix.config.ts
import { defineConfig } from 'repomix';

export default defineConfig({
  output: {
    filePath: 'output.xml',
    style: 'xml',
    removeComments: true,
  },
  ignore: {
    customPatterns: ['**/node_modules/**', '**/dist/**'],
  },
});
```

**優勢：**
- ✅ IDE中的完整TypeScript型別檢查
- ✅ 出色的IDE自動完成和IntelliSense
- ✅ 使用動態值（時間戳記、環境變數等）

**動態值範例：**

```typescript
// repomix.config.ts
import { defineConfig } from 'repomix';

// 產生基於時間戳記的檔案名稱
const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');

export default defineConfig({
  output: {
    filePath: `output-${timestamp}.xml`,
    style: 'xml',
  },
});
```

### JavaScript設定

JavaScript設定檔的工作方式與TypeScript相同，支援`defineConfig`和動態值。

## 設定選項

| 選項                             | 說明                                                                                                                         | 預設值                 |
|----------------------------------|------------------------------------------------------------------------------------------------------------------------------|------------------------|
| `input.maxFileSize`              | 要處理的最大檔案大小（位元組）。超過此大小的檔案將被跳過。用於排除大型二進位檔案或資料檔案                                | `50000000`            |
| `input.processors`               | 依序排列的 `{ pattern, command, timeout?, onError? }` 項目陣列，會在打包前執行外部命令來轉換符合的檔案內容（例如 JSON→TOON）。第一個符合的 glob 優先。因為會執行任意命令，所以僅在本地 CLI 執行時（以及使用 `--remote-trust-config` 的遠端儲存庫）啟用。請參閱[檔案處理器](#檔案處理器) | 未設定                 |
| `output.filePath`                | 輸出檔案名。支援XML、Markdown和純文字格式                                                                                   | `"repomix-output.xml"` |
| `output.style`                   | 輸出樣式（`xml`、`markdown`、`json`、`plain`）。每種格式對不同的AI工具都有其優勢                                                   | `"xml"`                |
| `output.filePathStyle`           | 輸出中顯示檔案路徑的方式（`target-relative` 表示路徑相對於每個目標根目錄，`cwd-relative` 表示路徑相對於目前工作目錄）              | `"target-relative"`    |
| `output.parsableStyle`           | 是否根據所選樣式模式轉義輸出。可以提供更好的解析，但可能會增加令牌數量                                                    | `false`                |
| `output.compress`                | 是否使用Tree-sitter執行智慧程式碼提取，在保持結構的同時減少令牌數量                                                       | `false`                |
| `output.patterns`                | 每個檔案的包含層級。一個有序的 `{ pattern, compress?, directoryStructureOnly? }` 項目陣列；第一個符合的 glob 優先，並覆寫該檔案的全域 `output.compress` 設定。請參閱[每個檔案的包含層級](#每個檔案的包含層級) | 未設定                 |
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
| `output.splitOutput`             | 按每部分最大大小將輸出拆分為多個編號檔案（例如，`1000000` 表示約1MB）。CLI 接受可讀大小如 `500kb` 或 `2mb`。使每個檔案保持在限制以下，並避免跨部分拆分來源檔案 | 未設定 |
| `output.tokenBudget`             | 當打包輸出超過此權杖數量時以非零退出碼失敗。作為 CI/agent 上下文限制的防護；輸出仍會產生 | 未設定 |
| `output.topFilesLength`          | 在摘要中顯示的頂部檔案數量。如果設定為0，則不顯示摘要                                                                      | `5`                    |
| `output.includeEmptyDirectories` | 是否在儲存庫結構中包含空目錄                                                                                               | `false`                |
| `output.includeFullDirectoryStructure` | 使用`include`模式時，是否顯示完整的目錄樹（遵守ignore模式）同時僅處理包含的檔案。為AI分析提供完整的儲存庫上下文 | `false`                |
| `output.git.sortByChanges`       | 是否按Git更改次數對檔案進行排序。更改較多的檔案顯示在底部                                                                 | `true`                 |
| `output.git.sortByChangesMaxCommits` | 分析Git更改時要分析的最大提交數。限制歷史深度以提高效能                                                               | `100`                  |
| `output.git.includeDiffs`        | 是否在輸出中包含Git差異。分別顯示工作樹和暫存區的更改                                                                     | `false`                |
| `output.git.includeLogs`         | 是否在輸出中包含Git記錄。顯示提交歷史包括日期、訊息和檔案路徑                                                            | `false`                |
| `output.git.includeLogsCount`    | 在輸出中包含的git記錄提交數量                                                                                        | `50`                   |
| `include`                        | 要包含的檔案模式（使用[glob模式](https://github.com/mrmlnc/fast-glob?tab=readme-ov-file#pattern-syntax)）                 | `[]`                   |
| `ignore.useGitignore`            | 是否使用專案的`.gitignore`檔案中的模式                                                                                     | `true`                 |
| `ignore.useDotIgnore`            | 是否使用專案的`.ignore`檔案中的模式                                                                                       | `true`                 |
| `ignore.useDefaultPatterns`      | 是否使用預設忽略模式（node_modules、.git等）                                                                              | `true`                 |
| `ignore.customPatterns`          | 額外的忽略模式（使用[glob模式](https://github.com/mrmlnc/fast-glob?tab=readme-ov-file#pattern-syntax)）                   | `[]`                   |
| `security.enableSecurityCheck`   | 是否使用Secretlint執行安全檢查以檢測敏感資訊                                                                              | `true`                 |
| `tokenCount.encoding`            | OpenAI相容的令牌計數編碼（GPT-4o使用`o200k_base`，GPT-4/3.5使用`cl100k_base`）。使用 [gpt-tokenizer](https://github.com/nicolo-ribaudo/gpt-tokenizer)。 | `"o200k_base"`         |

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
    "maxFileSize": 50000000,
    // "processors": [
    //   { "pattern": "**/*.json", "command": "npx @toon-format/cli {file}" }
    // ]
  },
  "output": {
    "filePath": "repomix-output.xml",
    "style": "xml",
    "filePathStyle": "target-relative",
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
    // "patterns": [
    //   { "pattern": "docs/**/*", "compress": true },
    //   { "pattern": "website/**/*", "directoryStructureOnly": true }
    // ],
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
1. 當前目錄中的本地設定檔（優先順序：TS > JS > JSON）
   - TypeScript: `repomix.config.ts`, `repomix.config.mts`, `repomix.config.cts`
   - JavaScript: `repomix.config.js`, `repomix.config.mjs`, `repomix.config.cjs`
   - JSON: `repomix.config.json5`, `repomix.config.jsonc`, `repomix.config.json`
2. 全域設定檔（優先順序：TS > JS > JSON）
   - Windows：
     - TypeScript: `%LOCALAPPDATA%\Repomix\repomix.config.ts`, `.mts`, `.cts`
     - JavaScript: `%LOCALAPPDATA%\Repomix\repomix.config.js`, `.mjs`, `.cjs`
     - JSON: `%LOCALAPPDATA%\Repomix\repomix.config.json5`, `.jsonc`, `.json`
   - macOS/Linux：
     - TypeScript: `~/.config/repomix/repomix.config.ts`, `.mts`, `.cts`
     - JavaScript: `~/.config/repomix/repomix.config.js`, `.mjs`, `.cjs`
     - JSON: `~/.config/repomix/repomix.config.json5`, `.jsonc`, `.json`

命令列選項優先於設定檔設定。

## 包含模式

Repomix支援使用[glob模式](https://github.com/mrmlnc/fast-glob?tab=readme-ov-file#pattern-syntax)指定要包含的檔案。這允許更靈活和強大的檔案選擇：

- 使用`**/*.js`包含任何目錄中的所有JavaScript檔案
- 使用`src/**/*`包含`src`目錄及其子目錄中的所有檔案
- 組合多個模式，如`["src/**/*.js", "**/*.md"]`以包含`src`中的JavaScript檔案和所有Markdown檔案

您可以在設定檔中指定包含模式：

```json
{
  "include": ["src/**/*", "tests/**/*.test.js"]
}
```

或使用`--include`命令列選項進行一次性過濾。

## 忽略模式

Repomix提供多種方法來設定忽略模式，以在打包過程中排除特定檔案或目錄：

- **.gitignore**：預設情況下，使用專案的`.gitignore`檔案和`.git/info/exclude`中列出的模式。此行為可以透過`ignore.useGitignore`設定或`--no-gitignore` CLI選項控制。
- **.ignore**：您可以在專案根目錄中使用`.ignore`檔案，格式與`.gitignore`相同。ripgrep和the silver searcher等工具也會使用此檔案，減少維護多個忽略檔案的需求。此行為可以透過`ignore.useDotIgnore`設定或`--no-dot-ignore` CLI選項控制。
- **預設模式**：Repomix包含常見排除檔案和目錄的預設清單（例如node_modules、.git、二進制檔案）。此功能可以透過`ignore.useDefaultPatterns`設定或`--no-default-patterns` CLI選項控制。有關詳細資訊，請參閱[defaultIgnore.ts](https://github.com/yamadashy/repomix/blob/main/src/config/defaultIgnore.ts)。
- **.repomixignore**：您可以在專案根目錄中建立`.repomixignore`檔案來定義Repomix特定的忽略模式。此檔案遵循與`.gitignore`相同的格式。
- **自訂模式**：可以使用設定檔中的`ignore.customPatterns`選項指定其他忽略模式。您可以使用`-i, --ignore`命令列選項覆寫此設定。

**優先順序**（從高到低）：

1. 自訂模式（`ignore.customPatterns`）
2. 忽略檔案（`.repomixignore`、`.ignore`、`.gitignore`和`.git/info/exclude`）：
   - 在巢狀目錄中時，更深層目錄中的檔案具有更高優先順序
   - 在同一目錄中時，這些檔案以不特定的順序合併
3. 預設模式（如果`ignore.useDefaultPatterns`為true且未使用`--no-default-patterns`）

這種方法允許根據專案需求靈活設定檔案排除。它透過確保排除安全敏感檔案和大型二進制檔案來幫助優化產生的打包檔案的大小，同時防止機密資訊外洩。

**注意：**預設情況下，二進制檔案不包含在打包輸出中，但它們的路徑列在輸出檔案的「倉庫結構」部分。這提供了倉庫結構的完整概覽，同時保持打包檔案高效且基於文字。有關詳細資訊，請參閱[二進制檔案處理](#二進制檔案處理)。

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

## 二進制檔案處理

二進制檔案（如圖像、PDF、編譯的二進制檔案、歸檔檔案等）經過特殊處理以保持高效的基於文字的輸出：

- **檔案內容**：二進制檔案**不包含**在打包輸出中，以保持檔案基於文字且對AI處理高效
- **目錄結構**：二進制檔案**路徑被列出**在目錄結構部分，提供倉庫的完整概覽

這種方法確保您獲得倉庫結構的完整視圖，同時保持針對AI消費優化的高效的基於文字的輸出。

**範例：**

如果您的倉庫包含`logo.png`和`app.jar`：
- 它們將出現在目錄結構部分
- 它們的內容將不會包含在檔案部分

**目錄結構輸出：**
```
src/
  index.ts
  utils.ts
assets/
  logo.png
build/
  app.jar
```

這樣，AI工具可以理解這些二進制檔案存在於您的專案結構中，而無需處理其二進制內容。

**注意：**您可以使用`input.maxFileSize`設定選項（預設值：50MB）控制最大檔案大小閾值。大於此限制的檔案將被完全跳過。

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

### 每個檔案的包含層級

`output.compress` 會對每個檔案套用單一層級，而 `output.patterns` 則讓您可以從設定檔中**依 glob** 控制細節層級。每個項目透過 glob 鎖定檔案（比對方式與 `include`/`ignore` 相同），並針對符合的檔案覆寫全域 `output.compress` 設定。

```json5
{
  "output": {
    "compress": false, // 全域預設值作為萬用後備
    "patterns": [
      { "pattern": "docs/**/*", "compress": true },
      { "pattern": "website/**/*", "directoryStructureOnly": true }
    ]
  }
}
```

每個檔案會解析為以下三種層級之一：

- **完整內容**（預設）：包含檔案的完整內容。
- **壓縮**（`compress: true`）：內容會通過與 `output.compress` 相同的 Tree-sitter 處理流程。
- **僅目錄結構**（`directoryStructureOnly: true`）：檔案會列在目錄結構中，但其內容區塊會完全從輸出中省略。

規則如下：

- 模式會依陣列順序評估，對於指定的檔案，**第一個符合的模式優先**。
- 符合的模式的旗標會覆寫全域 `output.compress` 設定。若模式符合但未設定任何旗標，則會強制該檔案使用**完整內容**，這對於將檔案從全域 `compress` 中加入白名單很方便。
- 當同一個模式同時設定 `directoryStructureOnly` 與 `compress` 時，`directoryStructureOnly` 優先。
- 若沒有任何模式符合，則套用全域行為（完整內容，或當 `output.compress` 為 `true` 時為壓縮）。

此選項僅限設定檔使用；沒有對應的 CLI 旗標。

### 檔案處理器

`input.processors` 會執行外部命令，在檔案內容被打包**之前**進行轉換。每個項目透過 glob 鎖定檔案（比對方式與 `include`/`ignore` 相同），並以該命令的標準輸出取代符合檔案的內容。這對於縮減令牌數量或轉換格式的處理很有用，例如將 JSON 轉換為 [TOON](https://github.com/toon-format/toon)、壓縮 SVG，或將 notebook 轉換為純腳本。

```json5
{
  "input": {
    "processors": [
      {
        "pattern": "**/*.json",
        "command": "npx @toon-format/cli {file}"
      }
    ]
  }
}
```

運作方式：

- Repomix 會將每個符合的檔案內容寫入暫存檔案，並以其路徑取代命令中的 `{file}` 佔位符（此佔位符為**必要**）。
- 此命令會透過 shell 執行，因此管線與 `npx` 等工具都能運作。其標準輸出會成為該檔案的新內容，接著會像其他檔案一樣流經管線的其餘部分（安全檢查、令牌計數與輸出產生）。
- 模式會依陣列順序評估，**第一個符合的模式優先**——一個檔案最多只會被一個處理器轉換（不會串聯處理）。

各處理器的選項：

- `timeout`：等待命令執行的最長時間（毫秒）。預設值：`60000`（60 秒）。請注意，`npx` 在快取為空時可能需要額外時間下載套件。
- `onError`：命令以非零狀態退出或逾時時的處理方式。`"fail"`（預設）會中止整個打包過程；`"skip"` 會記錄警告並回退使用該檔案的原始內容。

範例命令（每個都是與合適的 `pattern` 搭配的 `command` 值）：

| 模式 | `command` | 作用 |
| --- | --- | --- |
| `**/*.json` | `jq -c . {file}` | 去除空白以壓縮 JSON |
| `**/*.json` | `npx @toon-format/cli {file}` | 將 JSON 轉換為 [TOON](https://github.com/toon-format/toon)，一種精簡且節省 token 的格式 |
| `**/*.svg` | `npx svgo -i {file} -o -` | 壓縮 SVG |
| `**/*.ipynb` | `jupyter nbconvert --to script --stdout {file}` | 將 Jupyter notebook 轉換為純 Python 指令碼 |

由於第一個符合的模式優先，因此每個檔案只套用一個處理器——例如，對於 `**/*.json` 只選擇 `jq` 或 TOON 轉換器其中之一。命令必須將轉換後的內容寫入標準輸出，而且它呼叫的工具必須在你的 `PATH` 上可用（基於 `npx` 的命令會在首次使用時下載工具）。

::: warning 安全性
檔案處理器會執行來自您設定檔的**任意命令**，因此遵循嚴格的信任模型：

- **僅在本地 CLI 執行時**啟用 —— Repomix 會假設您工作目錄中的設定檔屬於您自己，這與 npm 腳本或 Makefile 的信任邊界相同。同樣地，如果您在他人提供的儲存庫中執行 `repomix`，卻**事先未檢查其 `repomix.config.json`**，其處理器命令就會在您的機器上執行。在打包不受信任的儲存庫之前，請先檢查其設定檔。
- 在函式庫 API（`pack()` / `runCli()`）、MCP 伺服器，以及託管的 [repomix.com](https://repomix.com) 中皆為**停用**狀態，因此這些管道都無法從設定檔執行命令。
- 對於遠端儲存庫（`--remote`），複製儲存庫的設定 —— 以及其處理器 —— 只有在您明確傳入 `--remote-trust-config` 時才會被信任。若未傳入，遠端設定甚至不會被載入。

啟動時會記錄目前啟用的處理器，讓來自不熟悉設定檔的意外處理器變得可見。由於命令會在啟動時與錯誤訊息中被印出，請透過環境變數（例如 `$TOKEN`）參照憑證，而非直接寫在命令中，因為環境變數在記錄時不會被展開。
:::

注意事項：

- 不建議在同一個檔案上同時使用**會改變格式**的處理器與 `output.compress`、`output.removeComments` 或 `output.patterns` 的 `compress`：這些步驟是依檔案的原始副檔名來分派的，因此會對轉換後的內容執行錯誤的語言處理器。基於同樣的原因，Markdown 輸出中的程式碼區塊也會依原始副檔名標記（例如，JSON→TOON 轉換後的檔案會標記為 `json`）。壓縮是盡力而為，解析失敗時會靜默回退為轉換後的內容。
- 使用 `--watch` 時，符合的檔案會在每次重新建置時重新處理，也就是每次都會重新執行該命令。
- 逾時時，Repomix 會終止該命令所在的 shell；若命令自行產生了長期執行的背景程序，這些程序可能會繼續執行。
- 處理器只會看到文字檔案（二進位檔案會在處理前被排除），其輸出會以 UTF-8 讀取。

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

## 相關資源

- [命令列選項](/zh-tw/guide/command-line-options) - 完整的 CLI 參考（CLI 選項優先於設定檔設定）
- [輸出格式](/zh-tw/guide/output) - 各種輸出格式的詳細說明
- [安全](/zh-tw/guide/security) - Repomix 如何偵測敏感資訊
- [程式碼壓縮](/zh-tw/guide/code-compress) - 透過 Tree-sitter 減少令牌數量
- [GitHub 倉庫處理](/zh-tw/guide/remote-repository-processing) - 遠端倉庫處理選項
