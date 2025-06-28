# 命令行選項

## 基本選項
- `-v, --version`: 顯示版本

## 輸出選項
- `-o, --output <file>`: 輸出文件名（預設：`repomix-output.txt`）
- `--stdout`: 輸出到標準輸出而不是寫入文件（不能與`--output`選項一起使用）
- `--style <type>`: 輸出樣式（`plain`、`xml`、`markdown`）（預設：`xml`）
- `--parsable-style`: 啟用基於所選樣式模式的可解析輸出（預設：`false`）
- `--compress`: 執行智慧程式碼提取，專注於函數和類的簽名，同時刪除實現細節。有關詳細資訊和示例，請參閱[程式碼壓縮指南](code-compress)。
- `--output-show-line-numbers`: 添加行號（預設：`false`）
- `--copy`: 複製到剪貼簿（預設：`false`）
- `--no-file-summary`: 禁用文件摘要（預設：`true`）
- `--no-directory-structure`: 禁用目錄結構（預設：`true`）
- `--no-files`: 禁用文件內容輸出（僅元數據模式）（預設：`true`）
- `--remove-comments`: 移除註釋（預設：`false`）
- `--remove-empty-lines`: 移除空行（預設：`false`）
- `--header-text <text>`: 文件頭部包含的自定義文本
- `--instruction-file-path <path>`: 包含詳細自定義指令的文件路徑
- `--include-empty-directories`: 在輸出中包含空目錄（預設：`false`）
- `--include-diffs`: 在輸出中包含 git 差異（包括工作樹和已暫存的變更，它們將分開顯示）（預設：`false`）
- `--no-git-sort-by-changes`: 禁用按 git 變更計數排序文件（預設：`true`）

## 過濾選項
- `--include <patterns>`: 包含模式（逗號分隔）
- `-i, --ignore <patterns>`: 忽略模式（逗號分隔）
- `--no-gitignore`: 禁用 .gitignore 文件
- `--no-default-patterns`: 禁用預設模式

## 遠端倉庫選項
- `--remote <url>`: 處理遠端倉庫
- `--remote-branch <n>`: 指定遠端分支名稱、標籤或提交哈希（預設為倉庫的預設分支）

## 配置選項
- `-c, --config <path>`: 自定義配置文件路徑
- `--init`: 創建配置文件
- `--global`: 使用全局配置

## 安全選項
- `--no-security-check`: 禁用安全檢查（預設：`true`）

## 令牌計數選項
- `--token-count-encoding <encoding>`: 指定令牌計數編碼（如 `o200k_base`、`cl100k_base`）（預設：`o200k_base`）

## 其他選項
- `--top-files-len <number>`: 顯示的頂部文件數量（預設：`5`）
- `--verbose`: 啟用詳細日誌
- `--quiet`: 禁止所有標準輸出

## 示例

```bash
# 基本用法
repomix

# 自定義輸出
repomix -o output.xml --style xml

# 輸出到標準輸出
repomix --stdout > custom-output.txt

# 將輸出發送到標準輸出，然後通過管道傳遞到另一個命令（例如：simonw/llm）
repomix --stdout | llm "請解釋這段程式碼的功能"

# 使用壓縮的自定義輸出
repomix --compress

# 處理特定文件
repomix --include "src/**/*.ts" --ignore "**/*.test.ts"

# 帶分支的遠端倉庫
repomix --remote https://github.com/user/repo/tree/main

# 帶提交的遠端倉庫
repomix --remote https://github.com/user/repo/commit/836abcd7335137228ad77feb28655d85712680f1

# 使用簡寫的遠端倉庫
repomix --remote user/repo

# 從 stdin 獲取文件列表（自動檢測）
find src -name "*.ts" -type f | repomix
git ls-files "*.js" | repomix
echo -e "src/index.ts\nsrc/utils.ts" | repomix
```
