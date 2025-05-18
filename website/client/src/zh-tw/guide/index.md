# Repomix 入門指南

Repomix 是一個將整個儲存庫打包成單一 AI 友好檔案的工具。它旨在幫助您將程式碼庫提供給大型語言模型 (LLM)，如 ChatGPT、DeepSeek、Perplexity、Gemini、Gemma、Llama、Grok 等。

## 快速開始

在您的專案目錄中運行此命令：

```bash
npx repomix
```

就是這樣！您將找到一個 `repomix-output.xml` 檔案，其中包含您整個儲存庫的 AI 友好格式。

然後，您可以將此檔案發送給 AI 助手，並附上如下提示：

```
此檔案包含儲存庫中所有檔案的合併版本。
我想重構程式碼，請先進行審查。
```

AI 將分析您的整個程式碼庫並提供全面的見解：

![Repomix 檔案使用 1](/images/docs/repomix-file-usage-1.png)

在討論特定更改時，AI 可以幫助生成程式碼。使用像 Claude 的 Artifacts 等功能，您甚至可以接收多個相互依賴的檔案：

![Repomix 檔案使用 2](/images/docs/repomix-file-usage-2.png)

祝您編程愉快！🚀

## 核心功能

- **AI 優化輸出**：以結構化部分和清晰組織格式化您的程式碼庫，便於 AI 處理
- **令牌計數**：使用可配置的分詞器（如 OpenAI 的 tiktoken）追蹤 LLM 上下文限制的令牌使用情況
- **Git 感知**：尊重您的 `.gitignore` 和 `.git/info/exclude` 檔案，防止包含不需要的檔案
- **安全性專注**：使用 Secretlint 檢測敏感資訊，防止意外洩露
- **多種輸出格式**：選擇 XML（最適合 AI）、Markdown（可讀性和結構的平衡）或純文字
- **程式碼壓縮**：智能提取關鍵程式碼結構，同時移除實現細節，減少令牌數量

## 下一步是什麼？

- [安裝指南](installation.md)：安裝 Repomix 的不同方式
- [使用指南](usage.md)：了解基本和進階功能
- [設定](configuration.md)：根據您的需求自定義 Repomix
- [安全功能](security.md)：了解安全檢查

## 社群

加入我們的 [Discord 社群](https://discord.gg/wNYzTwZFku)，用於：
- 獲取 Repomix 的幫助
- 分享您的經驗
- 建議新功能
- 與其他用戶連接

## 支援

發現錯誤或需要幫助？
- [在 GitHub 上開啟問題](https://github.com/yamadashy/repomix/issues)
- 加入我們的 Discord 伺服器
- 查看[文檔](https://repomix.com)
