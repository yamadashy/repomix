# 安全性

## 安全检查功能

Repomix 使用 [Secretlint](https://github.com/secretlint/secretlint) 检测文件中的敏感信息：
- API 密钥
- 访问令牌
- 认证凭证
- 私钥
- 环境变量

## 配置

安全检查默认启用。

通过命令行禁用：
```bash
repomix --no-security-check
```

或在 `repomix.config.json` 中配置：
```json
{
  "security": {
    "enableSecurityCheck": false
  }
}
```

## 安全措施

1. **二进制文件处理**：二进制文件内容从输出中排除，但其路径在目录结构中列出，以提供完整的仓库概览
2. **Git 感知**：遵循 `.gitignore` 模式
3. **自动检测**：扫描常见安全问题：
    - AWS 凭证
    - 数据库连接字符串
    - 认证令牌
    - 私钥

## 安全检查发现问题时

输出示例：
```bash
🔍 Security Check:
──────────────────
2 suspicious file(s) detected and excluded:
1. config/credentials.json
  - Found AWS access key
2. .env.local
  - Found database password
```

## 最佳实践

1. 分享前务必检查输出内容
2. 使用 `.repomixignore` 排除敏感路径
3. 保持安全检查功能启用
4. 从仓库中移除敏感文件

## 报告安全问题

如果发现安全漏洞，请：
1. 不要创建公开的 Issue
2. 发送邮件至：koukun0120@gmail.com
3. 或使用 [GitHub 安全公告](https://github.com/yamadashy/repomix/security/advisories/new)

## 相关资源

- [配置](/zh-cn/guide/configuration) - 通过 `security.enableSecurityCheck` 配置安全检查
- [命令行选项](/zh-cn/guide/command-line-options) - 使用 `--no-security-check` 标志
- [隐私政策](/zh-cn/guide/privacy) - 了解 Repomix 的数据处理方式
