# 遠端儲存庫處理

Repomix 支援處理遠端 Git 儲存庫，無需手動克隆。此功能允許您使用單一命令快速分析任何公共 Git 儲存庫，簡化程式碼分析的工作流程。

## 基本使用

處理公共儲存庫：
```bash
# 使用完整 URL
repomix --remote https://github.com/user/repo

# 使用 GitHub 簡寫
repomix --remote user/repo
```

## 分支和提交選擇

您可以指定分支名稱、標籤或提交哈希：

```bash
# 使用 --remote-branch 選項指定特定分支
repomix --remote user/repo --remote-branch main

# 直接使用分支的 URL
repomix --remote https://github.com/user/repo/tree/main

# 標籤
repomix --remote user/repo --remote-branch v1.0.0

# 使用 --remote-branch 選項指定特定提交哈希
repomix --remote user/repo --remote-branch 935b695
```

## 要求

- 必須安裝 Git
- 網路連接
- 對儲存庫的讀取權限

## 輸出控制

```bash
# 自定義輸出位置
repomix --remote user/repo -o custom-output.xml

# 使用 XML 格式
repomix --remote user/repo --style xml

# 移除註解
repomix --remote user/repo --remove-comments
```

## Docker 使用

```bash
# 處理並輸出到當前目錄
docker run -v .:/app -it --rm ghcr.io/yamadashy/repomix \
  --remote user/repo

# 輸出到特定目錄
docker run -v ./output:/app -it --rm ghcr.io/yamadashy/repomix \
  --remote user/repo
```

## 常見問題

### 訪問問題
- 確保儲存庫是公開的
- 檢查 Git 安裝
- 驗證網路連接

### 大型儲存庫
- 使用 `--include` 選擇特定路徑
- 啟用 `--remove-comments`
- 分別處理分支
