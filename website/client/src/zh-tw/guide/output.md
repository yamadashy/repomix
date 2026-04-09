# 輸出格式

Repomix 支援四種輸出格式：
- XML（預設）
- Markdown
- JSON
- 純文字

## XML 格式

```bash
repomix --style xml
```

XML 格式針對 AI 處理進行了優化：

```xml
本文件是整個程式碼庫的合併表示形式...

<file_summary>
（元數據和 AI 指令）
</file_summary>

<directory_structure>
src/
  index.ts
  utils/
    helper.ts
</directory_structure>

<files>
<file path="src/index.ts">
// 文件內容
</file>
</files>

<git_logs>
<git_log_commit>
<date>2025-08-20 00:47:19 +0900</date>
<message>feat(cli): Add --include-logs option for git commit history</message>
<files>
README.md
src/cli/cliRun.ts
src/core/git/gitCommand.ts
src/core/git/gitLogHandle.ts
src/core/output/outputGenerate.ts
</files>
</git_log_commit>
<git_log_commit>
<date>2025-08-21 00:09:43 +0900</date>
<message>Merge pull request #795 from yamadashy/chore/ratchet-update-ci</message>
<files>
.github/workflows/ratchet-update.yml
</files>
</git_log_commit>
</git_logs>
```

### 為什麼選擇 XML 作為預設格式？

Repomix 基於廣泛的研究和測試，選擇 XML 作為預設輸出格式。這一決定基於實證證據和 AI 輔助程式碼分析的實際考量。

