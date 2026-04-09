# 自定義指令

Repomix 允許你提供自定義指令，這些指令將被包含在輸出文件中。這對於為處理程式碼庫的 AI 系統提供上下文或特定指導非常有用。

## 使用方法

要包含自定義指令，請在倉庫根目錄創建一個 markdown 文件（例如 `repomix-instruction.md`）。然後，在 `repomix.config.json` 中指定該文件的路徑：

```json
{
  "output": {
    "instructionFilePath": "repomix-instruction.md"
  }
}
```

該文件的內容將在輸出中的「Instruction」部分中顯示。

## 示例

```markdown
# 倉庫指令

這個倉庫包含了 Repomix 工具的原始碼。在分析程式碼時請遵循以下指導原則：

1. 重點關注 `src/core` 目錄中的核心功能
2. 特別注意 `src/core/security` 中的安全檢查
3. 忽略 `tests` 目錄中的文件

## 程式碼規範
- 遵循 TypeScript 最佳實踐
- 確保所有公共 API 都有適當的文檔
- 使用依賴注入模式以便於測試

## 安全考慮
- 確保所有用戶輸入都經過適當驗證
- 避免在日誌中記錄敏感信息
- 使用安全的依賴版本
```

這將在輸出中生成以下部分：

```xml
<instruction>
# 倉庫指令

這個倉庫包含了 Repomix 工具的原始碼。在分析程式碼時請遵循以下指導原則：

1. 重點關注 `src/core` 目錄中的核心功能
2. 特別注意 `src/core/security` 中的安全檢查
3. 忽略 `tests` 目錄中的文件

## 程式碼規範
- 遵循 TypeScript 最佳實踐
- 確保所有公共 API 都有適當的文檔
- 使用依賴注入模式以便於測試

## 安全考慮
- 確保所有用戶輸入都經過適當驗證
- 避免在日誌中記錄敏感信息
- 使用安全的依賴版本
</instruction>
```

## 最佳實踐

1. **保持簡潔明確**：指令應該簡短但詳細
2. **提供具體示例**：在適當的情況下添加程式碼示例
3. **設置優先順序**：將最重要的指令放在前面
4. **包含上下文**：提供專案背景和重要考慮因素
5. **結構化內容**：使用標題和列表使指令易於閱讀

## 注意事項

- 避免在指令中包含敏感信息
- 定期更新指令以反映專案的變化
- 確保指令與專案的其他文檔保持一致
- 使用清晰的層次結構組織內容

## 相關資源

- [設定](/zh-tw/guide/configuration) - 在設定檔中設定 `output.instructionFilePath`
- [輸出格式](/zh-tw/guide/output) - 了解不同的輸出格式
- [提示範例](/zh-tw/guide/prompt-examples) - AI 分析的示例提示
- [使用案例](/zh-tw/guide/use-cases) - 使用 Repomix 搭配 AI 的實際案例
