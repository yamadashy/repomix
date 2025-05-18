# 基本使用方法

## 快速開始

打包整個儲存庫：
```bash
repomix
```

## 常見使用案例

### 打包特定目錄
處理特定目錄或檔案以專注於相關程式碼並減少令牌數量：
```bash
repomix path/to/directory
```

### 包含特定檔案
使用 [glob 模式](https://github.com/mrmlnc/fast-glob?tab=readme-ov-file#pattern-syntax) 精確控制包含哪些檔案：
```bash
repomix --include "src/**/*.ts,**/*.md"
```

### 排除檔案
使用 glob 模式跳過某些檔案或目錄，避免包含不必要或敏感內容：
```bash
repomix --ignore "**/*.log,tmp/"
```

### 遠端儲存庫
```bash
# 使用 GitHub URL
repomix --remote https://github.com/user/repo

# 使用簡寫
repomix --remote user/repo

# 特定分支/標籤/提交
repomix --remote user/repo --remote-branch main
repomix --remote user/repo --remote-branch 935b695
```


### 程式碼壓縮

使用 Tree-sitter 智能提取關鍵程式碼結構，同時移除實現細節，在保留架構的同時顯著減少令牌數量：

```bash
repomix --compress

# 也可以與遠端儲存庫一起使用：
repomix --remote yamadashy/repomix --compress
```

## 輸出格式

### XML（預設）
```bash
repomix --style xml
```

### Markdown
```bash
repomix --style markdown
```

### 純文字
```bash
repomix --style plain
```

## 其他選項

### 移除註解
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

### 停用安全檢查
```bash
repomix --no-security-check
```

## 設定

初始化設定檔：
```bash
repomix --init
```

詳細選項請參閱[設定指南](/zh-tw/guide/configuration)。
