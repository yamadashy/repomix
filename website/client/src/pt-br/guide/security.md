# Security

## Security Check Feature

Repomix uses [Secretlint](https://github.com/secretlint/secretlint) to detect sensitive information in your files, including:
- API keys and access tokens
- Authentication credentials
- Private keys and certificates
- Database connection strings
- Environment variables containing secrets
- Personal or sensitive data

## Configuration

Security checks are enabled by default.

Disable via CLI:
```bash
repomix --no-security-check
```

Or in `repomix.config.json`:
```json
{
  "security": {
    "enableSecurityCheck": false
  }
}
```

## Security Measures

1. **Binary File Exclusion**: Binary files are not included in output to reduce file size and prevent sensitive data leakage
2. **Git-Aware**: Respects `.gitignore` patterns to avoid including sensitive files already marked for exclusion
3. **Automated Detection**: Scans for common security issues:
  - AWS credentials and access keys
  - Database connection strings and passwords
  - Authentication tokens and OAuth credentials
  - Private keys and certificates
  - Environment variables containing sensitive information

## When Security Check Finds Issues

Example output:
```bash
🔍 Security Check:
──────────────────
2 suspicious file(s) detected and excluded:
1. config/credentials.json
  - Found AWS access key
2. .env.local
  - Found database password
```

## Best Practices

1. Always review output before sharing with AI services
2. Use `.repomixignore` for additional sensitive paths
3. Keep security checks enabled unless absolutely necessary to disable
4. Remove sensitive files from repository or add to ignore patterns

## Reporting Security Issues

Found a security vulnerability? Please:
1. Do not open a public issue
2. Email: koukun0120@gmail.com
3. Or use [GitHub Security Advisories](https://github.com/yamadashy/repomix/security/advisories/new)
