# 出力フォーマット

Repomixは3つの出力フォーマットをサポートしています。
- XML（デフォルト）：最も構造化されたフォーマットで、XMLを効率的に解析するClaudeなどのAIツールに最適
- Markdown：読みやすさと構造のバランスが取れており、GitHubやドキュメント指向のワークフローに最適
- プレーンテキスト：最もシンプルなフォーマットで、あらゆるツールやプラットフォームで互換性があります

## XMLフォーマット

```bash
repomix --style xml
```

XMLフォーマットは明確に定義されたセクションと構造を持ち、AI処理に最適化されています。

```xml
このファイルは、コードベース全体を1つのドキュメントにまとめた表現です...

<file_summary>
（メタデータとAI向けの使用説明）
</file_summary>

<directory_structure>
src/
  index.ts
  utils/
    helper.ts
</directory_structure>

<files>
<file path="src/index.js">
// ファイルの内容がここに表示されます
</file>
</files>

<instruction>
（output.instructionFilePathで指定されたカスタム指示）
</instruction>
```

::: tip なぜXML？
XMLタグはClaudeなどのAIモデルがコンテンツをより正確に解析するのに役立ちます。Claude公式ドキュメントでは[XMLタグの使用を推奨](https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/use-xml-tags)しており、これによりモデルがコードベースの異なるセクションを理解しやすくなります。
:::

## Markdownフォーマット

```bash
repomix --style markdown
```

Markdownは読みやすいフォーマットを提供します。

```markdown
このファイルは、コードベース全体を1つのドキュメントにまとめた表現です...

# ファイルサマリー
（メタデータとAI向けの使用説明）

# ディレクトリ構造
```
src/
index.ts
utils/
helper.ts
```

# ファイル

## File: src/index.ts
```typescript
// ファイルの内容がここに表示されます
```
```

## AIモデルとの使用

各フォーマットはAIモデルで問題なく動作しますが、以下の点を考慮してください。
- XMLはClaudeや明確なセクション区切りを好む他のAIモデル用に最適化
- Markdownは人間との共有とAI分析の両方に適した一般的な読みやすさを重視
- プレーンテキストはシンプルさ、普遍的な互換性、マークアップを解析しないツールでの作業に最適

## カスタマイズ

`repomix.config.json`でデフォルトのフォーマットを設定
```json
{
  "output": {
    "style": "xml",
    "filePath": "output.xml"
  }
}
```

## プレーンテキストフォーマット

```bash
repomix --style plain
```

出力の構造
```text
このファイルは、コードベース全体を1つのドキュメントにまとめた表現です...

================
ファイルサマリー
================
（メタデータとAI向けの使用説明）

================
ディレクトリ構造
================
src/
  index.ts
  utils/
    helper.ts

================
ファイル
================

================
File: src/index.js
================
// ファイルの内容がここに表示されます

================
File: src/utils.js
================
// ファイルの内容がここに表示されます
```
