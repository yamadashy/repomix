# 命令列選項

## 基本選項
- `-v, --version`: 顯示版本資訊並退出

## CLI 輸入/輸出選項

| 選項 | 說明 |
|------|------|
| `--verbose` | 啟用詳細除錯日誌（顯示檔案處理、權杖計數和配置詳細資訊） |
| `--quiet` | 抑制除錯誤外的所有控制台輸出（用於腳本編寫） |
| `--stdout` | 將打包輸出直接寫入標準輸出而不是檔案（抑制所有日誌記錄） |
| `--stdin` | 從標準輸入逐行讀取檔案路徑（指定的檔案直接處理） |
| `--copy` | 處理後將產生的輸出複製到系統剪貼簿 |
| `--token-count-tree [threshold]` | 顯示帶有權杖計數的檔案樹；可選閾值僅顯示 ≥N 權杖的檔案（例如：`--token-count-tree 100`） |
| `--top-files-len <number>` | 摘要中顯示的最大檔案數（預設：`5`） |

## Repomix 輸出選項

| 選項 | 說明 |
|------|------|
| `-o, --output <file>` | 輸出檔案路徑（預設：`repomix-output.xml`，標準輸出使用 `"-"`） |
| `--style <style>` | 輸出格式：`xml`、`markdown`、`json` 或 `plain`（預設：`xml`） |
| `--parsable-style` | 跳脫特殊字元以確保有效的 XML/Markdown（當輸出包含破壞格式的程式碼時需要） |
| `--compress` | 使用 Tree-sitter 解析提取基本程式碼結構（類別、函數、介面） |
| `--output-show-line-numbers` | 為輸出中的每行新增行號前綴 |
| `--no-file-summary` | 從輸出中省略檔案摘要部分 |
| `--no-directory-structure` | 從輸出中省略目錄樹視覺化 |
| `--no-files` | 僅產生中繼資料而不包含檔案內容（用於儲存庫分析） |
| `--remove-comments` | 打包前移除所有程式碼註釋 |
| `--remove-empty-lines` | 從所有檔案中移除空行 |
| `--truncate-base64` | 截斷長 base64 資料字串以減少輸出大小 |
| `--header-text <text>` | 在輸出開頭包含的自訂文字 |
| `--instruction-file-path <path>` | 包含要在輸出中包含的自訂指令的檔案路徑 |
| `--split-output <size>` | 將輸出拆分為多個編號檔案（例如 `repomix-output.1.xml`）；大小如 `500kb`、`2mb` 或 `1.5mb` |
| `--include-empty-directories` | 在目錄結構中包含沒有檔案的資料夾 |
| `--include-full-directory-structure` | 即使使用 `--include` 模式，也在目錄結構部分顯示完整的儲存庫樹 |
| `--no-git-sort-by-changes` | 不按 git 變更頻率排序檔案（預設：最常變更的檔案優先） |
| `--include-diffs` | 新增顯示工作樹和暫存變更的 git diff 部分 |
| `--include-logs` | 新增包含訊息和變更檔案的 git 提交歷史 |
| `--include-logs-count <count>` | 與 `--include-logs` 一起包含的最新提交數（預設：`50`） |

## 檔案選擇選項

| 選項 | 說明 |
|------|------|
| `--include <patterns>` | 僅包含與這些 glob 模式匹配的檔案（逗號分隔，例如：`"src/**/*.js,*.md"`） |
| `-i, --ignore <patterns>` | 要排除的附加模式（逗號分隔，例如：`"*.test.js,docs/**"`） |
| `--no-gitignore` | 不使用 `.gitignore` 規則過濾檔案 |
| `--no-dot-ignore` | 不使用 `.ignore` 規則過濾檔案 |
| `--no-default-patterns` | 不套用內建忽略模式（`node_modules`、`.git`、建置目錄等） |

## 遠端儲存庫選項

| 選項 | 說明 |
|------|------|
| `--remote <url>` | 複製並打包遠端儲存庫（GitHub URL 或 `user/repo` 格式） |
| `--remote-branch <name>` | 要使用的特定分支、標籤或提交（預設：儲存庫的預設分支） |
| `--remote-trust-config` | 信任並載入遠端儲存庫的設定檔（出於安全考量預設停用） |

## 組態選項

| 選項 | 說明 |
|------|------|
| `-c, --config <path>` | 使用自訂組態檔案而不是 `repomix.config.json` |
| `--init` | 使用預設設定建立新的 `repomix.config.json` 檔案 |
| `--global` | 與 `--init` 一起使用，在主目錄而不是當前目錄中建立組態 |

## 安全選項
- `--no-security-check`: 跳過敏感資料（如 API 金鑰和密碼）的掃描

## 權杖計數選項
- `--token-count-encoding <encoding>`: 計數用的分詞器模型：o200k_base（GPT-4o）、cl100k_base（GPT-3.5/4）等（預設：o200k_base）

## MCP 選項
- `--mcp`: 作為 Model Context Protocol 伺服器運行，用於 AI 工具整合

## Agent Skills 生成選項

| 選項 | 說明 |
|------|------|
| `--skill-generate [name]` | 產生 Claude Agent Skills 格式輸出到 `.claude/skills/<name>/` 目錄（省略名稱時自動產生） |
| `--skill-output <path>` | 直接指定技能輸出目錄路徑（跳過位置選擇提示） |
| `-f, --force` | 跳過所有確認提示（例如：技能目錄覆蓋） |

## 相關資源

- [設定](/zh-tw/guide/configuration) - 透過設定檔而非 CLI 旗標設定選項
- [輸出格式](/zh-tw/guide/output) - XML、Markdown、JSON 和純文字格式詳解
- [程式碼壓縮](/zh-tw/guide/code-compress) - `--compress` 與 Tree-sitter 的運作原理
- [安全](/zh-tw/guide/security) - `--no-security-check` 停用的功能

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

