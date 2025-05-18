# 輸出格式

Repomix 支援三種輸出格式：
- XML（預設）：最結構化的格式，非常適合像 Claude 這樣能高效解析 XML 的 AI 工具
- Markdown：平衡可讀性和結構，適合 GitHub 和文檔導向的工作流程
- 純文字：最簡單的格式，與所有工具和平台具有通用兼容性

## XML 格式

```bash
repomix --style xml
```

XML 格式針對 AI 處理進行了優化，具有明確定義的部分和結構：

```xml
此檔案是整個程式碼庫的合併表示...

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
// 檔案內容在此
</file>
</files>
```

::: tip 為什麼選擇 XML？
XML 標籤幫助像 Claude 這樣的 AI 模型更準確地解析內容。Claude 的文檔[建議使用 XML 標籤](https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/use-xml-tags)來構建結構化提示，使模型更容易理解程式碼庫的不同部分。
:::

## Markdown 格式

```bash
repomix --style markdown
```

Markdown 提供可讀性良好的格式：

```markdown
此檔案是整個程式碼庫的合併表示...

# 檔案摘要
（元數據和 AI 指令）

# 目錄結構
```
src/
index.ts
utils/
helper.ts
```

# 檔案

## 檔案：src/index.ts
```typescript
// 檔案內容在此
```
```

## 與 AI 模型一起使用

每種格式都能與 AI 模型良好配合，但請考慮：
- 對於 Claude 和其他偏好結構化輸入且具有明確部分劃分的 AI 模型，使用 XML
- 當需要一般可讀性以及與人類一起分享 AI 分析時，使用 Markdown
- 對於簡單性、通用兼容性以及使用不解析標記的工具時，使用純文字

## 自定義

在 `repomix.config.json` 中設置默認格式：
```json
{
  "output": {
    "style": "xml",
    "filePath": "output.xml"
  }
}
```

## 純文字格式

```bash
repomix --style plain
```

輸出結構：
```text
此檔案是整個程式碼庫的合併表示...

================
檔案摘要
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
檔案
================

================
檔案：src/index.ts
================
// 檔案內容在此
```
