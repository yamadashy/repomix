# 出力フォーマット

Repomixは3つの出力フォーマットをサポートしています。
- プレーンテキスト（デフォルト）
- XML
- Markdown

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

## XMLフォーマット

```bash
repomix --style xml
```

XMLフォーマットはAI処理に最適化されています。

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
XMLタグはClaudeなどのAIモデルがコンテンツをより正確に解析するのに役立ちます。[Claude公式ドキュメント](https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/use-xml-tags)では、構造化されたプロンプトにXMLタグを使用することを推奨しています。
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
- XMLはClaude用に最適化（最も正確な解析）
- Markdownは一般的な読みやすさを重視
- プレーンテキストはシンプルさと互換性を重視

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
