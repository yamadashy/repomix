# 程式碼壓縮
程式碼壓縮是一個強大的功能，它能夠在移除實現細節的同時智能提取關鍵程式碼結構。在需要減少令牌數量的同時保持程式碼庫的重要結構信息時，這個功能特別有用。

> [!NOTE]
> 這是一個實驗性功能，我們將根據用戶反饋和實際使用情況積極改進。

## 基本用法

使用 `--compress` 標誌啟用程式碼壓縮：

```bash
repomix --compress
```

也可以在遠端倉庫中使用：

```bash
repomix --remote user/repo --compress
```

## 工作原理

壓縮算法使用 Tree-sitter 解析處理程式碼，提取並保留基本結構元素，同時移除實現細節。

壓縮會保留：
- 函數和方法簽名
- 介面和類型定義
- 類結構和屬性
- 重要的結構元素

同時會移除：
- 函數和方法實現
- 迴圈和條件邏輯細節
- 內部變量聲明
- 具體實現程式碼

### 示例

原始 TypeScript 程式碼：

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

壓縮後：

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

## 配置

你可以在配置文件中啟用壓縮：

```json
{
  "output": {
    "compress": true
  }
}
```

## 使用場景

程式碼壓縮在以下情況特別有用：
- 分析程式碼結構和架構
- 減少用於 LLM 處理的令牌數量
- 建立高層次文件
- 理解程式碼模式和簽名
- 共享 API 和介面設計

## 相關選項

你可以將壓縮與其他選項結合使用：
- `--remove-comments`: 移除程式碼註釋（參見[註釋移除](/zh-tw/guide/comment-removal)）
- `--remove-empty-lines`: 移除空行
- `--output-show-line-numbers`: 在輸出中添加行號

## 相關資源

- [註釋移除](/zh-tw/guide/comment-removal) - 移除註釋以進一步減少令牌數量
- [設定](/zh-tw/guide/configuration) - 在設定檔中設定 `output.compress`
- [命令列選項](/zh-tw/guide/command-line-options) - 完整的 CLI 參考
