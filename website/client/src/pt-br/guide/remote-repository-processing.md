# Processamento de Repositório GitHub

## Uso Básico

Processar repositórios públicos:
```bash
# Usando URL completo
repomix --remote https://github.com/user/repo

# Usando atalho do GitHub
repomix --remote user/repo
```

## Seleção de Branch e Commit

```bash
# Branch específico
repomix --remote user/repo --remote-branch main

# Tag
repomix --remote user/repo --remote-branch v1.0.0

# Hash do commit
repomix --remote user/repo --remote-branch 935b695
```

## Requisitos

- Git deve estar instalado
- Conexão com a internet
- Acesso de leitura ao repositório

## Controle de Saída

```bash
# Local de saída personalizado
repomix --remote user/repo -o custom-output.xml

# Com formato XML
repomix --remote user/repo --style xml

# Remover comentários
repomix --remote user/repo --remove-comments
```

## Uso com Docker

```bash
# Processar e enviar para o diretório atual
docker run -v .:/app -it --rm ghcr.io/yamadashy/repomix \
  --remote user/repo

# Enviar para um diretório específico
docker run -v ./output:/app -it --rm ghcr.io/yamadashy/repomix \
  --remote user/repo
```

## Segurança

Por questões de segurança, os arquivos de configuração (`repomix.config.*`) de repositórios remotos não são carregados por padrão. Isso impede que repositórios não confiáveis executem código por meio de arquivos de configuração como `repomix.config.ts`.

Suas configurações globais e opções de CLI continuam sendo aplicadas normalmente.

Para confiar na configuração de um repositório remoto:

```bash
# Usando flag da CLI
repomix --remote user/repo --remote-trust-config

# Usando variável de ambiente
REPOMIX_REMOTE_TRUST_CONFIG=true repomix --remote user/repo
```

Ao usar `--config` com `--remote`, um caminho absoluto é obrigatório:

```bash
repomix --remote user/repo --config /home/user/repomix.config.json
```

## Problemas Comuns

### Problemas de Acesso
- Certifique-se de que o repositório é público
- Verifique a instalação do Git
- Verifique a conexão com a internet

### Repositórios Grandes
- Use `--include` para selecionar caminhos específicos
- Habilite `--remove-comments`
- Processe branches separadamente
