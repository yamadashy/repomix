# Agent Skills 生成

Repomix 可以生成 [Claude Agent Skills](https://docs.anthropic.com/en/docs/claude-code/skills) 格式的輸出，建立一個結構化的 Skills 目錄，可作為 AI 助手的可重複使用程式碼庫參考。

當您想要參考遠端儲存庫的實作時，此功能特別強大。透過從開源專案生成 Skills，您可以輕鬆讓 Claude 在您編寫程式碼時參考特定的模式或實作。

Skills 生成不是生成單一打包檔案，而是建立一個包含多個參考檔案的結構化目錄，這些檔案針對 AI 理解和 grep 友善搜尋進行了最佳化。

> [!NOTE]
> 這是一個實驗性功能。輸出格式和選項可能會根據使用者回饋在未來版本中發生變化。

## 基本用法

從本地目錄生成 Skills：

```bash
# 從當前目錄生成 Skills
repomix --skill-generate

# 使用自訂 Skills 名稱生成
repomix --skill-generate my-project-reference

# 從特定目錄生成
repomix path/to/directory --skill-generate

# 從遠端儲存庫生成
repomix --remote https://github.com/user/repo --skill-generate
```

## Skills 儲存位置選擇

執行命令時，Repomix 會提示您選擇 Skills 的儲存位置：

1. **Personal Skills** (`~/.claude/skills/`) - 在您機器上的所有專案中可用
2. **Project Skills** (`.claude/skills/`) - 透過 git 與團隊共享

如果 Skills 目錄已存在，系統會提示您確認是否覆蓋。

> [!TIP]
> 生成 Project Skills 時，建議將其新增到 `.gitignore` 以避免提交大型檔案：
> ```gitignore
> .claude/skills/repomix-reference-*/
> ```

## 生成的結構

Skills 按以下結構生成：

```text
.claude/skills/<skill-name>/
├── SKILL.md                    # Skills 主要中繼資料和文件
└── references/
    ├── summary.md              # 目的、格式和統計資訊
    ├── project-structure.md    # 帶行數的目錄樹
    ├── files.md                # 所有檔案內容（grep 友善）
    └── tech-stack.md           # 語言、框架、相依性
```

### 檔案說明

#### SKILL.md

主要 Skills 檔案包含：
- Skills 名稱、描述和專案資訊
- 檔案數、行數和 token 數
- Skills 使用方法概述
- 檔案位置和格式說明
- 常見用例和提示

#### references/summary.md

包含：
- **目的**：說明這是供 AI 使用的參考程式碼庫
- **檔案結構**：記錄每個參考檔案的內容
- **使用指南**：如何有效使用 Skills
- **統計資訊**：按檔案類型、語言和最大檔案的分類

#### references/project-structure.md

帶有每個檔案行數的目錄樹，便於檔案發現：

```text
src/
  index.ts (42 lines)
  utils/
    helpers.ts (128 lines)
    math.ts (87 lines)
```

#### references/files.md

所有帶語法高亮標頭的檔案內容，針對 grep 友善搜尋最佳化：

````markdown
## File: src/index.ts
```typescript
import { sum } from './utils/helpers';

export function main() {
  console.log(sum(1, 2));
}
```
````

#### references/tech-stack.md

從相依性檔案自動偵測的技術堆疊：
- **語言**：TypeScript、JavaScript、Python 等
- **框架**：React、Next.js、Express、Django 等
- **執行環境版本**：Node.js、Python、Go 等
- **套件管理器**：npm、pnpm、poetry 等
- **相依性**：所有直接相依和開發相依
- **設定檔**：所有偵測到的設定檔

偵測來源檔案：`package.json`、`requirements.txt`、`Cargo.toml`、`go.mod`、`.nvmrc`、`pyproject.toml` 等。

## 自動生成的 Skills 名稱

如果未提供名稱，Repomix 會使用以下模式自動生成：

```bash
repomix src/ --skill-generate                # → repomix-reference-src
repomix --remote user/repo --skill-generate  # → repomix-reference-repo
repomix --skill-generate CustomName          # → custom-name（規範化為 kebab-case）
```

Skills 名稱會：
- 轉換為 kebab-case（小寫，連字號分隔）
- 限制最多 64 個字元
- 防止路徑遍歷攻擊

## 與 Repomix 選項整合

Skills 生成支援所有標準 Repomix 選項：

```bash
# 使用檔案過濾生成 Skills
repomix --skill-generate --include "src/**/*.ts" --ignore "**/*.test.ts"

# 使用壓縮生成 Skills
repomix --skill-generate --compress

# 從遠端儲存庫生成 Skills
repomix --remote yamadashy/repomix --skill-generate

# 使用特定輸出格式選項生成 Skills
repomix --skill-generate --remove-comments --remove-empty-lines
```

### 僅文件 Skills

使用 `--include`，您可以生成僅包含 GitHub 儲存庫文件的 Skills。當您希望 Claude 在編寫程式碼時參考特定函式庫或框架的文件時，這很有用：

```bash
# Claude Code Action 文件
repomix --remote https://github.com/anthropics/claude-code-action --include docs --skill-generate

# Vite 文件
repomix --remote https://github.com/vitejs/vite --include docs --skill-generate

# React 文件
repomix --remote https://github.com/reactjs/react.dev --include src/content --skill-generate
```

## 限制

`--skill-generate` 選項不能與以下選項一起使用：
- `--stdout` - Skills 輸出需要寫入檔案系統
- `--copy` - Skills 輸出是目錄，無法複製到剪貼簿

## 使用生成的 Skills

生成後，您可以在 Claude 中使用這些 Skills：

1. **Claude Code**：如果儲存到 `~/.claude/skills/` 或 `.claude/skills/`，Skills 會自動可用
2. **Claude Web**：將 Skills 目錄上傳到 Claude 進行程式碼庫分析
3. **團隊共享**：將 `.claude/skills/` 提交到儲存庫供團隊使用

## 範例工作流程

### 建立個人參考庫

```bash
# 複製並分析一個有趣的開源專案
repomix --remote facebook/react --skill-generate react-reference

# Skills 儲存到 ~/.claude/skills/react-reference/
# 現在您可以在任何 Claude 對話中參考 React 的程式碼庫
```

### 團隊專案文件

```bash
# 在您的專案目錄中
cd my-project

# 為團隊生成 Skills
repomix --skill-generate

# 提示時選擇 "Project Skills"
# Skills 儲存到 .claude/skills/repomix-reference-my-project/

# 提交並與團隊共享
git add .claude/skills/
git commit -m "Add codebase reference Skills"
```

## 相關資源

- [Claude Code 外掛](/zh-tw/guide/claude-code-plugins) - 了解 Claude Code 的 Repomix 外掛
- [MCP 伺服器](/zh-tw/guide/mcp-server) - 替代整合方法
- [程式碼壓縮](/zh-tw/guide/code-compress) - 透過壓縮減少 token 數
- [設定](/zh-tw/guide/configuration) - 自訂 Repomix 行為
