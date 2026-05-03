---
title: GitHub ActionsでRepomixを使う
description: GitHub ActionsでRepomixを自動化し、AI分析、CIワークフロー、アーティファクト、コードレビュー、圧縮出力向けにリポジトリをパッケージ化します。
---

# GitHub ActionsでRepomixを使う

GitHub ActionsワークフローにRepomixを組み込むことで、AI解析用のコードベースパッキングを自動化できます。CIやコードレビュー、LLMツール向けの準備に便利です。

## 基本的な使い方

リポジトリをパックするには、ワークフローYAMLに以下のステップを追加します。

```yaml
- name: Pack repository with Repomix
  uses: yamadashy/repomix/.github/actions/repomix@main
  with:
    output: repomix-output.xml
```

## 異なる出力形式の使用

`style`パラメータを使用して異なる出力形式を指定できます（デフォルトは`xml`です）：

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

## 複数ディレクトリ・圧縮オプション

複数ディレクトリやinclude/excludeパターン、スマート圧縮も指定できます。

```yaml
- name: Pack repository with Repomix
  uses: yamadashy/repomix/.github/actions/repomix@main
  with:
    directories: src tests
    include: "**/*.ts,**/*.md"
    ignore: "**/*.test.ts"
    output: repomix-output.xml
    compress: true
```

## 出力ファイルをアーティファクトとしてアップロード

生成したファイルを後続ステップやダウンロード用にアップロードする例です。

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

## Actionの入力パラメータ

| 名前                | 説明                                   | デフォルト         |
|---------------------|----------------------------------------|--------------------|
| `directories`       | パック対象ディレクトリ（空白区切り）    | `.`                |
| `include`           | 含めるファイルのglobパターン（カンマ区切り） | `""`           |
| `ignore`            | 除外するファイルのglobパターン（カンマ区切り） | `""`           |
| `output`            | 出力ファイルパス                        | `repomix-output.xml`      |
| `compress`          | スマート圧縮の有効化                    | `true`             |
| `style`             | 出力スタイル（xml, markdown, json, plain）      | `xml`             |
| `additional-args`   | repomix CLIへの追加引数                 | `""`           |
| `repomix-version`   | インストールするnpmパッケージのバージョン | `latest`           |

## Actionの出力

| 名前           | 説明                       |
|----------------|----------------------------|
| `output_file`  | 生成された出力ファイルのパス |

## ワークフロー全体例

Repomixを使ったGitHub Actionsワークフローの例です。

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

[完全なワークフロー例](https://github.com/yamadashy/repomix/blob/main/.github/workflows/pack-repository.yml)をご参照ください。
