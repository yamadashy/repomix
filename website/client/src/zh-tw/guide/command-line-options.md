# 命令列選項

## 基本選項
- `-v, --version`: 顯示工具版本

## CLI輸入/輸出選項
- `--verbose`: 啟用詳細日誌記錄
- `--quiet`: 停用所有輸出到標準輸出
- `--stdout`: 輸出到標準輸出而不是寫入檔案（不能與`--output`選項同時使用）
- `--stdin`: 從標準輸入讀取檔案路徑，而不是自動發現檔案
- `--copy`: 另外將產生的輸出複製到系統剪貼簿
- `--token-count-tree [threshold]`: 顯示帶有權杖計數摘要的檔案樹（可選：最小權杖計數閾值）。對於識別大檔案和最佳化AI上下文限制的權杖使用很有用
- `--top-files-len <number>`: 摘要中顯示的頂級檔案數

## Repomix輸出選項
- `-o, --output <file>`: 指定輸出檔案名
- `--style <style>`: 指定輸出樣式（`xml`、`markdown`、`plain`）
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
- `--include-empty-directories`: 在輸出中包含空目錄
- `--include-diffs`: 在輸出中包含git差異（分別包含工作樹和暫存的變更）
- `--include-logs`: 在輸出中包含git記錄（包含提交歷史，包括日期、訊息和檔案路徑）
- `--include-logs-count <count>`: 要包含的git記錄提交數量（預設：50）
- `--no-git-sort-by-changes`: 停用按git變更次數排序檔案（預設啟用）

## 檔案選擇選項
- `--include <patterns>`: 包含模式清單（逗號分隔）
- `-i, --ignore <patterns>`: 附加忽略模式（逗號分隔）
- `--ignore-content <patterns>`: Skip file content for matched patterns (comma-separated; prefix with `!` to keep specific paths)
- `--no-gitignore`: 停用.gitignore檔案使用
- `--no-default-patterns`: 停用預設模式

## 遠端儲存庫選項
- `--remote <url>`: 處理遠端儲存庫
- `--remote-branch <name>`: 指定遠端分支名稱、標籤或提交雜湊（預設為儲存庫預設分支）

## 組態選項
- `-c, --config <path>`: 自訂組態檔案路徑
- `--init`: 建立組態檔案
- `--global`: 使用全域組態

## 安全選項
- `--no-security-check`: 停用安全檢查（預設：`true`）

## 權杖計數選項
- `--token-count-encoding <encoding>`: 指定OpenAI的[tiktoken](https://github.com/openai/tiktoken)分詞器使用的權杖計數編碼（例如，GPT-4o使用`o200k_base`，GPT-4/3.5使用`cl100k_base`）。有關編碼詳細資訊，請參閱[tiktoken model.py](https://github.com/openai/tiktoken/blob/main/tiktoken/model.py#L24)。


## 範例

```bash
# 基本使用
repomix

# 自訂輸出
repomix -o output.xml --style xml

# 輸出到標準輸出
repomix --stdout > custom-output.txt

# 輸出到標準輸出，然後管道到另一個命令（例如，simonw/llm）
repomix --stdout | llm "請解釋這段程式碼的作用。"

# 使用壓縮的自訂輸出
repomix --compress

# 處理特定檔案
repomix --include "src/**/*.ts" --ignore "**/*.test.ts"

# Ignore file contents for matching patterns
repomix --ignore-content "components/**,!components/slider/**"

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

