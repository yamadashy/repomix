# コード圧縮
コード圧縮は、実装の詳細を省きながら、コードの本質的な構造を抽出する強力な機能です。この機能は[Tree-sitter](https://github.com/tree-sitter/tree-sitter)を活用して関数やクラスのシグネチャに焦点を当てた知的なコード抽出を行い、重要な構造情報を保持します。トークン数を削減しながらコードベースのアーキテクチャ理解を維持したい場合に特に有用です。

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
- 関数やメソッドのシグネチャ（パラメータと戻り値の型）
- インターフェースと型定義（プロパティの型と構造）
- クラス構造とプロパティ（継承関係）
- 重要な構造的要素（インポート、エクスポート、モジュール構造）

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
- コードの構造やアーキテクチャの分析（実装詳細に惑わされることなく全体像を把握）
- LLM処理のためのトークン数削減（コンテキスト制限内により多くのコードを含める）
- 高レベルなドキュメントの作成（APIリファレンスや設計ドキュメント）
- コードパターンやシグネチャの理解（一貫性のあるコーディングスタイルの分析）
- APIやインターフェース設計の共有（実装を隠しながらインターフェースを明確に示す）

## 関連オプション

圧縮は以下のオプションと組み合わせることができます：
- `--remove-comments`: コードコメントを削除
- `--remove-empty-lines`: 空行を削除
- `--output-show-line-numbers`: 出力に行番号を追加
