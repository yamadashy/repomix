# 注释移除

Repomix 可以在生成输出文件时自动移除代码中的注释。这有助于减少干扰，让代码更加简洁。

## 使用方法

要启用注释移除，在 `repomix.config.json` 中将 `removeComments` 选项设置为 `true`：

```json
{
  "output": {
    "removeComments": true
  }
}
```

## 支持的语言

Repomix 支持移除多种编程语言的注释，包括：

- JavaScript/TypeScript (`//`, `/* */`)
- Python (`#`, `"""`, `'''`)
- Java (`//`, `/* */`)
- C/C++ (`//`, `/* */`)
- HTML (`<!-- -->`)
- CSS (`/* */`)
- 以及更多语言...

## 示例

以下是 JavaScript 代码示例：

```javascript
// 这是单行注释
function test() {
  /* 这是
     多行注释 */
  return true;
}
```

启用注释移除后，输出将变为：

```javascript
function test() {
  return true;
}
```

## 注意事项

- 注释移除在其他处理步骤（如行号添加）之前执行
- 某些注释，例如 JSDoc 注释，可能会根据语言和上下文保留
- 如果你需要保留某些重要注释，请考虑使用其他方式记录这些信息，例如使用自定义指令

## 建议用法

1. **选择性使用**：
  - 对于需要向 AI 展示实现细节的代码，保留注释
  - 对于主要关注代码结构的分析，移除注释

2. **配合其他功能**：
  - 与 `--remove-empty-lines` 选项组合使用，获得更简洁的输出
  - 使用自定义指令提供额外的上下文信息

3. **性能考虑**：
  - 移除注释可以减少输出文件大小
  - 对于大型代码库特别有用

## 相关资源

- [代码压缩](/zh-cn/guide/code-compress) - 通过提取代码结构进一步减少 Token 数量
- [配置](/zh-cn/guide/configuration) - 在配置文件中设置 `output.removeComments`
- [命令行选项](/zh-cn/guide/command-line-options) - 使用 `--remove-comments` 标志
