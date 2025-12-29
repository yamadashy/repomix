# 安裝

## 使用 npx（無需安裝）

```bash
npx repomix@latest
```

## 全局安裝

::: code-group
```bash [npm]
npm install -g repomix
```
```bash [yarn]
yarn global add repomix
```
```bash [pnpm]
pnpm add -g repomix
```
```bash [bun]
bun add -g repomix
```
```bash [Homebrew]
brew install repomix
```
:::

## Docker 安裝

使用 Docker 是最便捷的方式之一，可以避免環境配置問題。以下是具體步驟：

```bash
# 處理當前目錄
docker run -v .:/app -it --rm ghcr.io/yamadashy/repomix

# 處理指定目錄
docker run -v .:/app -it --rm ghcr.io/yamadashy/repomix path/to/directory

# 處理遠端倉庫
docker run -v ./output:/app -it --rm ghcr.io/yamadashy/repomix --remote yamadashy/repomix
```

## VSCode 擴展

通過社區維護的 [Repomix Runner](https://marketplace.visualstudio.com/items?itemName=DorianMassoulier.repomix-runner) 擴展，您可以直接在 VSCode 中執行 Repomix。

功能：
- 只需點擊幾下即可打包任何資料夾
- 可選擇文件或內容模式進行複製
- 自動清理輸出文件
- 支援 repomix.config.json

從 [VSCode 應用商店](https://marketplace.visualstudio.com/items?itemName=DorianMassoulier.repomix-runner)安裝。

## 瀏覽器擴充功能

直接從任何 GitHub 倉庫存取 Repomix！我們的 Chrome 擴充功能在 GitHub 倉庫頁面新增了便捷的「Repomix」按鈕。

![Repomix Browser Extension](/images/docs/browser-extension.png)

### 安裝
- Chrome 擴充功能: [Repomix - Chrome Web Store](https://chromewebstore.google.com/detail/repomix/fimfamikepjgchehkohedilpdigcpkoa)
- Firefox 附加元件: [Repomix - Firefox Add-ons](https://addons.mozilla.org/firefox/addon/repomix/)

### 功能
- 一鍵從 GitHub 倉庫存取 Repomix
- 更多精彩功能即將推出！

## 系統要求

- Node.js: ≥ 20.0.0
- Git: 處理遠端倉庫時需要

## 驗證安裝

安裝完成後，可以通過以下命令驗證 Repomix 是否正常工作：

```bash
repomix --version
repomix --help
```
