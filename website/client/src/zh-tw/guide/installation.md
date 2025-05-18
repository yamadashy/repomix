# 安裝

## 使用 npx（無需安裝）

```bash
npx repomix
```

## 全局安裝

### npm
```bash
npm install -g repomix
```

### Yarn
```bash
yarn global add repomix
```

### Homebrew (macOS/Linux)
```bash
brew install repomix
```

## Docker 安裝

拉取並運行 Docker 映像以進行容器化執行，確保跨系統的一致環境：

```bash
# 當前目錄 - 將當前目錄掛載到容器中的 /app
docker run -v .:/app -it --rm ghcr.io/yamadashy/repomix

# 特定目錄 - 指定路徑僅處理該目錄
docker run -v .:/app -it --rm ghcr.io/yamadashy/repomix path/to/directory

# 自定義輸出檔案 - 指定輸出檔案名稱和位置
docker run -v .:/app -it --rm ghcr.io/yamadashy/repomix -o custom-output.xml

# 遠端儲存庫 - 將輸出存儲在 ./output 目錄中
docker run -v ./output:/app -it --rm ghcr.io/yamadashy/repomix --remote yamadashy/repomix
```

Docker 映像包含運行 Repomix 所需的所有依賴項。

## VSCode 擴展

使用社區維護的 [Repomix Runner](https://marketplace.visualstudio.com/items?itemName=DorianMassoulier.repomix-runner) 擴展（由 [massdo](https://github.com/massdo) 創建）直接在 VSCode 中運行 Repomix。

功能：
- 只需點擊幾下即可打包任何文件夾
- 控制輸出格式（XML、Markdown、純文字）
- 選擇文件或內容模式進行複製
- 自動清理輸出文件
- 與您現有的 repomix.config.json 無縫協作
- 通過 VSCode 的直觀界面管理輸出

從 [VSCode Marketplace](https://marketplace.visualstudio.com/items?itemName=DorianMassoulier.repomix-runner) 安裝，或在 [GitHub 上查看源代碼](https://github.com/massdo/repomix-runner)。

## 系統要求

- Node.js: ≥ 18.0.0
- Git: 遠端儲存庫處理所需

## 驗證

安裝後，驗證 Repomix 是否正常工作：

```bash
repomix --version
repomix --help
```
