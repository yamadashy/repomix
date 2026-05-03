---
title: "Repomix Explorer Skill (Agent Skills)"
description: "Installa Repomix Explorer Agent Skill per analizzare codebase locali e remote con Claude Code e altri assistenti IA compatibili con il formato Agent Skills."
---

# Repomix Explorer Skill (Agent Skills)

Repomix fornisce uno skill **Repomix Explorer** pronto all'uso che consente agli assistenti di codifica IA di analizzare ed esplorare codebase utilizzando Repomix CLI.

Questo skill è progettato per Claude Code e altri assistenti IA compatibili con il formato Agent Skills.

## Installazione Rapida

Per Claude Code, installa il plugin ufficiale Repomix Explorer:

```text
/plugin marketplace add yamadashy/repomix
/plugin install repomix-explorer@repomix
```

Il plugin per Claude Code fornisce comandi con namespace come `/repomix-explorer:explore-local` e `/repomix-explorer:explore-remote`. Consulta [Plugin Claude Code](/it/guide/claude-code-plugins) per la configurazione completa.

Per Codex, Cursor, OpenClaw e altri assistenti compatibili con Agent Skills, installa lo skill standalone con Skills CLI:

```bash
npx skills add yamadashy/repomix --skill repomix-explorer
```

Per scegliere un assistente specifico, passa `--agent`:

```bash
npx skills add yamadashy/repomix --skill repomix-explorer --agent codex
npx skills add yamadashy/repomix --skill repomix-explorer --agent openclaw
```

Per Hermes Agent, installa lo skill a file singolo con il comando skills nativo di Hermes:

```bash
hermes skills install https://raw.githubusercontent.com/yamadashy/repomix/main/.claude/skills/repomix-explorer/SKILL.md
```

Se usi Hermes principalmente per l'analisi dei repository, anche la configurazione del [Server MCP](/it/guide/mcp-server) è una buona opzione perché esegue Repomix direttamente come server MCP.

## Cosa Fa

Una volta installato, puoi analizzare codebase con istruzioni in linguaggio naturale.

#### Analizzare repository remoti

```text
"What's the structure of this repo?
https://github.com/facebook/react"
```

#### Esplorare codebase locali

```text
"What's in this project?
~/projects/my-app"
```

Questo è utile non solo per comprendere codebase, ma anche quando vuoi implementare funzionalità facendo riferimento ai tuoi altri repository.

## Come Funziona

Lo skill Repomix Explorer guida gli assistenti IA attraverso il workflow completo:

1. **Eseguire comandi repomix** - Impacchettare repository in formato compatibile con IA
2. **Analizzare file di output** - Usare la ricerca di pattern (grep) per trovare codice rilevante
3. **Fornire insight** - Riportare struttura, metriche e raccomandazioni attuabili

## Esempi di Casi d'Uso

### Comprendere una Nuova Codebase

```text
"I want to understand the architecture of this project.
https://github.com/vercel/next.js"
```

L'IA eseguirà repomix, analizzerà l'output e fornirà una panoramica strutturata della codebase.

### Trovare Pattern Specifici

```text
"Find all authentication-related code in this repository."
```

L'IA cercherà pattern di autenticazione, categorizzerà i risultati per file e spiegherà come l'autenticazione è implementata.

### Riferirsi ai Propri Progetti

```text
"I want to implement a similar feature to what I did in my other project.
~/projects/my-other-app"
```

L'IA analizzerà il tuo altro repository e ti aiuterà a fare riferimento alle tue implementazioni.

## Contenuto dello Skill

Lo skill include:

- **Riconoscimento dell'intento utente** - Comprende i vari modi in cui gli utenti richiedono analisi di codebase
- **Guida ai comandi Repomix** - Sa quali opzioni usare (`--compress`, `--include`, ecc.)
- **Workflow di analisi** - Approccio strutturato per esplorare output impacchettati
- **Best practice** - Suggerimenti di efficienza come usare grep prima di leggere file interi

## Risorse Correlate

- [Generazione Agent Skills](/it/guide/agent-skills-generation) - Genera i tuoi skill da codebase
- [Plugin Claude Code](/it/guide/claude-code-plugins) - Plugin Repomix per Claude Code
- [Server MCP](/it/guide/mcp-server) - Metodo di integrazione alternativo
