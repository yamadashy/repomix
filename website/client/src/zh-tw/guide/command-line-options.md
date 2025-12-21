# 命令列選項

## 基本選項
- `-v, --version`: 顯示版本資訊並退出

## CLI輸入/輸出選項
- `--verbose`: 啟用詳細除錯日誌（顯示檔案處理、權杖計數和配置詳細資訊）
- `--quiet`: 抑制除錯誤外的所有控制台輸出（用於腳本編寫）
- `--stdout`: 將打包輸出直接寫入標準輸出而不是檔案（抑制所有日誌記錄）
- `--stdin`: 從標準輸入逐行讀取檔案路徑（指定的檔案直接處理）
- `--copy`: 處理後將產生的輸出複製到系統剪貼簿
- `--token-count-tree [threshold]`: 顯示帶有權杖計數的檔案樹；可選閾值僅顯示≥N權杖的檔案（例如：--token-count-tree 100）
- `--top-files-len <number>`: 摘要中顯示的最大檔案數（預設：5，例如：--top-files-len 20）

## Repomix輸出選項
- `-o, --output <file>`: 輸出檔案路徑（預設：repomix-output.xml，標準輸出使用 "-"）
- `--style <type>`: 輸出格式：xml、markdown、json 或 plain（預設：xml）
- `--parsable-style`: 基於所選樣式架構啟用可解析輸出。注意這可能會增加權杖數。
- `--compress`: 執行智慧程式碼提取，專注於基本函數和類別簽名以減少權杖數
- `--output-show-line-numbers`: 在輸出中顯示行號
- `--no-file-summary`: 停用檔案摘要部分輸出
- `--no-directory-structure`: 停用目錄結構部分輸出
- `--no-files`: 停用檔案內容輸出（僅中繼資料模式）
- `--remove-comments`: 從支援的檔案類型中移除註釋
- `--remove-empty-lines`: 從輸出中移除空行
- `--truncate-base64`: 啟用base64資料字串截斷
- `--header-text <text>`: 要包含在檔案標頭中的自訂文字
- `--instruction-file-path <path>`: 包含詳細自訂指令的檔案路徑
- `--split-output <size>`: 將輸出拆分為多個編號檔案（例如 repomix-output.1.xml, repomix-output.2.xml）；例如 500kb、2mb 或 1.5mb
- `--include-empty-directories`: 在輸出中包含空目錄
- `--include-full-directory-structure`: 即使使用 --include 模式，也在目錄結構部分顯示完整的儲存庫樹
- `--include-diffs`: 在輸出中包含git差異（分別包含工作樹和暫存的變更）
- `--include-logs`: 在輸出中包含git記錄（包含提交歷史，包括日期、訊息和檔案路徑）
- `--include-logs-count <count>`: 要包含的git記錄提交數量（預設：50）
- `--no-git-sort-by-changes`: 停用按git變更次數排序檔案（預設啟用）

## 檔案選擇選項
- `--include <patterns>`: 包含模式清單（逗號分隔）
- `-i, --ignore <patterns>`: 附加忽略模式（逗號分隔）
- `--no-gitignore`: 停用.gitignore檔案使用
- `--no-dot-ignore`: 停用.ignore檔案使用
- `--no-default-patterns`: 停用預設模式

## 遠端儲存庫選項
- `--remote <url>`: 處理遠端儲存庫
- `--remote-branch <name>`: 指定遠端分支名稱、標籤或提交雜湊（預設為儲存庫預設分支）

## 組態選項
- `-c, --config <path>`: 自訂組態檔案路徑
- `--init`: 建立組態檔案
- `--global`: 使用全域組態

## 安全選項
- `--no-security-check`: 跳過敏感資料（如 API 金鑰和密碼）的掃描

## 權杖計數選項
- `--token-count-encoding <encoding>`: 計數用的分詞器模型：o200k_base（GPT-4o）、cl100k_base（GPT-3.5/4）等（預設：o200k_base）

## MCP 選項
- `--mcp`: 作為 Model Context Protocol 伺服器運行，用於 AI 工具整合

## 範例

```bash
# 基本使用
repomix

# 自訂輸出檔案和格式
repomix -o my-output.xml --style xml

# 輸出到標準輸出
repomix --stdout > custom-output.txt

# 輸出到標準輸出，然後管道到另一個命令（例如，simonw/llm）
repomix --stdout | llm "請解釋這段程式碼的作用。"

# 使用壓縮的自訂輸出
repomix --compress

# 使用模式處理特定檔案
repomix --include "src/**/*.ts,*.md" --ignore "*.test.js,docs/**"

# 帶分支的遠端儲存庫
repomix --remote https://github.com/user/repo/tree/main

# 帶提交的遠端儲存庫
repomix --remote https://github.com/user/repo/commit/836abcd7335137228ad77feb28655d85712680f1

# 使用簡寫的遠端儲存庫
repomix --remote user/repo

# 使用stdin的檔案清單
find src -name "*.ts" -type f | repomix --stdin
git ls-files "*.js" | repomix --stdin
echo -e "src/index.ts\nsrc/utils.ts" | repomix --stdin

# Git整合
repomix --include-diffs  # 包含git差異用於未提交的變更
repomix --include-logs   # 包含git記錄（預設為最後50次提交）
repomix --include-logs --include-logs-count 10  # 包含最後10次提交
repomix --include-diffs --include-logs  # 同時包含差異和記錄

# 權杖計數分析
repomix --token-count-tree
repomix --token-count-tree 1000  # 僅顯示擁有1000+權杖的檔案/目錄
```

