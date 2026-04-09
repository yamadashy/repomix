# コード圧縮
コード圧縮は、実装の詳細を省きながら、コードの本質的な構造を抽出する強力な機能です。トークン数を削減しながらコードベースの重要な構造情報を維持したい場合に特に有用です。

> [!NOTE]
> これは実験的な機能であり、ユーザーのフィードバックや実際の使用状況に基づいて積極的に改善を行っています。

## 基本的な使い方

`--compress`フラグを使用してコード圧縮を有効にします：

```bash
repomix --compress
```

リモートリポジトリでも使用できます：

```bash
repomix --remote user/repo --compress
```

## 仕組み

圧縮アルゴリズムは、tree-sitterパーシングを使用してコードを処理し、本質的な構造要素を抽出・保持しながら、実装の詳細を除外します。

圧縮で保持される要素：
- 関数やメソッドのシグネチャ
- インターフェースと型定義
- クラス構造とプロパティ
- 重要な構造的要素

以下の要素は除外されます：
- 関数やメソッドの実装内容
- ループや条件分岐のロジック詳細
- 内部変数の宣言
- 実装固有のコード

### 例

元のTypeScriptコード：

```typescript
import { ShoppingItem } from './shopping-item';

/**
 * Calculate the total price of shopping items
 */
const calculateTotal = (
  items: ShoppingItem[]
) => {
  let total = 0;
  for (const item of items) {
    total += item.price * item.quantity;
  }
  return total;
}

// Shopping item interface
interface Item {
  name: string;
  price: number;
  quantity: number;
}
```

圧縮後：

```typescript
import { ShoppingItem } from './shopping-item';
⋮----
/**
 * Calculate the total price of shopping items
 */
const calculateTotal = (
  items: ShoppingItem[]
) => {
⋮----
// Shopping item interface
interface Item {
  name: string;
  price: number;
  quantity: number;
}
```

## 設定

設定ファイルで圧縮を有効にすることもできます：

```json
{
  "output": {
    "compress": true
  }
}
```

## ユースケース

コード圧縮は以下のような場合に特に有用です：
- コードの構造やアーキテクチャの分析
- LLM処理のためのトークン数削減
- 高レベルなドキュメントの作成
- コードパターンやシグネチャの理解
- APIやインターフェース設計の共有

## 関連オプション

圧縮は以下のオプションと組み合わせることができます：
- `--remove-comments`: コードコメントを削除（[コメント削除](/ja/guide/comment-removal)を参照）
- `--remove-empty-lines`: 空行を削除
- `--output-show-line-numbers`: 出力に行番号を追加

## 関連リソース

- [コメント削除](/ja/guide/comment-removal) - コメント除去によるさらなるトークン数削減
- [設定](/ja/guide/configuration) - 設定ファイルで`output.compress`を設定
- [コマンドラインオプション](/ja/guide/command-line-options) - CLIリファレンス