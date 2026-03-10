# 参与 Repomix 开发

感谢你对 **Repomix** 的兴趣！🚀 我们非常欢迎你的帮助，让它变得更好。本指南将帮助你开始为项目做贡献。

## 如何贡献

- **为仓库加星**: 通过[为仓库加星](https://github.com/yamadashy/repomix)来表示你的支持！
- **创建问题**: 发现了bug？有新功能的想法？通过[创建问题](https://github.com/yamadashy/repomix/issues)让我们知道。
- **提交拉取请求**: 找到了可以修复或改进的地方？提交PR吧！
- **传播消息**: 在社交媒体、博客或技术社区中分享你使用Repomix的经验。
- **使用Repomix**: 最有价值的反馈来自实际使用，请随时将Repomix集成到你自己的项目中！
- **赞助**: 通过[成为赞助者](https://github.com/sponsors/yamadashy)来支持Repomix的开发。

## 快速开始

```bash
git clone https://github.com/yamadashy/repomix.git
cd repomix
npm install
```

## 开发命令

```bash
# 运行 CLI
npm run repomix

# 运行测试
npm run test
npm run test-coverage

# 代码检查
npm run lint
```

## 代码风格

- 使用 [Biome](https://biomejs.dev/) 进行代码检查和格式化
- 使用依赖注入以提高可测试性
- 保持文件不超过 250 行
- 为新功能添加测试用例

## Pull Request 提交指南

1. 运行所有测试
2. 通过代码检查
3. 更新文档
4. 遵循现有代码风格

## 开发环境搭建

### 前提条件

- Node.js ≥ 20.0.0
- Git
- npm
- Docker（可选，用于运行网站或容器化开发）

### 本地开发

要为Repomix设置本地开发环境：

```bash
# 克隆仓库
git clone https://github.com/yamadashy/repomix.git
cd repomix

# 安装依赖
npm install

# 运行CLI
npm run repomix
```

### Docker开发

你也可以使用Docker运行Repomix：

```bash
# 构建镜像
docker build -t repomix .

# 运行容器
docker run -v ./:/app -it --rm repomix
```

### 项目结构

项目组织为以下目录：

```
src/
├── cli/          # CLI实现
├── config/       # 配置处理
├── core/         # 核心功能
│   ├── file/     # 文件处理
│   ├── metrics/  # 指标计算
│   ├── output/   # 输出生成
│   ├── security/ # 安全检查
├── mcp/          # MCP服务器集成
└── shared/       # 共享工具
tests/            # 反映src/结构的测试
website/          # 文档网站
├── client/       # 前端（VitePress）
└── server/       # 后端API
```

## 网站开发

Repomix网站使用[VitePress](https://vitepress.dev/)构建。要在本地运行网站：

```bash
# 先决条件：系统上必须安装Docker

# 启动网站开发服务器
npm run website

# 在http://localhost:5173/访问网站
```

更新文档时，你只需先更新英文版本。维护者将处理其他语言的翻译。

## 发布流程

对于维护者和有兴趣的贡献者的发布流程：

1. 更新版本
```bash
npm version patch  # 或minor/major
```

2. 运行测试和构建
```bash
npm run test-coverage
npm run build
```

3. 发布
```bash
npm publish
```

新版本由维护者管理。如果你认为需要发布，请打开一个Issue进行讨论。

## 需要帮助？

- [提交 Issue](https://github.com/yamadashy/repomix/issues)
- [加入 Discord](https://discord.gg/wNYzTwZFku)
