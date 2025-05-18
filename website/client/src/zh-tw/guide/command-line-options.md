# 命令行選項

## 基本選項
- `-v, --version`: 顯示工具版本

## 輸出選項
- `-o, --output <file>`: 輸出檔案名稱（預設：`repomix-output.txt`）
- `--stdout`: 輸出到標準輸出而不是寫入檔案（不能與 `--output` 選項一起使用）
- `--style <type>`: 輸出樣式（`plain`、`xml`、`markdown`）（預設：`xml`）
- `--parsable-style`: 根據所選樣式結構啟用可解析輸出（預設：`false`）
- `--compress`: 執行智能程式碼提取，專注於基本函數和類別簽名，同時移除實現細節。有關更多詳細資訊和範例，請參閱[程式碼壓縮指南](code-compress)。
- `--output-show-line-numbers`: 添加行號（預設：`false`）
- `--copy`: 複製到剪貼簿（預設：`false`）
- `--no-file-summary`: 停用檔案摘要（預設：`true`）
- `--no-directory-structure`: 停用目錄結構（預設：`true`）
- `--no-files`: 停用檔案內容輸出（僅元數據模式）（預設：`true`）
- `--remove-comments`: 移除註解（預設：`false`）
- `--remove-empty-lines`: 移除空行（預設：`false`）
- `--header-text <text>`: 要包含在檔案標頭中的自定義文字
- `--instruction-file-path <path>`: 包含詳細自定義指令的檔案路徑
- `--include-empty-directories`: 在輸出中包含空目錄（預設：`false`）
- `--include-diffs`: 在輸出中包含 git 差異（分別包含工作樹和暫存的變更）（預設：`false`）
- `--no-git-sort-by-changes`: 停用按 git 變更計數排序檔案（預設：`true`）

## 過濾選項
- `--include <patterns>`: 包含模式（逗號分隔）
- `-i, --ignore <patterns>`: 忽略模式（逗號分隔）
- `--no-gitignore`: 停用 .gitignore 檔案使用
- `--no-default-patterns`: 停用預設模式

## 遠端儲存庫選項
- `--remote <url>`: 處理遠端儲存庫
- `--remote-branch <name>`: 指定遠端分支名稱、標籤或提交哈希（預設為儲存庫預設分支）

## 設定選項
- `-c, --config <path>`: 自定義設定檔路徑
- `--init`: 創建設定檔
- `--global`: 使用全局設定

## 安全選項
- `--no-security-check`: 停用安全檢查（預設：`true`）

## 令牌計數選項
- `--token-count-encoding <encoding>`: 指定令牌計數編碼（例如，`o200k_base`、`cl100k_base`）（預設：`o200k_base`）

## 其他選項
- `--top-files-len <number>`: 顯示的頂部檔案數量（預設：`5`）
- `--verbose`: 啟用詳細日誌記錄
- `--quiet`: 停用所有輸出到標準輸出

## 範例

```bash
# 基本使用
repomix

# 自定義輸出
repomix -o output.xml --style xml

# 輸出到標準輸出
repomix --stdout > custom-output.txt

# 將輸出發送到標準輸出，然後通過管道傳輸到另一個命令（例如，simonw/llm）
repomix --stdout | llm "請解釋這段程式碼的功能。"

# 使用壓縮的自定義輸出
repomix --compress

# 處理特定檔案
repomix --include "src/**/*.ts" --ignore "**/*.test.ts"

# 帶有分支的遠端儲存庫
repomix --remote https://github.com/user/repo/tree/main

# 使用簡寫的遠端儲存庫
repomix --remote user/repo
```
