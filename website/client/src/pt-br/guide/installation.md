# Instalação

## Usando npx (Nenhuma Instalação Necessária)

```bash
npx repomix@latest
```

## Instalação Global

::: code-group
```bash [npm]
npm install -g repomix
```
```bash [yarn]
yarn global add repomix
```
```bash [pnpm]
pnpm add -g repomix
```
```bash [bun]
bun add -g repomix
```
```bash [Homebrew]
brew install repomix
```
:::

## Instalação via Docker

Baixe e execute a imagem Docker:

```bash
# Diretório atual
docker run -v .:/app -it --rm ghcr.io/yamadashy/repomix

# Diretório específico
docker run -v .:/app -it --rm ghcr.io/yamadashy/repomix path/to/directory

# Repositório remoto
docker run -v ./output:/app -it --rm ghcr.io/yamadashy/repomix --remote yamadashy/repomix
```

## Extensão VSCode

Execute o Repomix diretamente no VSCode com a extensão [Repomix Runner](https://marketplace.visualstudio.com/items?itemName=DorianMassoulier.repomix-runner) mantida pela comunidade.

Recursos:
- Empacote qualquer pasta com apenas alguns cliques
- Escolha entre modo arquivo ou conteúdo para copiar
- Limpeza automática de arquivos de saída
- Funciona com repomix.config.json

Instale através do [VSCode Marketplace](https://marketplace.visualstudio.com/items?itemName=DorianMassoulier.repomix-runner).

## Extensão do Navegador

Obtenha acesso instantâneo ao Repomix diretamente de qualquer repositório GitHub! Nossa extensão do Chrome adiciona um botão "Repomix" conveniente às páginas de repositório do GitHub.

![Repomix Browser Extension](/images/docs/browser-extension.png)

### Instalação
- Extensão do Chrome: [Repomix - Chrome Web Store](https://chromewebstore.google.com/detail/repomix/fimfamikepjgchehkohedilpdigcpkoa)
- Add-on do Firefox: [Repomix - Firefox Add-ons](https://addons.mozilla.org/firefox/addon/repomix/)

### Recursos
- Acesso com um clique ao Repomix para qualquer repositório GitHub
- Mais recursos emocionantes em breve!

## Requisitos de Sistema

- Node.js: ≥ 20.0.0
- Git: Necessário para processamento de repositório remoto

## Verificação

Após a instalação, verifique se o Repomix está funcionando:

```bash
repomix --version
repomix --help
```
