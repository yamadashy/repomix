---
title: "Processamento de Repositório GitHub"
description: "Empacote repositórios GitHub com o Repomix usando URLs completas, abreviação usuário/repo, branches, tags, commits, Docker e controles de confiança para configuração remota."
---

# Processamento de Repositório GitHub

## Uso Básico

Processar repositórios públicos:
```bash
# Usando URL completo
repomix --remote https://github.com/user/repo

# Usando atalho do GitHub
repomix --remote user/repo
```

Você também pode passar o atalho `owner/repo` diretamente, sem `--remote`:

```bash
repomix yamadashy/repomix
```

Como `owner/repo` também se parece com um caminho local relativo, o Repomix só o trata como um repositório remoto quando não existe nenhum arquivo ou diretório local com esse nome e o repositório está acessível no GitHub. Um caminho local existente sempre tem precedência; para forçar o tratamento local de um caminho no formato `owner/repo`, prefixe-o com `./` (por exemplo, `repomix ./owner/repo`). Se o argumento corresponder ao padrão mas o repositório não puder ser acessado (por exemplo, um repositório privado ou um erro de digitação), o Repomix volta a tratá-lo como um caminho local.

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

::: warning
`--remote-trust-config` concede à configuração do repositório remoto o mesmo nível de confiança da sua própria máquina. Uma configuração confiável pode **executar comandos arbitrários** (via `input.processors`) e **ler arquivos locais fora do repositório** (por exemplo, via `output.instructionFilePath` ou padrões de inclusão que usam `../`). Use-a apenas para repositórios em que você confia totalmente e que já revisou, com o mesmo cuidado que teria antes de executar um `npm install` ou um `Makefile` vindo de uma fonte desconhecida.
:::

### Prompt de confirmação

Quando você confia na configuração de um repositório em um terminal interativo, o repomix mostra a configuração que está prestes a ser executada e pede que você confirme antes de carregá-la:

- **Sim, só desta vez**: confia apenas nesta execução.
- **Sim, e não perguntar novamente para este repositório**: lembrado até que seus arquivos temporários sejam limpos, e apenas enquanto esse arquivo de configuração permanecer inalterado (um arquivo de configuração editado solicita confirmação novamente). Observe que isso cobre apenas o arquivo de configuração em si: uma configuração `.ts` / `.js` pode importar outros arquivos, e esses não fazem parte dessa verificação.
- **Não**: aborta sem executar a configuração.

O prompt é ignorado quando você passa `--force`, em shells não interativos como CI (a configuração é considerada confiável como antes, mantendo a automação existente funcionando), ou depois que você escolher sempre confiar nesse repositório.

Para conhecer o modelo de confiança completo (o que uma configuração confiável pode fazer, como a configuração exibida é protegida contra adulteração e onde a decisão de "não perguntar novamente" é armazenada), veja [Segurança](/pt-br/guide/security#remote-repository-config-trust).

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

## Recursos relacionados

- [Opções de Linha de Comando](/pt-br/guide/command-line-options) - Referência completa da CLI incluindo opções `--remote`
- [Configuração](/pt-br/guide/configuration) - Configurar opções padrão para processamento remoto
- [Compressão de Código](/pt-br/guide/code-compress) - Reduzir o tamanho da saída para repositórios grandes
- [Segurança](/pt-br/guide/security) - Como o Repomix lida com detecção de dados sensíveis
