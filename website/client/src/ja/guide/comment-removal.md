# ソースコード中のコメント削除

Repomixは、パッケージング時に、ソースコード中のコメントを自動的に削除する機能を提供します。これにより、出力ファイルからノイズを減らし、実際のコードに焦点を当てることができます。

## 使用方法

コメントの削除を有効にするには、`repomix.config.json`で`removeComments`オプションを`true`に設定します。

```json
{
  "output": {
    "removeComments": true
  }
}
```

## サポートされている言語

Repomixは以下を含む多くのプログラミング言語のコメント削除をサポートしています。

- JavaScript/TypeScript (`//`, `/* */`)
- Python (`#`, `"""`, `'''`)
- Java (`//`, `/* */`)
- C/C++ (`//`, `/* */`)
- HTML (`<!-- -->`)
- CSS (`/* */`)
- その他多数の言語

## 使用例と出力例

以下のようなJavaScriptコードがある場合

```javascript
// これは単一行コメントです
function test() {
  /* これは
     複数行コメントです */
  return true;
}
```

コメント削除を有効にすると、出力は以下のようになります。

```javascript
function test() {
  return true;
}
```

## 制限事項

- コメントの削除は、行番号の追加など、他の処理よりも先に行われます。
- JSDocコメントなど、一部のコメントは削除されない場合があります。

## 関連リソース

- [コード圧縮](/ja/guide/code-compress) - コード構造の抽出によるさらなるトークン数削減
- [設定](/ja/guide/configuration) - 設定ファイルで`output.removeComments`を設定
- [コマンドラインオプション](/ja/guide/command-line-options) - `--remove-comments`フラグの使用
