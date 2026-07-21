---
title: 安全性
description: 了解 Repomix 如何使用 Secretlint 和安全检查，在打包前检测密钥、API key、令牌、凭据和敏感仓库内容。
---

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

## 远程仓库配置信任 {#remote-repository-config-trust}

当你使用 `--remote` 打包远程仓库时，Repomix 会将该仓库的配置视为不受信任的代码。

### 为什么配置文件是代码

`repomix.config.*` 不仅仅是数据：

- `repomix.config.ts` / `.js` / `.mjs` 在加载时会被**执行**。
- `input.processors` 会对匹配的文件运行外部命令。
- `output.instructionFilePath` 以及使用 `../` 的 include 模式会读取仓库之外的文件。

因此，加载一个未经审查的、来自陌生仓库的配置，就相当于运行它的 `Makefile`，或者对带有生命周期脚本的包执行 `npm install`。

### 默认：远程配置永远不会被加载

除非你明确要求，否则 Repomix 会忽略克隆仓库的配置。你的全局配置和 CLI 选项仍然会正常生效。如果你从未传入下面这个标志，本节的内容都不会影响你。

### 选择信任

```bash
# 使用 CLI 标志
repomix --remote user/repo --remote-trust-config

# 使用环境变量
REPOMIX_REMOTE_TRUST_CONFIG=true repomix --remote user/repo
```

这会让远程配置获得与你自己编写的配置相同的信任。请仅对你信任且已审查过的仓库使用它。

### 确认提示

在交互式终端中，Repomix 会显示即将运行的配置，并在加载前征求你的确认：

| 选项 | 效果 |
| --- | --- |
| **仅本次同意** | 仅信任这一次运行。 |
| **同意，且不再询问此仓库** | 记住该决定（见下文）。 |
| **否**（默认选项） | 中止操作，不加载该配置。 |

展示给你的配置是由仓库作者编写的，因此 Repomix 会确保该展示内容不会被篡改：

- **控制字符和 ANSI 转义序列会被转义**，因此配置无法重新绘制终端，也无法把警告滚动出视野。
- **双向控制字符和不可见字符会被转义**，因此你读到的文本就是实际运行的文本（[Trojan Source](https://trojansource.codes/)）。
- **输出会同时受到行数和字节大小的限制**，因此被填充的配置无法把警告挤出屏幕。
- **每一行配置都会带有前缀**，因此配置无法伪造 Repomix 自身的分隔线或消息。
- **符号链接会被拒绝。** 由于 Git 会保留符号链接，仓库可以提供一个指向克隆目录之外的 `repomix.config.json`。Repomix 要求配置必须是克隆目录内的常规文件，否则你审查过的字节就不是实际运行的字节。

### 记住选择

选择“不再询问”会在你的临时目录（`$TMPDIR/repomix/trusted-remotes/`）下保存一个标记，该标记只能由你的用户账户读写。

该标记是**与内容绑定的**：它记录了你所批准的配置的哈希值。如果该仓库之后提供了不同的配置，哈希将不再匹配，**系统会再次询问你**，这与 `direnv allow` 的模式相同。

::: warning 绑定的范围
该哈希仅覆盖入口配置文件。`.ts` / `.js` 配置可以 `import` 其他文件，`input.processors` 也可以调用外部脚本，这两者都不会被计入哈希。一个你已经信任的仓库，可以在入口文件保持不变的情况下修改这些内容。这就是为什么可执行的配置会在提示中被特别标注，请将“不再询问”理解为对整个仓库的信任，而不仅仅是你所读到的那个文件。
:::

标记保存在临时目录中，因此当你的操作系统清除该目录时，这些决定也会随之失效。这是有意为之：向“重新询问”的方向失效才是安全的。

### 提示会被跳过的情况

| 情况 | 行为 |
| --- | --- |
| 传入了 `--force` | 无需询问即被信任。该标志意味着你接受由此产生的后果，系统会向标准错误输出打印一条提示。 |
| 非交互式 shell（CI、管道等） | 无需询问即被信任，从而保持现有自动化正常工作。系统会向标准错误输出打印一条提示。 |
| 仓库已被信任 | 只要配置未发生变化，就会无需询问直接加载。 |
| 使用了绝对路径的 `--config` | 克隆仓库自身的配置永远不会被加载，因此没有需要确认的内容。 |
| 克隆的仓库没有配置文件 | 没有可信任的对象。 |

在 `--stdout` 模式下，或者当标准输出被重定向时，提示无法显示。此时 Repomix 会报告一个带有操作指引的错误，而不是默默地信任该配置。

### 建议

1. 除非你需要该仓库自身的配置，否则请让 `--remote-trust-config` 保持关闭。
2. 在回答之前，请阅读提示中展示的配置内容，尤其是 `input.processors` 和任何 `../` 路径。
3. 对于你无法掌控的仓库，优先选择“仅本次同意”。
4. 在 CI 中，请记住该提示无法保护你，应固定你所打包的版本并提前进行审查。

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

- [GitHub 仓库处理](/zh-cn/guide/remote-repository-processing) - 打包你尚未克隆的仓库
- [配置](/zh-cn/guide/configuration) - 通过 `security.enableSecurityCheck` 配置安全检查
- [命令行选项](/zh-cn/guide/command-line-options) - 使用 `--no-security-check` 标志
- [隐私政策](/zh-cn/guide/privacy) - 了解 Repomix 的数据处理方式
