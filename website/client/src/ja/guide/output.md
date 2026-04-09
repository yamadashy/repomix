# 出力フォーマット

Repomixは4つの出力フォーマットをサポートしています。
- XML（デフォルト）
- Markdown
- JSON
- プレーンテキスト

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

<git_logs>
<git_log_commit>
<date>2025-08-20 00:47:19 +0900</date>
<message>feat(cli): Add --include-logs option for git commit history</message>
<files>
README.md
src/cli/cliRun.ts
src/core/git/gitCommand.ts
src/core/git/gitLogHandle.ts
src/core/output/outputGenerate.ts
</files>
</git_log_commit>

<git_log_commit>
<date>2025-08-21 00:09:43 +0900</date>
<message>Merge pull request #795 from yamadashy/chore/ratchet-update-ci</message>
<files>
.github/workflows/ratchet-update.yml
</files>
</git_log_commit>
</git_logs>

<instruction>
（output.instructionFilePathで指定されたカスタム指示）
</instruction>
```

### なぜXMLをデフォルト形式としているのか？

Repomixは広範な研究とテストに基づき、XMLをデフォルトの出力形式として採用しています。この決定は実証的な証拠とAIアシスト型コード解析における実用性を考慮した結果です。

XML採用の主な理由は、大手AIプロバイダーからの公式推奨事項にあります：
- **Anthropic (Claude)**: プロンプト構造化においてXMLタグの使用を明示的に推奨し、「Claudeは学習過程でそのようなプロンプトに触れている」と明記（[ドキュメント](https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/use-xml-tags)）
- **Google (Gemini)**: 複雑なタスクにおいてXMLを含む構造化フォーマットを推奨（[ドキュメント](https://cloud.google.com/vertex-ai/generative-ai/docs/learn/prompts/structure-prompts)）
- **OpenAI (GPT)**: 複雑なシナリオでの構造化プロンプトを推奨（[発表](https://x.com/OpenAIDevs/status/1890147300493914437)、[cookbook](https://cookbook.openai.com/examples/gpt-5/gpt-5_prompting_guide)）

## Markdownフォーマット

```bash
repomix --style markdown
```

Markdownは読みやすいフォーマットを提供します。

````markdown
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

# Gitログ

## コミット: 2025-08-20 00:47:19 +0900
**メッセージ:** feat(cli): Add --include-logs option for git commit history

**ファイル:**
- README.md
- src/cli/cliRun.ts
- src/core/git/gitCommand.ts
- src/core/git/gitLogHandle.ts
- src/core/output/outputGenerate.ts

## コミット: 2025-08-21 00:09:43 +0900
**メッセージ:** Merge pull request #795 from yamadashy/chore/ratchet-update-ci

**ファイル:**
- .github/workflows/ratchet-update.yml
````

## JSONフォーマット

```bash
repomix --style json
```

JSONフォーマットは、camelCase形式のプロパティ名を使用した構造化され、プログラムでアクセス可能な出力を提供します。

```json
{
  "fileSummary": {
    "generationHeader": "このファイルは、Repomixによってコードベース全体を1つのドキュメントにまとめた表現です。",
    "purpose": "このファイルには、リポジトリ全体のコンテンツをパックした表現が含まれています...",
    "fileFormat": "コンテンツは以下のように構成されています...",
    "usageGuidelines": "- このファイルは読み取り専用として扱ってください...",
    "notes": "- 一部のファイルは.gitignoreルールに基づいて除外されている可能性があります..."
  },
  "userProvidedHeader": "指定された場合のカスタムヘッダーテキスト",
  "directoryStructure": "src/
  cli/
    cliOutput.ts
    index.ts
  config/
    configLoader.ts",
  "files": {
    "src/index.js": "// ファイルの内容がここに表示されます",
    "src/utils.js": "// ファイルの内容がここに表示されます"
  },
  "instruction": "instructionFilePathからのカスタム指示"
}
```

### JSONフォーマットの利点

JSONフォーマットは以下の用途に最適です：
- **プログラム処理**: 任意のプログラミング言語でJSONライブラリを使用して簡単に解析・操作が可能
- **API統合**: Webサービスやアプリケーションでのダイレクトな利用
- **AIツール互換性**: 機械学習やAIシステム向けに最適化された構造化フォーマット  
- **データ解析**: `jq`などのツールを使用した特定情報の簡単な抽出

### `jq`を使用したJSON出力の活用

JSONフォーマットによって、プログラムで特定の情報を簡単に抽出できます。一般的な使用例をご紹介します：

#### 基本的なファイル操作
```bash
# すべてのファイルパスを一覧表示
cat repomix-output.json | jq -r '.files | keys[]'

