# Repomix 入門指南

<script setup>
import HomeBadges from '../../../components/HomeBadges.vue'
import YouTubeVideo from '../../../components/YouTubeVideo.vue'
import { VIDEO_IDS } from '../../../utils/videos'
</script>

Repomix 是一個將程式碼庫打包成單個 AI 友好文件的工具。它專為幫助你將程式碼提供給大型語言模型（如 ChatGPT、Claude、Gemini、Grok、DeepSeek、Perplexity、Gemma、Llama 等）而設計。

<YouTubeVideo :videoId="VIDEO_IDS.REPOMIX_DEMO" />

<HomeBadges />

<br>
<!--@include: ../../shared/sponsors-section.md-->

## 快速開始

在你的專案目錄中執行以下命令：

```bash
npx repomix@latest
```

就這麼簡單！你會在當前目錄中找到一個 `repomix-output.xml` 文件，其中包含了以 AI 友好格式整理的整個程式碼庫。

然後，你可以將此文件傳送給 AI 助手，並附上類似這樣的提示：

```
這個文件包含了倉庫中所有文件的合併內容。
我想重構程式碼，請先幫我審查一下。
```

AI 將分析你的整個程式碼庫並提供全面的見解：

![Repomix 使用示例1](/images/docs/repomix-file-usage-1.png)

在討論具體修改時，AI 可以幫助生成程式碼。透過像 Claude 的 Artifacts 這樣的功能，你甚至可以一次性接收多個相互依賴的文件：

![Repomix 使用示例2](/images/docs/repomix-file-usage-2.png)

祝你編碼愉快！🚀

## 為什麼選擇 Repomix？

Repomix的強項在於可以與ChatGPT、Claude、Gemini、Grok等訂閱服務配合使用而無需擔心成本，同時提供完整的程式碼庫上下文，消除了檔案探索的需要——使分析更快速，往往也更準確。

透過將整個程式碼庫作為上下文，Repomix支援廣泛的應用場景，包括實作規劃、錯誤調查、第三方函式庫安全檢查、文件生成等等。

## 核心功能

- **AI 優化**：以 AI 易於理解的格式整理程式碼庫
- **令牌計數**：為 LLM 上下文限制提供令牌使用統計
- **Git 感知**：自動識別並遵循 `.gitignore` 和 `.git/info/exclude` 文件
- **注重安全**：使用 Secretlint 進行敏感資訊偵測
- **多種輸出格式**：可選純文字、XML 或 Markdown 格式

## 下一步

- [安裝指南](installation.md)：了解安裝 Repomix 的不同方式
- [使用指南](usage.md)：學習基本和進階功能
- [配置](configuration.md)：根據需求自定義 Repomix
- [安全功能](security.md)：了解安全檢查詳情
- [輸出格式](output.md)：為 AI 模型選擇最合適的輸出格式
- [MCP 伺服器](mcp-server.md)：將 Repomix 與 AI 助手直接整合

## 社區

加入我們的 [Discord 社區](https://discord.gg/wNYzTwZFku)：
- 獲取 Repomix 使用幫助
- 分享你的使用經驗
- 提出新功能建議
- 與其他用戶交流

## 支援

發現問題或需要幫助？
- [在 GitHub 上提交問題](https://github.com/yamadashy/repomix/issues)
- 加入 Discord 伺服器
- 查看[文檔](https://repomix.com)
