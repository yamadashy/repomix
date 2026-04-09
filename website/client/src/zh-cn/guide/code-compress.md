# 代码压缩
代码压缩是一个强大的功能，它能够在移除实现细节的同时智能提取关键代码结构。在需要减少 Token 数量的同时保持代码库的重要结构信息时，这个功能特别有用。

> [!NOTE]
> 这是一个实验性功能，我们将根据用户反馈和实际使用情况积极改进。

## 基本用法

使用 `--compress` 标志启用代码压缩：

```bash
repomix --compress
```

也可以在远程仓库中使用：

```bash
repomix --remote user/repo --compress
```

## 工作原理

压缩算法使用 Tree-sitter 解析处理代码，提取并保留基本结构元素，同时移除实现细节。

压缩会保留：
- 函数和方法签名
- 接口和类型定义
- 类结构和属性
- 重要的结构元素

同时会移除：
- 函数和方法实现
- 循环和条件逻辑细节
- 内部变量声明
- 具体实现代码

### 示例

原始 TypeScript 代码：

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

压缩后：

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

你可以在配置文件中启用压缩：

```json
{
  "output": {
    "compress": true
  }
}
```

## 使用场景

代码压缩在以下情况特别有用：
- 分析代码结构和架构
- 减少用于 LLM 处理的 token 数量
- 创建高层次文档
- 理解代码模式和签名
- 共享 API 和接口设计

## 相关选项

你可以将压缩与其他选项结合使用：
- `--remove-comments`: 移除代码注释（参见[注释移除](/zh-cn/guide/comment-removal)）
- `--remove-empty-lines`: 移除空行
- `--output-show-line-numbers`: 在输出中添加行号

## 相关资源

- [注释移除](/zh-cn/guide/comment-removal) - 移除注释以进一步减少 Token 数量
- [配置](/zh-cn/guide/configuration) - 在配置文件中设置 `output.compress`
- [命令行选项](/zh-cn/guide/command-line-options) - 完整的 CLI 参考
