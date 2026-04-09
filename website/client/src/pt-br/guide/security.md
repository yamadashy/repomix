# Segurança

## Recurso de Verificação de Segurança

O Repomix usa o [Secretlint](https://github.com/secretlint/secretlint) para detectar informações confidenciais em seus arquivos:
- Chaves de API
- Tokens de acesso
- Credenciais
- Chaves privadas
- Variáveis de ambiente

## Configuração

As verificações de segurança são habilitadas por padrão.

Desativar via CLI:
```bash
repomix --no-security-check
```

Ou em `repomix.config.json`:
```json
{
  "security": {
    "enableSecurityCheck": false
  }
}
```

## Medidas de Segurança

1. **Tratamento de Arquivos Binários**: Os conteúdos de arquivos binários são excluídos da saída, mas seus caminhos são listados na estrutura de diretórios para uma visão completa do repositório
2. **Compatível com Git**: Respeita os padrões do `.gitignore`
3. **Detecção Automatizada**: Verifica problemas de segurança comuns:
    - Credenciais da AWS
    - Strings de conexão de banco de dados
    - Tokens de autenticação
    - Chaves privadas

## Quando a Verificação de Segurança Encontra Problemas

Exemplo de saída:
```bash
🔍 Verificação de Segurança:
──────────────────
2 arquivo(s) suspeito(s) detectados e excluídos:
1. config/credentials.json
  - Chave de acesso da AWS encontrada
2. .env.local
  - Senha do banco de dados encontrada
```

## Melhores Práticas

1. Sempre revise a saída antes de compartilhar
2. Use `.repomixignore` para caminhos confidenciais
3. Mantenha as verificações de segurança habilitadas
4. Remova arquivos confidenciais do repositório

## Reportando Problemas de Segurança

Encontrou uma vulnerabilidade de segurança? Por favor:
1. Não abra uma issue pública
2. Envie um e-mail para: koukun0120@gmail.com
3. Ou use [Avisos de Segurança do GitHub](https://github.com/yamadashy/repomix/security/advisories/new)

## Recursos relacionados

- [Configuração](/pt-br/guide/configuration) - Configurar verificações de segurança via `security.enableSecurityCheck`
- [Opções de Linha de Comando](/pt-br/guide/command-line-options) - Usar a flag `--no-security-check`
- [Política de Privacidade](/pt-br/guide/privacy) - Saiba sobre o tratamento de dados do Repomix
