# 設定

## クイックスタート

設定ファイルを作成：
```bash
repomix --init
```

## 設定ファイル

`repomix.config.json`:
```json
{
  "output": {
    "filePath": "repomix-output.xml",
    "style": "xml",
    "parsableStyle": true,
    "compress": false,
    "headerText": "カスタムヘッダーテキスト",
    "instructionFilePath": "repomix-instruction.md",
    "fileSummary": true,
    "directoryStructure": true,
    "removeComments": false,
    "removeEmptyLines": false,
    "topFilesLength": 5,
    "showLineNumbers": false,
    "copyToClipboard": false,
    "includeEmptyDirectories": false
  },
  "include": ["**/*"],
  "ignore": {
    "useGitignore": true,
    "useDefaultPatterns": true,
    "customPatterns": ["tmp/", "*.log"]
  },
  "security": {
    "enableSecurityCheck": true
  }
}
```

## グローバル設定

グローバル設定を作成：
```bash
repomix --init --global
```

設定ファイルの場所：
- Windows: `%LOCALAPPDATA%\Repomix\repomix.config.json`
- macOS/Linux: `~/.config/repomix/repomix.config.json`

## 除外パターン

優先順位：
1. CLIオプション（`--ignore`）
2. `.repomixignore`
3. `.gitignore` および `.git/info/exclude`
4. デフォルトパターン

`.repomixignore` の例：
```text
# キャッシュディレクトリ
.cache/
tmp/

# ビルド出力
dist/
build/

# ログ
*.log
```

## デフォルトの除外パターン

デフォルトで含まれる一般的なパターン：
```text
node_modules/**
.git/**
coverage/**
dist/**
```

全リスト: [defaultIgnore.ts](https://github.com/yamadashy/repomix/blob/main/src/config/defaultIgnore.ts)

## 設定例

### コード圧縮

`output.compress`を`true`に設定すると、Repomixは実装の詳細を削除しながら、本質的なコード構造を抽出します。これは、重要な構造情報を維持しながらトークン数を削減する場合に特に有用です。

例えば、このコード：

```typescript
const calculateTotal = (items: ShoppingItem[]) => {
  let total = 0;
  for (const item of items) {
    total += item.price * item.quantity;
  }
  return total;
}
interface Item {
  name: string;
  price: number;
  quantity: number;
}
```

は以下のように圧縮されます：

```typescript
const calculateTotal = (items: ShoppingItem[]) => {
interface Item {
```

### コメントの削除

`output.removeComments`を`true`に設定すると、全てのコードコメントが削除されます。これは、コードの実装に焦点を当てたい場合や、トークン数をさらに削減したい場合に有用です。
