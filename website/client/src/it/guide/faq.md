---
title: FAQ e risoluzione dei problemi
description: Risposte alle domande comuni su Repomix, repository privati, supporto C# e Python, agent compatibili MCP, formati di output, riduzione dei token, sicurezza e workflow IA.
---

# FAQ e risoluzione dei problemi

Questa pagina aiuta a scegliere il workflow Repomix corretto, ridurre output troppo grandi e preparare contesto di codice per assistenti IA.

## Domande frequenti

### A cosa serve Repomix?

Repomix impacchetta un repository in un singolo file adatto all'IA. Puoi fornire a ChatGPT, Claude, Gemini o altri assistenti il contesto completo della codebase per review, debug, refactoring, documentazione e onboarding.

### Repomix funziona con repository privati?

Sì. Esegui Repomix localmente in un checkout a cui la tua macchina ha già accesso:

```bash
repomix
```

Controlla il file generato prima di condividerlo con un servizio IA esterno.

### Può elaborare repository GitHub pubblici senza clonarli?

Sì. Usa `--remote` con shorthand o URL completo:

```bash
npx repomix --remote yamadashy/repomix
npx repomix --remote https://github.com/yamadashy/repomix
```

### Quale formato di output scegliere?

Usa XML come default. Usa Markdown per conversazioni leggibili, JSON per automazione e testo semplice per massima compatibilità. Cambia formato con `--style`:

```bash
repomix --style markdown
repomix --style json
```

Vedi [Formati di output](/it/guide/output).

## Ridurre i token

### Il file generato è troppo grande. Cosa fare?

Restringi il contesto:

```bash
repomix --include "src/**/*.ts,docs/**/*.md"
repomix --ignore "**/*.test.ts,dist/**"
repomix --compress
repomix --remove-comments
```

Combina pattern include e ignore con compressione del codice per repository grandi.

### Cosa fa `--compress`?

`--compress` conserva struttura importante come import, export, classi, funzioni e interfacce, rimuovendo molti dettagli implementativi. È utile quando il modello deve capire l'architettura.

## Sicurezza e privacy

### La CLI carica il mio codice?

La CLI Repomix gira localmente e scrive un file di output sulla tua macchina. Sito web ed estensione browser hanno workflow diversi; consulta la [Privacy Policy](/it/guide/privacy).

### Come evita Repomix di includere segreti?

Repomix usa controlli basati su Secretlint. Considerali una protezione aggiuntiva e verifica sempre l'output.

## Risoluzione dei problemi

### Perché mancano file nell'output?

Repomix rispetta `.gitignore`, regole ignore predefinite e pattern personalizzati. Controlla `repomix.config.json`, `--ignore` e le regole git.

### Come rendere l'output riproducibile in team?

Crea e versiona una configurazione condivisa:

```bash
repomix --init
```

## Domande frequenti aggiuntive

### Repomix funziona con C#, Python, Java, Go, Rust o altri linguaggi?

Sì. Repomix legge i file del progetto e li formatta per gli strumenti IA, quindi può impacchettare repository scritti in qualsiasi linguaggio. La CLI richiede Node.js 20 o superiore. Alcune funzionalità avanzate, come la compressione del codice basata su Tree-sitter, dipendono dal supporto del parser per ciascun linguaggio.

### Posso usare Repomix con Hermes Agent, OpenClaw o altri agent compatibili con MCP?

Sì. Repomix può essere eseguito come server MCP:

```bash
npx -y repomix --mcp
```

Per Hermes Agent, aggiungi Repomix come server MCP stdio in `~/.hermes/config.yaml`:

```yaml
mcp_servers:
  repomix:
    command: "npx"
    args: ["-y", "repomix", "--mcp"]
```

Per OpenClaw o altri agent compatibili con MCP, usa lo stesso command e gli stessi args dove l'agent permette di configurare un server MCP stdio esterno. Se il tuo assistente supporta Agent Skills, puoi usare anche [Repomix Explorer Skill](/it/guide/repomix-explorer-skill).

### Come uso Repomix per aiutare un assistente IA a capire una nuova libreria o framework?

Impacchetta il repository della libreria o la sua documentazione, poi usa l'output come materiale di riferimento per l'assistente IA:

```bash
npx repomix --remote owner/repo
npx repomix --remote owner/repo --include "docs/**,src/**"
```

Per uso ripetuto, puoi generare una directory Agent Skills riutilizzabile:

```bash
npx repomix --remote owner/repo --skill-generate library-reference
```

### Come escludo CSS, test, output di build o altri file rumorosi?

Usa `--ignore` per comandi singoli:

```bash
repomix --ignore "**/*.css,**/*.test.ts,dist/**,coverage/**"
```

Usa `--include` quando vuoi mantenere solo specifici percorsi di codice o documentazione:

```bash
repomix --include "src/**/*.ts,docs/**/*.md"
```

### Esiste un limite di dimensione del repository?

La CLI non ha un limite fisso di dimensione del repository, ma repository molto grandi possono essere limitati da memoria, dimensione dei file o limiti di upload e contesto dello strumento IA. Per progetti grandi, parti da pattern include mirati, controlla i file pesanti in token e dividi l'output se necessario:

```bash
repomix --token-count-tree 1000
repomix --split-output 1mb
```

### Perché `--include` non include file da `node_modules`, directory di build o percorsi ignorati?

`--include` restringe i file che Repomix prova a impacchettare, ma le regole di ignore si applicano comunque. I file possono essere esclusi da `.gitignore`, `.ignore`, `.repomixignore`, pattern predefiniti integrati o `repomix.config.json`. In casi avanzati, opzioni come `--no-gitignore` o `--no-default-patterns` possono aiutare, ma usale con attenzione perché possono includere dipendenze, artefatti di build o altri file rumorosi.

## Risorse correlate

- [Utilizzo base](/it/guide/usage)
- [Opzioni da riga di comando](/it/guide/command-line-options)
- [Compressione del codice](/it/guide/code-compress)
- [Sicurezza](/it/guide/security)
