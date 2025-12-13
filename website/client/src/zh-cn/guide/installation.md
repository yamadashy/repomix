# 安装

## 使用 npx（无需安装）

```bash
npx repomix@latest
```

## 全局安装

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

## Docker 安装

使用 Docker 是最便捷的方式之一，可以避免环境配置问题。以下是具体步骤：

```bash
# 处理当前目录
docker run -v .:/app -it --rm ghcr.io/yamadashy/repomix

# 处理指定目录
docker run -v .:/app -it --rm ghcr.io/yamadashy/repomix path/to/directory

# 处理远程仓库
docker run -v ./output:/app -it --rm ghcr.io/yamadashy/repomix --remote yamadashy/repomix
```

## VSCode 扩展

通过社区维护的 [Repomix Runner](https://marketplace.visualstudio.com/items?itemName=DorianMassoulier.repomix-runner) 扩展，您可以直接在 VSCode 中运行 Repomix。

功能：
- 只需点击几下即可打包任何文件夹
- 可选择文件或内容模式进行复制
- 自动清理输出文件
- 支持 repomix.config.json

从 [VSCode 应用商店](https://marketplace.visualstudio.com/items?itemName=DorianMassoulier.repomix-runner)安装。

## 浏览器扩展

直接从任何 GitHub 仓库访问 Repomix！我们的 Chrome 扩展在 GitHub 仓库页面添加了便捷的"Repomix"按钮。

![Repomix Browser Extension](/images/docs/browser-extension.png)

### 安装
- Chrome 扩展: [Repomix - Chrome Web Store](https://chromewebstore.google.com/detail/repomix/fimfamikepjgchehkohedilpdigcpkoa)
- Firefox 插件: [Repomix - Firefox Add-ons](https://addons.mozilla.org/firefox/addon/repomix/)

### 功能
- 一键从 GitHub 仓库访问 Repomix
- 更多精彩功能即将推出！

## 系统要求

- Node.js: ≥ 20.0.0
- Git: 处理远程仓库时需要

## 验证安装

安装完成后，可以通过以下命令验证 Repomix 是否正常工作：

```bash
repomix --version
repomix --help
```
