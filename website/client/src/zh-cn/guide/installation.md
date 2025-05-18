# 安装

## 使用 npx（无需安装）

```bash
npx repomix
```

## 全局安装

### npm 安装
```bash
npm install -g repomix
```

### Yarn 安装
```bash
yarn global add repomix
```

### Homebrew 安装（macOS/Linux）
```bash
brew install repomix
```

## Docker 安装

使用 Docker 是最便捷的方式之一，可以提供容器化的执行环境，确保一致的环境配置，避免环境配置问题：

```bash
# 处理当前目录 - 将当前目录挂载到容器内的/app
docker run -v .:/app -it --rm ghcr.io/yamadashy/repomix

# 处理指定目录 - 指定仅处理特定路径
docker run -v .:/app -it --rm ghcr.io/yamadashy/repomix path/to/directory

# 自定义输出文件 - 指定输出文件名和位置
docker run -v .:/app -it --rm ghcr.io/yamadashy/repomix -o custom-output.xml

# 处理远程仓库 - 将输出保存到./output目录
docker run -v ./output:/app -it --rm ghcr.io/yamadashy/repomix --remote yamadashy/repomix
```

Docker 镜像包含运行 Repomix 所需的所有依赖项。

## VSCode 扩展

通过社区维护的 [Repomix Runner](https://marketplace.visualstudio.com/items?itemName=DorianMassoulier.repomix-runner) 扩展（由 [massdo](https://github.com/massdo) 创建），您可以直接在 VSCode 中运行 Repomix。

功能：
- 只需点击几下即可打包任何文件夹
- 控制输出格式（XML、Markdown、纯文本）
- 可选择文件或内容模式进行复制
- 自动清理输出文件
- 与现有的 repomix.config.json 无缝集成
- 通过 VSCode 的直观界面管理输出

从 [VSCode 应用商店](https://marketplace.visualstudio.com/items?itemName=DorianMassoulier.repomix-runner)安装，或在 [GitHub 上查看源代码](https://github.com/massdo/repomix-runner)。

## 系统要求

- Node.js: ≥ 18.0.0
- Git: 处理远程仓库时需要

## 验证安装

安装完成后，可以通过以下命令验证 Repomix 是否正常工作：

```bash
repomix --version
repomix --help
```
