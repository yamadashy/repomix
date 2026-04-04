# Introdução ao Repomix

<script setup>
import HomeBadges from '../../../components/HomeBadges.vue'
import YouTubeVideo from '../../../components/YouTubeVideo.vue'
import { VIDEO_IDS } from '../../../utils/videos'
</script>

O Repomix é uma ferramenta que compacta todo o seu repositório em um único arquivo amigável para IA. Ele foi projetado para ajudá-lo a alimentar seu código-fonte para Modelos de Linguagem Grandes (LLMs) como ChatGPT, Claude, Gemini, Grok, DeepSeek, Perplexity, Gemma, Llama e mais.

<YouTubeVideo :videoId="VIDEO_IDS.REPOMIX_DEMO" />

<HomeBadges />

<br>
<!--@include: ../../shared/sponsors-section.md-->

## Início Rápido

Execute este comando no diretório do seu projeto:

```bash
npx repomix@latest
```

É isso! Você encontrará um arquivo `repomix-output.xml` contendo todo o seu repositório em um formato amigável para IA.

Você pode então enviar este arquivo para um assistente de IA com um prompt como:

```
Este arquivo contém todos os arquivos do repositório combinados em um só.
Eu quero refatorar o código, então, por favor, revise-o primeiro.
```

A IA analisará todo o seu código-fonte e fornecerá insights abrangentes:

![Uso do Arquivo Repomix 1](/images/docs/repomix-file-usage-1.png)

Ao discutir mudanças específicas, a IA pode ajudar a gerar código. Com recursos como o Artifacts do Claude, você pode até receber vários arquivos interdependentes:

![Uso do Arquivo Repomix 2](/images/docs/repomix-file-usage-2.png)

Feliz codificação! 🚀

## Por que Repomix?

O Repomix pode ser usado com qualquer serviço de assinatura como ChatGPT, Claude, Gemini ou Grok, sem se preocupar com custos extras. Ao fornecer o contexto completo do código, ele elimina a necessidade de explorar arquivos um por um, tornando a análise mais rápida e precisa.

Com toda a base de código disponível como contexto, o Repomix possibilita diversas aplicações: planejamento de implementação, investigação de bugs, verificações de segurança de bibliotecas de terceiros, geração de documentação e muito mais.

## Principais Recursos

- **Saída Otimizada para IA**: Formata seu código-fonte para fácil processamento por IA
- **Contagem de Tokens**: Rastreia o uso de tokens para limites de contexto de LLM
- **Integração com Git**: Respeita seus arquivos `.gitignore` e `.git/info/exclude`
- **Focado em Segurança**: Detecta informações sensíveis
- **Múltiplos Formatos de Saída**: Escolha entre texto simples, XML ou Markdown

## O que vem a seguir?

- [Guia de Instalação](installation.md): Diferentes maneiras de instalar o Repomix
- [Guia de Uso](usage.md): Aprenda sobre recursos básicos e avançados
- [Configuração](configuration.md): Personalize o Repomix para suas necessidades
- [Recursos de Segurança](security.md): Aprenda sobre verificações de segurança
- [Formatos de Saída](output.md): Escolha o melhor formato para seu modelo de IA
- [Servidor MCP](mcp-server.md): Integre o Repomix diretamente com assistentes de IA

## Comunidade

Junte-se à nossa [comunidade Discord](https://discord.gg/wNYzTwZFku) para:
- Obter ajuda com o Repomix
- Compartilhar suas experiências
- Sugerir novos recursos
- Conectar-se com outros usuários

## Suporte

Encontrou um bug ou precisa de ajuda?
- [Abra um problema no GitHub](https://github.com/yamadashy/repomix/issues)
- Junte-se ao nosso servidor Discord
- Verifique a [documentação](https://repomix.com)
