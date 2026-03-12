# Repomix Explorer Skill (Agent Skills)

Repomix fornisce uno skill **Repomix Explorer** pronto all'uso che consente agli assistenti di codifica IA di analizzare ed esplorare codebase utilizzando Repomix CLI.

Questo skill è progettato per funzionare con vari strumenti IA, tra cui Claude Code, Cursor, Codex, GitHub Copilot e altri.

## Installazione Rapida

```bash
npx add-skill yamadashy/repomix --skill repomix-explorer
```

Questo comando installa lo skill nella directory degli skill del tuo assistente IA (es. `.claude/skills/`), rendendolo immediatamente disponibile.

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
