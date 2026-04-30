# 參與 Repomix 開發

感謝您對 **Repomix** 的興趣！🚀 我們非常歡迎您的幫助，讓它變得更好。本指南將幫助您開始為專案做貢獻。

## 如何貢獻

- **為儲存庫加星**: 通過[為儲存庫加星](https://github.com/yamadashy/repomix)來表示您的支持！
- **建立問題**: 發現了bug？有新功能的想法？通過[建立問題](https://github.com/yamadashy/repomix/issues)讓我們知道。
- **提交拉取請求**: 找到了可以修復或改進的地方？提交PR吧！
- **傳播訊息**: 在社交媒體、部落格或技術社群中分享您使用Repomix的經驗。
- **使用Repomix**: 最有價值的反饋來自實際使用，請隨時將Repomix整合到您自己的專案中！
- **贊助**: 通過[成為贊助者](https://github.com/sponsors/yamadashy)來支持Repomix的開發。

## 快速開始

```bash
git clone https://github.com/yamadashy/repomix.git
cd repomix
npm install
```

## 開發命令

```bash
# 運行 CLI
npm run repomix

# 運行測試
npm run test
npm run test-coverage

# 程式碼檢查
npm run lint
```

## 程式碼風格

- 使用 [Biome](https://biomejs.dev/) 進行程式碼檢查和格式化
- 使用依賴注入以提高可測試性
- 保持文件不超過 250 行
- 為新功能添加測試用例

## Pull Request 提交指南

1. 運行所有測試
2. 通過程式碼檢查
3. 更新文檔
4. 遵循現有程式碼風格

## 開發環境設置

### 前提條件

- Node.js ≥ 20.0.0
- Git
- npm
- Docker（可選，用於運行網站或容器化開發）

### 本地開發

要為Repomix設置本地開發環境：

```bash
# 克隆儲存庫
git clone https://github.com/yamadashy/repomix.git
cd repomix

# 安裝依賴
npm install

# 運行CLI
npm run repomix
```

### Nix開發

如果您啟用了 [Nix](https://nixos.org/download) flakes，可以進入預裝了 Node.js 24 和 Git 的可重現開發 shell：

```bash
nix develop
```

在 shell 中，標準的 `npm` 工作流可以正常使用：

```bash
npm ci
npm run build
npm run test
npm run lint
```

注意：此 shell 用於開發 Repomix 本身，不是用於將其作為 CLI 安裝。

### Docker開發

您也可以使用Docker運行Repomix：

```bash
# 構建鏡像
docker build -t repomix .

# 運行容器
docker run -v ./:/app -it --rm repomix
```

### 項目結構

項目組織為以下目錄：

```
src/
├── cli/          # CLI實現
├── config/       # 配置處理
├── core/         # 核心功能
│   ├── file/     # 文件處理
│   ├── metrics/  # 指標計算
│   ├── output/   # 輸出生成
│   ├── security/ # 安全檢查
├── mcp/          # MCP服務器集成
└── shared/       # 共享工具
tests/            # 反映src/結構的測試
website/          # 文檔網站
├── client/       # 前端（VitePress）
└── server/       # 後端API
```

## 網站開發

Repomix網站使用[VitePress](https://vitepress.dev/)構建。要在本地運行網站：

```bash
# 先決條件：系統上必須安裝Docker

# 啟動網站開發服務器
npm run website

# 在http://localhost:5173/訪問網站
```

更新文檔時，您只需先更新英文版本。維護者將處理其他語言的翻譯。

## 發布流程

對於維護者和有興趣的貢獻者的發布流程：

1. 更新版本
```bash
npm version patch  # 或minor/major
```

2. 運行測試和構建
```bash
npm run test-coverage
npm run build
```

3. 發布
```bash
npm publish
```

新版本由維護者管理。如果您認為需要發布，請打開一個Issue進行討論。

## 需要幫助？

- [提交 Issue](https://github.com/yamadashy/repomix/issues)
- [加入 Discord](https://discord.gg/wNYzTwZFku)