我們選擇 XML 主要受到各大 AI 提供商官方推薦的影響：
- **Anthropic (Claude)**: 明確推薦使用 XML 標籤來構建提示，聲明「Claude 在訓練過程中接觸過此類提示」（[文檔](https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/use-xml-tags)）
- **Google (Gemini)**: 推薦在複雜任務中使用包括 XML 在內的結構化格式（[文檔](https://cloud.google.com/vertex-ai/generative-ai/docs/learn/prompts/structure-prompts)）
- **OpenAI (GPT)**: 在複雜場景中倡導結構化提示（[公告](https://x.com/OpenAIDevs/status/1890147300493914437)、[cookbook](https://cookbook.openai.com/examples/gpt-5/gpt-5_prompting_guide)）

## Markdown 格式

```bash
repomix --style markdown
```

Markdown 提供了易讀的格式：

````markdown
本文件是整個程式碼庫的合併表示形式...

# 文件概要
（元數據和 AI 指令）

# 目錄結構
```
src/
index.ts
utils/
helper.ts
```

# 文件

## File: src/index.ts
```typescript
// 文件內容
```

# Git 記錄
```
2025-08-20 00:47:19 +0900|feat(cli): Add --include-logs option for git commit history
README.md
src/cli/cliRun.ts
src/core/git/gitCommand.ts
src/core/git/gitLogHandle.ts
src/core/output/outputGenerate.ts

2025-08-21 00:09:43 +0900|Merge pull request #795 from yamadashy/chore/ratchet-update-ci
.github/workflows/ratchet-update.yml
```
````

## JSON 格式

```bash
repomix --style json
```

JSON 格式提供使用 camelCase 屬性名的結構化、可程式化存取的輸出：

```json
{
  "fileSummary": {
    "generationHeader": "本文件是由 Repomix 將整個程式碼庫合併到單個文件中的表示形式。",
    "purpose": "本文件包含整個儲存庫內容的打包表示...",
    "fileFormat": "內容組織如下...",
    "usageGuidelines": "- 此文件應視為唯讀...",
    "notes": "- 某些文件可能已根據 .gitignore 規則被排除..."
  },
  "userProvidedHeader": "指定時的自訂標題文字",
  "directoryStructure": "src/
  cli/
    cliOutput.ts
    index.ts
  config/
    configLoader.ts",
  "files": {
    "src/index.js": "// 文件內容",
    "src/utils.js": "// 文件內容"
  },
  "instruction": "來自 instructionFilePath 的自訂指令"
}
```

### JSON 格式的優勢

JSON 格式非常適合：
- **程式化處理**: 使用任何程式語言中的 JSON 函式庫都能輕鬆解析和操作
- **API 整合**: 可直接被 Web 服務和應用程式使用
- **AI 工具相容性**: 為機器學習和 AI 系統優化的結構化格式
- **資料分析**: 使用 `jq` 等工具輕鬆提取特定資訊

### 使用 `jq` 處理 JSON 輸出

JSON 格式使得程式化提取特定資訊變得容易。以下是常見範例：

#### 基本文件操作
```bash
# 列出所有文件路徑
cat repomix-output.json | jq -r '.files | keys[]'

# 計算文件總數
cat repomix-output.json | jq '.files | keys | length'

# 提取特定文件內容
cat repomix-output.json | jq -r '.files["README.md"]'
cat repomix-output.json | jq -r '.files["src/index.js"]'
```

#### 文件篩選和分析
```bash
# 按副檔名查找文件
cat repomix-output.json | jq -r '.files | keys[] | select(endswith(".ts"))'
cat repomix-output.json | jq -r '.files | keys[] | select(endswith(".js") or endswith(".ts"))'

# 查找包含特定文字的文件
cat repomix-output.json | jq -r '.files | to_entries[] | select(.value | contains("function")) | .key'

# 建立包含字元計數的文件清單
cat repomix-output.json | jq -r '.files | to_entries[] | "\(.key): \(.value | length) 個字元"'
```

#### 元資料提取
```bash
# 提取目錄結構
cat repomix-output.json | jq -r '.directoryStructure'

# 取得文件概要資訊
cat repomix-output.json | jq '.fileSummary.purpose'
cat repomix-output.json | jq -r '.fileSummary.generationHeader'

# 提取使用者提供的標題（如果存在）
cat repomix-output.json | jq -r '.userProvidedHeader // "未提供標題"'

# 取得自訂指令
cat repomix-output.json | jq -r '.instruction // "未提供指令"'
```

#### 進階分析
```bash
# 按內容長度查找最大的文件
cat repomix-output.json | jq -r '.files | to_entries[] | [.key, (.value | length)] | @tsv' | sort -k2 -nr | head -10

# 搜尋包含特定模式的文件
cat repomix-output.json | jq -r '.files | to_entries[] | select(.value | test("import.*react"; "i")) | .key'

# 提取符合多個副檔名的文件路徑
cat repomix-output.json | jq -r '.files | keys[] | select(test("\.(js|ts|jsx|tsx)$"))'
```

## 純文字格式

```bash
repomix --style plain
```

輸出結構：
```text
本文件是整個程式碼庫的合併表示形式...

================
文件概要
================
（元數據和 AI 指令）

================
目錄結構
================
src/
  index.ts
  utils/
    helper.ts

================
文件
================

================
File: src/index.ts
================
// 文件內容

================
Git 記錄
================
2025-08-20 00:47:19 +0900|feat(cli): Add --include-logs option for git commit history
README.md
src/cli/cliRun.ts
src/core/git/gitCommand.ts
src/core/git/gitLogHandle.ts
src/core/output/outputGenerate.ts

2025-08-21 00:09:43 +0900|Merge pull request #795 from yamadashy/chore/ratchet-update-ci
.github/workflows/ratchet-update.yml
```

## 在 AI 模型中的使用

每種格式都能在 AI 模型中正常工作，但需要考慮以下幾點：
- 對 Claude 使用 XML（解析最準確）
- 對一般可讀性使用 Markdown
- 對程式化處理和 API 整合使用 JSON
- 對簡單性和通用相容性使用純文字

## 自定義設置

在 `repomix.config.json` 中設置預設格式：
```json
{
  "output": {
    "style": "xml",
    "filePath": "output.xml"
  }
}
```

## 相關資源

- [設定](/zh-tw/guide/configuration) - 完整的設定選項參考
- [命令列選項](/zh-tw/guide/command-line-options) - 使用 `--style` 設定輸出格式
- [程式碼壓縮](/zh-tw/guide/code-compress) - 在保持結構的同時減少令牌數量
- [提示範例](/zh-tw/guide/prompt-examples) - 搭配不同 AI 模型使用輸出的技巧