# ファイル総数を取得
cat repomix-output.json | jq '.files | keys | length'

# 特定のファイル内容を抽出
cat repomix-output.json | jq -r '.files["README.md"]'
cat repomix-output.json | jq -r '.files["src/index.js"]'
```

#### ファイルのフィルタリングと分析
```bash
# 拡張子でファイルを検索
cat repomix-output.json | jq -r '.files | keys[] | select(endswith(".ts"))'
cat repomix-output.json | jq -r '.files | keys[] | select(endswith(".js") or endswith(".ts"))'

# 特定のテキストを含むファイルを検索
cat repomix-output.json | jq -r '.files | to_entries[] | select(.value | contains("function")) | .key'

# ファイルリストと文字数を表示
cat repomix-output.json | jq -r '.files | to_entries[] | "\(.key): \(.value | length) 文字"'
```

#### メタデータの抽出
```bash
# ディレクトリ構造を抽出
cat repomix-output.json | jq -r '.directoryStructure'

# ファイルサマリー情報を取得
cat repomix-output.json | jq '.fileSummary.purpose'
cat repomix-output.json | jq -r '.fileSummary.generationHeader'

# ユーザー提供のヘッダーを抽出（存在する場合）
cat repomix-output.json | jq -r '.userProvidedHeader // "ヘッダーが提供されていません"'

# カスタム指示を取得
cat repomix-output.json | jq -r '.instruction // "指示が提供されていません"'
```

#### 高度な分析
```bash
# コンテンツ長で最大のファイルを検索
cat repomix-output.json | jq -r '.files | to_entries[] | [.key, (.value | length)] | @tsv' | sort -k2 -nr | head -10

# 特定のパターンを含むファイルを検索
cat repomix-output.json | jq -r '.files | to_entries[] | select(.value | test("import.*react"; "i")) | .key'

# 複数の拡張子にマッチするファイルパスを抽出
cat repomix-output.json | jq -r '.files | keys[] | select(test("\.(js|ts|jsx|tsx)$"))'
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

================
Gitログ
================
================
Date: 2025-08-20 00:47:19 +0900
Message: feat(cli): Add --include-logs option for git commit history
Files:
  - README.md
  - src/cli/cliRun.ts
  - src/core/git/gitCommand.ts
  - src/core/git/gitLogHandle.ts
  - src/core/output/outputGenerate.ts
================

================
Date: 2025-08-21 00:09:43 +0900
Message: Merge pull request #795 from yamadashy/chore/ratchet-update-ci
Files:
  - .github/workflows/ratchet-update.yml
================
```

## AIモデルとの使用

各フォーマットはAIモデルで問題なく動作しますが、以下の点を考慮してください：
- XMLはClaude用に最適化（最も正確な解析）
- Markdownは一般的な読みやすさを重視
- JSONはプログラム処理とAPI統合に最適
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

## 関連リソース

- [設定](/ja/guide/configuration) - 設定オプションの完全なリファレンス
- [コマンドラインオプション](/ja/guide/command-line-options) - `--style`で出力形式を設定
- [コード圧縮](/ja/guide/code-compress) - 構造を維持しながらトークン数を削減
- [プロンプト例](/ja/guide/prompt-examples) - AIモデル別の出力活用のヒント
