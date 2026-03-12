# 基本用法

## 快速開始

打包整個倉庫：
```bash
repomix
```

## 常見使用場景

### 打包指定目錄
```bash
repomix path/to/directory
```

### 包含特定文件
使用 [glob 模式](https://github.com/mrmlnc/fast-glob?tab=readme-ov-file#pattern-syntax)：
```bash
repomix --include "src/**/*.ts,**/*.md"
```

### 排除文件
```bash
repomix --ignore "**/*.log,tmp/"
```

### 將輸出拆分為多個檔案

處理大型程式碼庫時，打包的輸出可能會超過某些 AI 工具施加的檔案大小限制（例如 Google AI Studio 的 1MB 限制）。使用 `--split-output` 自動將輸出拆分為多個檔案：

```bash
repomix --split-output 1mb
```

這將生成編號檔案如：
- `repomix-output.1.xml`
- `repomix-output.2.xml`
- `repomix-output.3.xml`

大小可以用單位指定：`500kb`、`1mb`、`2mb`、`1.5mb` 等。支援小數值。

> [!NOTE]
> 檔案按頂級目錄分組以保持上下文。單個檔案或目錄永遠不會被拆分到多個輸出檔案中。

### 處理遠端倉庫
```bash
# 使用 GitHub URL
repomix --remote https://github.com/user/repo

# 使用簡寫形式
repomix --remote user/repo

# 指定分支/標籤/提交
repomix --remote user/repo --remote-branch main
repomix --remote user/repo --remote-branch 935b695
```

### 文件列表輸入（stdin）

通過 stdin 傳遞文件路徑以獲得終極靈活性：

```bash
# 使用 find 命令
find src -name "*.ts" -type f | repomix --stdin

# 使用 git 獲取追蹤的文件
git ls-files "*.ts" | repomix --stdin

# 使用 ripgrep (rg) 查找文件
rg --files --type ts | repomix --stdin

# 使用 grep 查找包含特定內容的文件
grep -l "TODO" **/*.ts | repomix --stdin

# 使用 ripgrep 查找包含特定內容的文件
rg -l "TODO|FIXME" --type ts | repomix --stdin

# 使用 sharkdp/fd 查找文件
fd -e ts | repomix --stdin

# 使用 fzf 從所有文件中選擇
fzf -m | repomix --stdin

# 使用 fzf 進行互動式文件選擇
find . -name "*.ts" -type f | fzf -m | repomix --stdin

# 使用 ls 和 glob 模式
ls src/**/*.ts | repomix --stdin

# 從包含文件路徑的文件中讀取
cat file-list.txt | repomix --stdin

# 使用 echo 直接輸入
echo -e "src/index.ts\nsrc/utils.ts" | repomix --stdin
```

`--stdin` 選項允許您向 Repomix 傳遞文件路徑列表，在選擇要打包的文件時提供終極靈活性。

使用 `--stdin` 時，指定的文件實際上被添加到包含模式中。這意味著正常的包含和忽略行為仍然適用 - 通過 stdin 指定的文件如果匹配忽略模式仍會被排除。

> [!NOTE]
> 使用 `--stdin` 時，文件路徑可以是相對路徑或絕對路徑，Repomix 會自動處理路徑解析和去重。

### 程式碼壓縮

```bash
repomix --compress

# 您也可以將其用於遠端倉庫：
repomix --remote yamadashy/repomix --compress
```

### Git整合

包含Git資訊以為AI分析提供開發脈絡：

```bash
# 包含git差異（未提交的變更）
repomix --include-diffs

# 包含git提交記錄（預設為最後50次提交）
repomix --include-logs

# 包含特定數量的提交
repomix --include-logs --include-logs-count 10

# 同時包含差異和記錄
repomix --include-diffs --include-logs
```

這會添加有價值的脈絡資訊：
- **最近的變更**：Git差異顯示未提交的修改
- **開發模式**：Git記錄揭示哪些檔案通常一起變更
- **提交歷史**：最近的提交訊息提供對開發重點的洞察
- **檔案關係**：了解哪些檔案在同一次提交中被修改

### 權杖數量最佳化

了解程式碼庫的權杖分布對於最佳化AI互動至關重要。使用 `--token-count-tree` 選項可視化整個專案的權杖使用情況：

```bash
repomix --token-count-tree
```

這將顯示帶有權杖計數的程式碼庫層次結構視圖：

```
🔢 Token Count Tree:
────────────────────
└── src/ (70,925 tokens)
    ├── cli/ (12,714 tokens)
    │   ├── actions/ (7,546 tokens)
    │   └── reporters/ (990 tokens)
    └── core/ (41,600 tokens)
        ├── file/ (10,098 tokens)
        └── output/ (5,808 tokens)
```

您還可以設定最小權杖閾值來關注較大的檔案：

```bash
repomix --token-count-tree 1000  # 僅顯示擁有1000+權杖的檔案/目錄
```

這有助於您：
- **識別重權杖檔案** - 可能超出AI上下文限制的檔案
- **最佳化檔案選擇** - 使用 `--include` 和 `--ignore` 模式
- **規劃壓縮策略** - 針對最大貢獻者的策略
- **平衡內容與上下文** - 為AI分析準備程式碼時的平衡

## 輸出格式

### XML（預設）
```bash
repomix --style xml
```

### Markdown
```bash
repomix --style markdown
```

### JSON
```bash
repomix --style json
```

### 純文字
```bash
repomix --style plain
```

## 其他選項

### 移除註釋
```bash
repomix --remove-comments
```

### 顯示行號
```bash
repomix --output-show-line-numbers
```

### 複製到剪貼簿
```bash
repomix --copy
```

### 禁用安全檢查
```bash
repomix --no-security-check
```

## 配置

初始化配置文件：
```bash
repomix --init
```

更多詳細配置選項請參閱[配置指南](/zh-tw/guide/configuration)。
