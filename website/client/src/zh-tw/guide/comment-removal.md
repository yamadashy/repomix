# 註釋移除

Repomix 可以在生成輸出文件時自動移除程式碼中的註釋。這有助於減少干擾，讓程式碼更加簡潔。

## 使用方法

要啟用註釋移除，在 `repomix.config.json` 中將 `removeComments` 選項設置為 `true`：

```json
{
  "output": {
    "removeComments": true
  }
}
```

## 支援的語言

Repomix 支援移除多種程式設計語言的註釋，包括：

- JavaScript/TypeScript (`//`, `/* */`)
- Python (`#`, `"""`, `'''`)
- Java (`//`, `/* */`)
- C/C++ (`//`, `/* */`)
- HTML (`<!-- -->`)
- CSS (`/* */`)
- 以及更多語言...

## 示例

以下是 JavaScript 程式碼示例：

```javascript
// 這是單行註釋
function test() {
  /* 這是
     多行註釋 */
  return true;
}
```

啟用註釋移除後，輸出將變為：

```javascript
function test() {
  return true;
}
```

## 注意事項

- 註釋移除在其他處理步驟（如行號添加）之前執行
- 某些註釋，例如 JSDoc 註釋，可能會根據語言和上下文保留
- 如果你需要保留某些重要註釋，請考慮使用其他方式記錄這些信息，例如使用自定義指令

## 建議用法

1. **選擇性使用**：
  - 對於需要向 AI 展示實現細節的程式碼，保留註釋
  - 對於主要關注程式碼結構的分析，移除註釋

2. **配合其他功能**：
  - 與 `--remove-empty-lines` 選項組合使用，獲得更簡潔的輸出
  - 使用自定義指令提供額外的上下文信息

3. **效能考慮**：
  - 移除註釋可以減少輸出文件大小
  - 對於大型程式碼庫特別有用

## 相關資源

- [程式碼壓縮](/zh-tw/guide/code-compress) - 透過提取程式碼結構進一步減少令牌數量
- [設定](/zh-tw/guide/configuration) - 在設定檔中設定 `output.removeComments`
- [命令列選項](/zh-tw/guide/command-line-options) - 使用 `--remove-comments` 旗標
