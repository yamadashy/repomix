---
title: FAQ e risoluzione dei problemi
description: Risposte alle domande comuni su Repomix, repository privati, formati di output, riduzione dei token, sicurezza e workflow IA.
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

## Risorse correlate

- [Utilizzo base](/it/guide/usage)
- [Opzioni da riga di comando](/it/guide/command-line-options)
- [Compressione del codice](/it/guide/code-compress)
- [Sicurezza](/it/guide/security)
