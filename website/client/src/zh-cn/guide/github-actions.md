# 在 GitHub Actions 中使用 Repomix

通过将 Repomix 集成到 GitHub Actions 工作流中，可以自动打包代码库以供 AI 分析。这对于持续集成（CI）、代码审查或为 LLM 工具做准备非常有用。

## 基本用法

在工作流 YAML 文件中添加以下步骤以打包你的仓库：

```yaml
- name: Pack repository with Repomix
  uses: yamadashy/repomix/.github/actions/repomix@main
  with:
    output: repomix-output.xml
```

## 使用不同的输出格式

可以使用 `style` 参数指定不同的输出格式（默认为 `xml`）：

```yaml
- name: Pack repository with Repomix
  uses: yamadashy/repomix/.github/actions/repomix@main
  with:
    output: repomix-output.md
    style: markdown
```

```yaml
- name: Pack repository with Repomix (JSON format)
  uses: yamadashy/repomix/.github/actions/repomix@main
  with:
    output: repomix-output.json
    style: json
```

## 多目录与压缩选项

可以指定多个目录、包含/排除模式，并启用智能压缩：

```yaml
- name: Pack repository with Repomix
  uses: yamadashy/repomix/.github/actions/repomix@main
  with:
    directories: src tests
    include: "**/*.ts,**/*.md"
    ignore: "**/*.test.ts"
    output: repomix-output.txt
    compress: true
```

## 上传输出文件为 Artifact

将生成的文件作为 artifact 上传，以便后续步骤或下载：

```yaml
- name: Pack repository with Repomix
  uses: yamadashy/repomix/.github/actions/repomix@main
  with:
    directories: src
    output: repomix-output.xml
    compress: true

- name: Upload Repomix output
  uses: actions/upload-artifact@v4
  with:
    name: repomix-output
    path: repomix-output.xml
```

## Action 输入参数

| 名称                | 说明                                   | 默认值           |
|---------------------|----------------------------------------|------------------|
| `directories`       | 要打包的目录（空格分隔）               | `.`              |
| `include`           | 包含的 glob 模式（逗号分隔）           | `""`           |
| `ignore`            | 排除的 glob 模式（逗号分隔）           | `""`           |
| `output`            | 输出文件路径                            | `repomix-output.xml`    |
| `style`             | 输出样式（xml、markdown、json、plain）        | `xml`            |
| `compress`          | 启用智能压缩                            | `true`           |
| `additional-args`   | 传递给 repomix CLI 的额外参数           | `""`           |
| `repomix-version`   | 要安装的 npm 包版本                     | `latest`         |

## Action 输出

| 名称           | 说明                   |
|----------------|------------------------|
| `output_file`  | 生成的输出文件路径      |

## 完整工作流示例

以下是使用 Repomix 的 GitHub Actions 工作流完整示例：

```yaml
name: Pack repository with Repomix

on:
  workflow_dispatch:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  pack-repo:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Pack repository with Repomix
        uses: yamadashy/repomix/.github/actions/repomix@main
        with:
          output: repomix-output.xml

      - name: Upload Repomix output
        uses: actions/upload-artifact@v4
        with:
          name: repomix-output.xml
          path: repomix-output.xml
          retention-days: 30
```

查看[完整工作流示例](https://github.com/yamadashy/repomix/blob/main/.github/workflows/pack-repository.yml)。
