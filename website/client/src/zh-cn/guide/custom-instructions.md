# 自定义指令

Repomix 允许你提供自定义指令，这些指令将被包含在输出文件中。这对于为处理代码库的 AI 系统提供上下文或特定指导非常有用。

## 使用方法

要包含自定义指令，请在仓库根目录创建一个 markdown 文件（例如 `repomix-instruction.md`）。然后，在 `repomix.config.json` 中指定该文件的路径：

```json
{
  "output": {
    "instructionFilePath": "repomix-instruction.md"
  }
}
```

该文件的内容将在输出中的"Instruction"部分中显示。

## 示例

```markdown
# 仓库指令

这个仓库包含了 Repomix 工具的源代码。在分析代码时请遵循以下指导原则：

1. 重点关注 `src/core` 目录中的核心功能
2. 特别注意 `src/core/security` 中的安全检查
3. 忽略 `tests` 目录中的文件

## 代码规范
- 遵循 TypeScript 最佳实践
- 确保所有公共 API 都有适当的文档
- 使用依赖注入模式以便于测试

## 安全考虑
- 确保所有用户输入都经过适当验证
- 避免在日志中记录敏感信息
- 使用安全的依赖版本
```

这将在输出中生成以下部分：

```xml
<instruction>
# 仓库指令

这个仓库包含了 Repomix 工具的源代码。在分析代码时请遵循以下指导原则：

1. 重点关注 `src/core` 目录中的核心功能
2. 特别注意 `src/core/security` 中的安全检查
3. 忽略 `tests` 目录中的文件

## 代码规范
- 遵循 TypeScript 最佳实践
- 确保所有公共 API 都有适当的文档
- 使用依赖注入模式以便于测试

## 安全考虑
- 确保所有用户输入都经过适当验证
- 避免在日志中记录敏感信息
- 使用安全的依赖版本
</instruction>
```

## 最佳实践

1. **保持简洁明确**：指令应该简短但详细
2. **提供具体示例**：在适当的情况下添加代码示例
3. **设置优先级**：将最重要的指令放在前面
4. **包含上下文**：提供项目背景和重要考虑因素
5. **结构化内容**：使用标题和列表使指令易于阅读

## 注意事项

- 避免在指令中包含敏感信息
- 定期更新指令以反映项目的变化
- 确保指令与项目的其他文档保持一致
- 使用清晰的层次结构组织内容

## 相关资源

- [配置](/zh-cn/guide/configuration) - 在配置文件中设置 `output.instructionFilePath`
- [输出格式](/zh-cn/guide/output) - 了解不同的输出格式
- [提示词示例](/zh-cn/guide/prompt-examples) - AI 分析的示例提示词
- [使用场景](/zh-cn/guide/use-cases) - 使用 Repomix 搭配 AI 的实际案例
