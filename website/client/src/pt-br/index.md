---
layout: home
title: Repomix
titleTemplate: Compacte seu código-fonte em formatos amigáveis para IA
aside: false
editLink: false

features:
  - icon: 🤖
    title: Otimizado para IA
    details: Formata seu código-fonte de uma maneira fácil para a IA entender e processar.

  - icon: ⚙️
    title: Integração com Git
    details: Respeita automaticamente seus arquivos .gitignore.

  - icon: 🛡️
    title: Focado na Segurança
    details: Incorpora o Secretlint para verificações de segurança robustas para detectar e prevenir a inclusão de informações confidenciais.

  - icon: 📊
    title: Contagem de Tokens
    details: Fornece contagens de tokens para cada arquivo e para todo o repositório, útil para limites de contexto de LLM.

---

<script setup>
import YouTubeVideo from '../../components/YouTubeVideo.vue'
import { VIDEO_IDS } from '../../utils/videos'
</script>

<div class="cli-section">

<br>
<!--@include: ../shared/sponsors-section.md-->

## 🏆 Indicação para os Open Source Awards

Estamos honrados! O Repomix foi indicado na categoria **Powered by AI** no [JSNation Open Source Awards 2025](https://osawards.com/javascript/).

Isso não teria sido possível sem todos vocês que usam e apoiam o Repomix. Obrigado!

## O que é o Repomix?

O Repomix é uma ferramenta poderosa que empacota toda a sua base de código em um único arquivo compatível com IA. Seja trabalhando em revisões de código, refatoração ou precisando de assistência de IA para seu projeto, o Repomix facilita o compartilhamento de todo o contexto do seu repositório com ferramentas de IA.

<YouTubeVideo :videoId="VIDEO_IDS.REPOMIX_DEMO" />

## Início Rápido

Depois de gerar um arquivo compactado (`repomix-output.xml`) usando o Repomix, você pode enviá-lo para um assistente de IA (como ChatGPT, Claude) com um prompt como:

```
Este arquivo contém todos os arquivos do repositório combinados em um.
Eu quero refatorar o código, então, por favor, revise-o primeiro.
```

A IA analisará todo o seu código-fonte e fornecerá insights abrangentes:

![Repomix File Usage 1](/images/docs/repomix-file-usage-1.png)

Ao discutir mudanças específicas, a IA pode ajudar a gerar código. Com recursos como o Artifacts do Claude, você pode até receber vários arquivos interdependentes:

![Repomix File Usage 2](/images/docs/repomix-file-usage-2.png)

Feliz codificação! 🚀

## Por que Repomix?

O Repomix pode ser usado com qualquer serviço de assinatura como ChatGPT, Claude, Gemini ou Grok, sem custos extras pelo Repomix em si. Ao fornecer o contexto completo do código, ele elimina a necessidade de explorar arquivos um por um, tornando a análise mais rápida e precisa.

Com toda a base de código disponível como contexto, o Repomix possibilita diversas aplicações: planejamento de implementação, investigação de bugs, verificações de segurança de bibliotecas de terceiros, geração de documentação e muito mais.

## Usando a Ferramenta CLI {#using-the-cli-tool}

O Repomix pode ser usado como uma ferramenta de linha de comando, oferecendo recursos poderosos e opções de personalização.

**A ferramenta CLI pode acessar repositórios privados** pois utiliza o Git instalado localmente.

### Início Rápido

Você pode experimentar o Repomix instantaneamente no diretório do seu projeto sem instalação:

```bash
npx repomix@latest
```

Ou instale globalmente para uso repetido:

```bash
# Instalar com npm
npm install -g repomix

# Ou com yarn
yarn global add repomix

# Ou com bun
bun add -g repomix

# Ou com Homebrew (macOS/Linux)
brew install repomix

# Então execute em qualquer diretório de projeto
repomix
```

É isso! O Repomix irá gerar um arquivo `repomix-output.xml` no seu diretório atual, contendo todo o seu repositório em um formato amigável para IA.

### Uso

Para compactar todo o seu repositório:

```bash
repomix
```

Para compactar um diretório específico:

```bash
repomix path/to/directory
```

Para compactar arquivos ou diretórios específicos usando [glob patterns](https://github.com/mrmlnc/fast-glob?tab=readme-ov-file#pattern-syntax):

```bash
repomix --include "src/**/*.ts,**/*.md"
```

Para excluir arquivos ou diretórios específicos:

```bash
repomix --ignore "**/*.log,tmp/"
```

Para compactar um repositório remoto:
```bash
# Usando formato abreviado
npx repomix --remote yamadashy/repomix

# Usando URL completa (suporta branches e caminhos específicos)
npx repomix --remote https://github.com/yamadashy/repomix
npx repomix --remote https://github.com/yamadashy/repomix/tree/main

# Usando URL do commit
npx repomix --remote https://github.com/yamadashy/repomix/commit/836abcd7335137228ad77feb28655d85712680f1
```

Para inicializar um novo arquivo de configuração (`repomix.config.json`):

```bash
repomix --init
```

Depois de gerar o arquivo compactado, você pode usá-lo com ferramentas de IA Generativa como Claude, ChatGPT e Gemini.

#### Uso do Docker

Você também pode executar o Repomix usando o Docker 🐳
Isso é útil se você quiser executar o Repomix em um ambiente isolado ou preferir usar contêineres.

Uso básico (diretório atual):

```bash
docker run -v .:/app -it --rm ghcr.io/yamadashy/repomix
```

Para compactar um diretório específico:
```bash
docker run -v .:/app -it --rm ghcr.io/yamadashy/repomix path/to/directory
```

Processar um repositório remoto e enviar para um diretório `output`:

```bash
docker run -v ./output:/app -it --rm ghcr.io/yamadashy/repomix --remote https://github.com/yamadashy/repomix
```

### Formatos de Saída

Escolha seu formato de saída preferido:

```bash
# Formato XML (padrão)
repomix --style xml

# Formato Markdown
repomix --style markdown

# Formato JSON
repomix --style json

# Formato de texto simples
repomix --style plain
```

### Customização

Crie um `repomix.config.json` para configurações persistentes:

```json
{
  "output": {
    "style": "markdown",
    "filePath": "custom-output.md",
    "removeComments": true,
    "showLineNumbers": true,
    "topFilesLength": 10
  },
  "ignore": {
    "customPatterns": ["*.test.ts", "docs/**"]
  }
}
```

## Casos de Uso do Mundo Real

### [Fluxo de Trabalho de Geração de Código com LLM](https://harper.blog/2025/02/16/my-llm-codegen-workflow-atm/)

Um desenvolvedor compartilha como usa o Repomix para extrair contexto de código de bases de código existentes, e então aproveita esse contexto com LLMs como Claude e Aider para melhorias incrementais, revisões de código e geração automatizada de documentação.

### [Criando Pacotes de Conhecimento para LLMs](https://lethain.com/competitive-advantage-author-llms/)

Autores estão usando o Repomix para empacotar seu conteúdo escrito—blogs, documentação e livros—em formatos compatíveis com LLM, permitindo que leitores interajam com sua expertise através de sistemas de perguntas e respostas alimentados por IA.

[Descobrir mais casos de uso →](./guide/use-cases)

## Guia de Usuários Avançados

O Repomix oferece recursos poderosos para casos de uso avançados. Aqui estão alguns guias essenciais para usuários avançados:

- **[Servidor MCP](./guide/mcp-server)** - Integração do Model Context Protocol para assistentes de IA
- **[GitHub Actions](./guide/github-actions)** - Automatize o empacotamento de código base em workflows de CI/CD
- **[Compressão de Código](./guide/code-compress)** - Compressão inteligente baseada em Tree-sitter (~70% de redução de tokens)
- **[Usar como Biblioteca](./guide/development/using-repomix-as-a-library)** - Integre o Repomix em suas aplicações Node.js
- **[Instruções Personalizadas](./guide/custom-instructions)** - Adicione prompts e instruções personalizadas às saídas
- **[Recursos de Segurança](./guide/security)** - Integração Secretlint incorporada e verificações de segurança
- **[Melhores Práticas](./guide/tips/best-practices)** - Otimize seus workflows de IA com estratégias comprovadas

### Mais Exemplos
::: tip Precisa de mais ajuda? 💡
Consulte nosso [guia](./guide/) para instruções detalhadas, ou visite nosso [repositório GitHub](https://github.com/yamadashy/repomix) para mais exemplos e código-fonte.
:::

</div>
