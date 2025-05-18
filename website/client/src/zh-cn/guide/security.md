# 安全性

## 安全检查功能

Repomix 使用 [Secretlint](https://github.com/secretlint/secretlint) 检测文件中的敏感信息：
- API 密钥和访问令牌
- 认证凭证
- 私钥和证书
- 数据库连接字符串
- 包含敏感信息的环境变量
- 个人身份信息和敏感数据

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

1. **二进制文件排除**：输出中不包含二进制文件，减少文件大小并防止敏感数据泄露
2. **Git 感知**：遵循 `.gitignore` 模式，避免包含已标记为排除的敏感文件
3. **自动检测**：扫描常见安全问题：
    - AWS 凭证和访问密钥
    - 数据库连接字符串和密码
    - 认证令牌和 OAuth 凭证
    - 私钥和证书
    - 包含敏感信息的环境变量

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

1. 与 AI 服务分享前务必检查输出内容
2. 使用 `.repomixignore` 排除额外的敏感路径
3. 除非绝对必要，否则保持安全检查功能启用
4. 从仓库中移除敏感文件或将其添加到排除模式中

## 报告安全问题

如果发现安全漏洞，请：
1. 不要创建公开的 Issue
2. 发送邮件至：koukun0120@gmail.com
3. 或使用 [GitHub 安全公告](https://github.com/yamadashy/repomix/security/advisories/new)
