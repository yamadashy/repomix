---
title: 在 GitHub Actions 中使用 Repomix
description: 在 GitHub Actions 中自動執行 Repomix，為 AI 分析、CI 流程、成品、程式碼審查與壓縮輸出打包儲存庫。
---

# 在 GitHub Actions 中使用 Repomix

通過將 Repomix 集成到 GitHub Actions 工作流中，可以自動打包程式碼庫以供 AI 分析。這對於持續集成（CI）、程式碼審查或為 LLM 工具做準備非常有用。

## 基本用法

在工作流 YAML 文件中添加以下步驟以打包您的倉庫：

```yaml
- name: Pack repository with Repomix
  uses: yamadashy/repomix/.github/actions/repomix@main
  with:
    output: repomix-output.xml
```

## 使用不同的輸出格式

可以使用 `style` 參數指定不同的輸出格式（默認為 `xml`）：

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

## 多目錄與壓縮選項

可以指定多個目錄、包含/排除模式，並啟用智能壓縮：

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

## 上傳輸出文件為 Artifact

將生成的文件作為 artifact 上傳，以便後續步驟或下載：

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

## Action 輸入參數

| 名稱                | 說明                                   | 預設值           |
|---------------------|----------------------------------------|------------------|
| `directories`       | 要打包的目錄（空格分隔）               | `.`              |
| `include`           | 包含的 glob 模式（逗號分隔）           | `""`           |
| `ignore`            | 排除的 glob 模式（逗號分隔）           | `""`           |
| `output`            | 輸出文件路徑                            | `repomix-output.xml`    |
| `style`             | 輸出樣式（xml、markdown、json、plain）        | `xml`            |
| `compress`          | 啟用智能壓縮                            | `true`           |
| `additional-args`   | 傳遞給 repomix CLI 的額外參數           | `""`           |
| `repomix-version`   | 要安裝的 npm 包版本                     | `latest`         |

## Action 輸出

| 名稱           | 說明                   |
|----------------|------------------------|
| `output_file`  | 生成的輸出文件路徑      |

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
