# スキル生成

Repomixは[Claude Agent Skills](https://docs.anthropic.com/en/docs/claude-code/skills)形式の出力を生成できます。これにより、AIアシスタントの再利用可能なコードベースリファレンスとして使用できる構造化されたスキルディレクトリが作成されます。

## スキル生成とは

スキル生成は、コードベースを整理されたClaude Agent Skillに変換します。単一のパッキングファイルを生成する代わりに、AIの理解とgrep検索に最適化された複数のリファレンスファイルを含む構造化されたディレクトリを作成します。

## 基本的な使い方

ローカルディレクトリからスキルを生成します：

```bash
# カレントディレクトリからスキルを生成
repomix --skill-generate

# カスタムスキル名で生成
repomix --skill-generate my-project-reference

# 特定のディレクトリから生成
repomix --skill-generate path/to/directory

# リモートリポジトリから生成
repomix --remote https://github.com/user/repo --skill-generate
```

## スキル保存先の選択

コマンドを実行すると、Repomixはスキルの保存先を選択するよう促します：

1. **個人用スキル** (`~/.claude/skills/`) - マシン上のすべてのプロジェクトで利用可能
2. **プロジェクト用スキル** (`.claude/skills/`) - gitを通じてチームと共有

スキルディレクトリが既に存在する場合は、上書きの確認が求められます。

## 生成される構造

スキルは以下の構造で生成されます：

```
.claude/skills/<skill-name>/
├── SKILL.md                    # メインのスキルメタデータとドキュメント
└── references/
    ├── summary.md              # 目的、フォーマット、統計情報
    ├── project-structure.md    # 行数付きディレクトリツリー
    ├── files.md                # すべてのファイル内容（grep検索向け）
    └── tech-stack.md           # 言語、フレームワーク、依存関係
```

### ファイルの説明

#### SKILL.md

メインのスキルファイルで、以下を含みます：
- スキル名、説明、プロジェクト情報
- ファイル数、行数、トークン数
- スキルの使用方法の概要
- ファイルの場所とフォーマットの説明
- 一般的なユースケースとヒント

#### references/summary.md

以下を含みます：
- **目的**: AI利用のためのリファレンスコードベースであることを説明
- **ファイル構造**: 各リファレンスファイルの内容を文書化
- **使用ガイドライン**: スキルを効果的に使用する方法
- **統計情報**: ファイルタイプ、言語、最大ファイルの内訳

#### references/project-structure.md

ファイル探索を容易にするための、各ファイルの行数付きディレクトリツリー：

```
src/
  index.ts (42 lines)
  utils/
    helpers.ts (128 lines)
    math.ts (87 lines)
```

#### references/files.md

grep検索に最適化された、シンタックスハイライト付きのすべてのファイル内容：

```markdown
## File: src/index.ts
```typescript
import { sum } from './utils/helpers';

export function main() {
  console.log(sum(1, 2));
}
```
```

#### references/tech-stack.md

依存関係ファイルから自動検出される技術スタック：
- **言語**: TypeScript、JavaScript、Python など
- **フレームワーク**: React、Next.js、Express、Django など
- **ランタイムバージョン**: Node.js、Python、Go など
- **パッケージマネージャー**: npm、pnpm、poetry など
- **依存関係**: すべての直接依存と開発依存
- **設定ファイル**: 検出されたすべての設定ファイル

検出対象ファイル: `package.json`、`requirements.txt`、`Cargo.toml`、`go.mod`、`.nvmrc`、`pyproject.toml` など

## 自動生成されるスキル名

名前が指定されない場合、Repomixは以下のパターンで自動生成します：

```bash
repomix src/                           # → repomix-reference-src
repomix --remote user/repo             # → repomix-reference-repo
repomix --skill-generate custom-name   # → custom-name（ケバブケースに正規化）
```

スキル名は：
- ケバブケース（小文字、ハイフン区切り）に変換
- 最大64文字に制限
- パストラバーサルから保護

## Repomixオプションとの統合

スキル生成はすべての標準Repomixオプションを尊重します：

```bash
# ファイルフィルタリング付きでスキルを生成
repomix --skill-generate --include "src/**/*.ts" --ignore "**/*.test.ts"

# 圧縮付きでスキルを生成
repomix --skill-generate --compress

# リモートリポジトリからスキルを生成
repomix --remote yamadashy/repomix --skill-generate

# 特定の出力フォーマットオプションでスキルを生成
repomix --skill-generate --remove-comments --remove-empty-lines
```

## 制限事項

`--skill-generate`オプションは以下と併用できません：
- `--stdout` - スキル出力にはファイルシステムへの書き込みが必要
- `--copy` - スキル出力はディレクトリであり、クリップボードにコピー不可

## 生成されたスキルの使用

生成されたスキルはClaudeで以下のように使用できます：

1. **Claude Code**: `~/.claude/skills/`または`.claude/skills/`に保存された場合、自動的に利用可能
2. **Claude Web**: コードベース分析のためにスキルディレクトリをClaudeにアップロード
3. **チーム共有**: チーム全体でアクセスできるように`.claude/skills/`をリポジトリにコミット

## 使用例ワークフロー

### 個人用リファレンスライブラリの作成

```bash
# 興味のあるオープンソースプロジェクトをクローンして分析
repomix --remote facebook/react --skill-generate react-reference

# スキルは ~/.claude/skills/react-reference/ に保存される
# これで任意のClaudeの会話でReactのコードベースを参照できる
```

### チームプロジェクトのドキュメント

```bash
# プロジェクトディレクトリで
cd my-project

# チーム用のスキルを生成
repomix --skill-generate

# プロンプトで「プロジェクト用スキル」を選択
# スキルは .claude/skills/repomix-reference-my-project/ に保存される

# コミットしてチームと共有
git add .claude/skills/
git commit -m "コードベースリファレンススキルを追加"
```

## 関連リソース

- [Claude Codeプラグイン](/ja/guide/claude-code-plugins) - Claude Code用のRepomixプラグインについて学ぶ
- [MCPサーバー](/ja/guide/mcp-server) - 代替の統合方法
- [コード圧縮](/ja/guide/code-compress) - 圧縮でトークン数を削減
- [設定](/ja/guide/configuration) - Repomixの動作をカスタマイズ
