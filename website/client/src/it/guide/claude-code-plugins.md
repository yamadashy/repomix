# Plugin Claude Code

Repomix fornisce plugin ufficiali per [Claude Code](https://docs.anthropic.com/en/docs/claude-code/overview) che si integrano perfettamente nell'ambiente di sviluppo alimentato dall'IA. Questi plugin facilitano l'analisi e l'impacchettamento delle codebase direttamente in Claude Code usando comandi in linguaggio naturale.

## Installazione

### 1. Aggiungere il Marketplace Plugin Repomix

Prima, aggiungi il marketplace plugin Repomix a Claude Code:

```text
/plugin marketplace add yamadashy/repomix
```

### 2. Installare i Plugin

Installa i plugin usando i seguenti comandi:

```text
# Installa il plugin server MCP (base raccomandata)
/plugin install repomix-mcp@repomix

# Installa il plugin comandi (estende le funzionalità)
/plugin install repomix-commands@repomix

# Installa il plugin esploratore repository (analisi alimentata da IA)
/plugin install repomix-explorer@repomix
```

::: tip Relazioni tra Plugin
Il plugin `repomix-mcp` è raccomandato come base. Il plugin `repomix-commands` fornisce comandi slash convenienti, mentre `repomix-explorer` aggiunge capacità di analisi alimentate dall'IA. Sebbene tu possa installarli indipendentemente, usare tutti e tre offre l'esperienza più completa.
:::

### Alternativa: Installazione Interattiva

Puoi anche usare l'installatore di plugin interattivo:

```text
/plugin
```

Questo aprirà un'interfaccia interattiva dove puoi sfogliare e installare i plugin disponibili.

## Plugin Disponibili

### 1. repomix-mcp (Plugin Server MCP)

Plugin di base che fornisce analisi del codice alimentata dall'IA tramite l'integrazione del server MCP.

**Funzionalità:**
- Impacchettare repository locali e remoti
- Cercare negli output impacchettati
- Leggere file con analisi di sicurezza integrata ([Secretlint](https://github.com/secretlint/secretlint))
- Compressione Tree-sitter automatica (riduzione di circa il 70% dei token)

### 2. repomix-commands (Plugin Comandi Slash)

Fornisce comandi slash convenienti con supporto del linguaggio naturale.

**Comandi Disponibili:**
- `/repomix-commands:pack-local` - Impacchetta una codebase locale con varie opzioni
- `/repomix-commands:pack-remote` - Impacchetta e analizza repository GitHub remoti

### 3. repomix-explorer (Plugin Agente Analisi IA)

Agente di analisi repository alimentato dall'IA che esplora intelligentemente le codebase usando Repomix CLI.

**Funzionalità:**
- Esplorazione e analisi codebase in linguaggio naturale
- Scoperta intelligente di pattern e comprensione della struttura del codice
- Analisi incrementale usando grep e lettura file mirata
- Gestione automatica del contesto per grandi repository

**Comandi Disponibili:**
- `/repomix-explorer:explore-local` - Analizza una codebase locale con assistenza IA
- `/repomix-explorer:explore-remote` - Analizza repository GitHub remoti con assistenza IA

**Come Funziona:**
1. Esegue `npx repomix@latest` per impacchettare il repository
2. Usa gli strumenti Grep e Read per cercare efficientemente l'output
3. Fornisce un'analisi completa senza consumare contesto eccessivo

## Esempi d'Uso

### Impacchettamento di una Codebase Locale

Usa il comando `/repomix-commands:pack-local` con istruzioni in linguaggio naturale:

```text
/repomix-commands:pack-local
Impacchetta questo progetto in formato Markdown con compressione
```

Altri esempi:
- "Impacchetta solo la directory src"
- "Impacchetta i file TypeScript con numeri di riga"
- "Genera l'output in formato JSON"

### Impacchettamento di un Repository Remoto

Usa il comando `/repomix-commands:pack-remote` per analizzare repository GitHub:

```text
/repomix-commands:pack-remote yamadashy/repomix
Impacchetta solo i file TypeScript dal repository yamadashy/repomix
```

Altri esempi:
- "Impacchetta il branch main con compressione"
- "Includi solo i file di documentazione"
- "Impacchetta directory specifiche"

### Esplorare una Codebase Locale con l'IA

Usa il comando `/repomix-explorer:explore-local` per un'analisi alimentata dall'IA:

```text
/repomix-explorer:explore-local ./src
Trova tutto il codice relativo all'autenticazione
```

Altri esempi:
- "Analizza la struttura di questo progetto"
- "Mostrami i componenti principali"
- "Trova tutti gli endpoint API"

### Esplorare un Repository Remoto con l'IA

Usa il comando `/repomix-explorer:explore-remote` per analizzare repository GitHub:

```text
/repomix-explorer:explore-remote facebook/react
Mostrami l'architettura dei componenti principali
```

Altri esempi:
- "Trova tutti gli hook React nel repository"
- "Spiega la struttura del progetto"
- "Dove sono definiti gli error boundary?"

## Risorse Correlate

- [Documentazione Server MCP](/it/guide/mcp-server) - Scopri di più sul server MCP sottostante
- [Configurazione](/it/guide/configuration) - Personalizza il comportamento di Repomix
- [Sicurezza](/it/guide/security) - Comprendi le funzionalità di sicurezza
- [Opzioni da Linea di Comando](/it/guide/command-line-options) - Opzioni CLI disponibili

## Codice Sorgente dei Plugin

Il codice sorgente dei plugin è disponibile nel repository Repomix:

- [Marketplace Plugin](https://github.com/yamadashy/repomix/tree/main/.claude-plugin)
- [Plugin MCP](https://github.com/yamadashy/repomix/tree/main/.claude/plugins/repomix-mcp)
- [Plugin Comandi](https://github.com/yamadashy/repomix/tree/main/.claude/plugins/repomix-commands)
- [Plugin Esploratore Repository](https://github.com/yamadashy/repomix/tree/main/.claude/plugins/repomix-explorer)

## Feedback e Supporto

Se riscontri problemi o hai suggerimenti per i plugin Claude Code:

- [Apri un issue su GitHub](https://github.com/yamadashy/repomix/issues)
- [Unisciti alla nostra community Discord](https://discord.gg/wNYzTwZFku)
- [Vedi le discussioni esistenti](https://github.com/yamadashy/repomix/discussions)
