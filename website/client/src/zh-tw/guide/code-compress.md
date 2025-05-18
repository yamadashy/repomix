# 程式碼壓縮

程式碼壓縮是一項強大的功能，可以智能提取關鍵程式碼結構，同時移除實現細節。此功能利用 [Tree-sitter](https://github.com/tree-sitter/tree-sitter) 執行智能程式碼提取，專注於函數和類別簽名，同時保留重要的結構資訊。這對於減少令牌數量同時保持對程式碼庫架構理解特別有用。

> [!NOTE]  
> 這是一項實驗性功能，我們將根據用戶反饋和實際使用情況積極改進

## 基本使用

使用 `--compress` 標誌啟用程式碼壓縮：

```bash
repomix --compress
```

您也可以將其用於遠端儲存庫：

```bash
repomix --remote user/repo --compress
```

## 工作原理

壓縮演算法使用 tree-sitter 解析處理程式碼，提取並保留基本結構元素，同時移除實現細節。

壓縮會保留：
- 函數和方法簽名（參數和返回類型）
- 介面和類型定義（屬性類型和結構）
- 類別結構和屬性（繼承關係）
- 重要的結構元素（導入、導出、模組結構）

同時移除：
- 函數和方法實現
- 迴圈和條件邏輯細節
- 內部變數聲明
- 特定實現的程式碼

### 範例

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

## 設定

您可以在設定檔中啟用壓縮：

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
- 減少 LLM 處理的令牌數量
- 創建高級文檔
- 理解程式碼模式和簽名
- 分享 API 和介面設計

## 相關選項

您可以將壓縮與其他選項結合使用：
- `--remove-comments`：移除程式碼註解
- `--remove-empty-lines`：移除空行
- `--output-show-line-numbers`：在輸出中添加行號
