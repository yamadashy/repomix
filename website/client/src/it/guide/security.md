---
title: "Sicurezza"
description: "Scopri come Repomix usa Secretlint e controlli di sicurezza per rilevare segreti, chiavi API, token, credenziali e contenuti sensibili del repository prima dell'impacchettamento."
---

# Sicurezza

## Funzionalità di Controllo Sicurezza

Repomix utilizza [Secretlint](https://github.com/secretlint/secretlint) per rilevare informazioni sensibili nei tuoi file:
- Chiavi API
- Token di accesso
- Credenziali
- Chiavi private
- Variabili d'ambiente

## Configurazione

I controlli di sicurezza sono abilitati per impostazione predefinita.

Disabilitazione tramite CLI:
```bash
repomix --no-security-check
```

O in `repomix.config.json`:
```json
{
  "security": {
    "enableSecurityCheck": false
  }
}
```

## Misure di Sicurezza

1. **Gestione file binari**: I contenuti dei file binari sono esclusi dall'output, ma i loro percorsi sono elencati nella struttura delle directory per una panoramica completa del repository
2. **Compatibile con Git**: Rispetta i pattern `.gitignore`
3. **Rilevamento automatizzato**: Analizza i problemi di sicurezza comuni:
    - Credenziali AWS
    - Stringhe di connessione ai database
    - Token di autenticazione
    - Chiavi private

## Fiducia nella Configurazione dei Repository Remoti {#remote-repository-config-trust}

Quando impacchetti un repository remoto con `--remote`, Repomix tratta la configurazione di quel repository come codice non attendibile.

### Perché un File di Configurazione è Codice

Un `repomix.config.*` non è solo dati:

- `repomix.config.ts` / `.js` / `.mjs` viene **eseguito** quando viene caricato.
- `input.processors` esegue comandi esterni sui file corrispondenti.
- `output.instructionFilePath` e i pattern di inclusione che usano `../` leggono file al di fuori del repository.

Caricare una configurazione non revisionata da un repository sconosciuto è quindi paragonabile a eseguire il suo `Makefile`, o a fare `npm install` di un pacchetto con script del ciclo di vita.

### Predefinito: le Configurazioni Remote Non Vengono Mai Caricate

Repomix ignora la configurazione di un repository clonato a meno che tu non lo richieda esplicitamente. La tua configurazione globale e le opzioni CLI continuano ad applicarsi. Se non passi mai il flag descritto di seguito, niente in questa sezione può influire su di te.

### Come Attivarla

```bash
# Usando il flag CLI
repomix --remote user/repo --remote-trust-config

# Usando la variabile d'ambiente
REPOMIX_REMOTE_TRUST_CONFIG=true repomix --remote user/repo
```

Questo concede alla configurazione remota la stessa fiducia di una configurazione scritta da te. Usalo solo per repository di cui ti fidi e che hai revisionato.

### Prompt di Conferma

Su un terminale interattivo, Repomix mostra la configurazione che sta per essere eseguita e chiede conferma prima di caricarla:

| Scelta | Effetto |
| --- | --- |
| **Sì, solo questa volta** | Fidati solo di questa esecuzione. |
| **Sì, e non chiedere più per questo repository** | Ricorda la decisione (vedi sotto). |
| **No** (selezione predefinita) | Interrompi senza caricare la configurazione. |

La configurazione mostrata è scritta dall'autore del repository, quindi Repomix si assicura che la visualizzazione non possa essere manipolata:

- **Le sequenze di controllo e ANSI vengono escapate**, così una configurazione non può ridisegnare il terminale né far scorrere l'avviso fuori dalla vista.
- **I caratteri bidirezionali e invisibili vengono escapati**, così il testo che leggi è il testo che viene eseguito ([Trojan Source](https://trojansource.codes/)).
- **L'output ha un limite** sia per numero di righe che per dimensione in byte, così una configurazione riempita ad arte non può spingere l'avviso fuori dallo schermo.
- **Ogni riga della configurazione ha un prefisso**, così una configurazione non può contraffare i separatori o i messaggi propri di Repomix.
- **I collegamenti simbolici vengono rifiutati.** Git preserva i collegamenti simbolici, quindi un repository può includere un `repomix.config.json` che punta al di fuori del clone. Repomix richiede che la configurazione sia un file normale all'interno dell'albero clonato, altrimenti i byte che hai revisionato non sarebbero i byte che vengono eseguiti.

### Memorizzare una Decisione

Scegliere "non chiedere più" salva un marcatore nella tua directory temporanea (`$TMPDIR/repomix/trusted-remotes/`), leggibile e scrivibile solo dal tuo account utente.

Il marcatore è **ancorato al contenuto**: registra un hash della configurazione che hai approvato. Se in seguito quel repository pubblica una configurazione diversa, l'hash non corrisponde più e **ti viene richiesta di nuovo conferma** — lo stesso modello di `direnv allow`.

::: warning Ambito dell'ancoraggio
L'hash copre solo il file di configurazione di ingresso. Una configurazione `.ts` / `.js` può fare `import` di altri file, e `input.processors` può invocare script esterni; nessuno dei due è incluso nell'hash. Un repository di cui ti sei già fidato può modificare questi file mentre il file di ingresso resta identico. Per questo le configurazioni eseguibili sono etichettate come tali nel prompt: considera "non chiedere più" come fiducia nel repository, non solo nel file che hai letto.
:::

I marcatori risiedono nella directory temporanea, quindi le decisioni decadono quando il tuo sistema operativo la ripulisce. Questo è intenzionale: decadere verso "chiedi di nuovo" è la direzione sicura.

### Quando il Prompt Viene Saltato

| Situazione | Comportamento |
| --- | --- |
| Viene passato `--force` | Considerato attendibile senza chiedere. Il flag significa che accetti le conseguenze; viene stampato un avviso su stderr. |
| Shell non interattiva (CI, pipe) | Considerato attendibile senza chiedere, preservando l'automazione esistente. Viene stampato un avviso su stderr. |
| Repository già considerato attendibile | Caricato senza chiedere, finché la configurazione resta invariata. |
| Viene usato un `--config` assoluto | La configurazione propria del repository clonato non viene mai caricata, quindi non c'è nulla da confermare. |
| Il clone non ha un file di configurazione | Non c'è nulla di cui fidarsi. |

Con `--stdout`, o quando lo stdout viene reindirizzato, il prompt non può essere mostrato. Repomix segnala un errore con indicazioni invece di considerare silenziosamente attendibile la configurazione.

### Raccomandazioni

1. Lascia `--remote-trust-config` disattivato a meno che tu non abbia bisogno della configurazione propria del repository.
2. Leggi la configurazione nel prompt prima di rispondere, in particolare `input.processors` e qualsiasi percorso `../`.
3. Preferisci "Sì, solo questa volta" per i repository che non controlli.
4. In CI, ricorda che il prompt non può proteggerti: fissa la revisione che impacchetti e revisionala in anticipo.

## Quando il Controllo di Sicurezza Trova Problemi

Esempio di output:
```bash
🔍 Controllo sicurezza:
────────────────────────────
2 file sospetti rilevati ed esclusi:
1. config/credentials.json
  - Chiave di accesso AWS trovata
2. .env.local
  - Password del database trovata
```

## Best Practice

1. Esaminare sempre l'output prima di condividerlo
2. Usare `.repomixignore` per percorsi sensibili
3. Mantenere i controlli di sicurezza abilitati
4. Rimuovere i file sensibili dal repository

## Segnalazione Problemi di Sicurezza

Hai trovato una vulnerabilità di sicurezza? Per favore:
1. Non aprire un ticket pubblico
2. Invia un'email a: koukun0120@gmail.com
3. Oppure usa gli [Avvisi di Sicurezza GitHub](https://github.com/yamadashy/repomix/security/advisories/new)

## Risorse correlate

- [Elaborazione Repository Remoti](/it/guide/remote-repository-processing) - Impacchetta repository che non hai clonato tu stesso
- [Configurazione](/it/guide/configuration) - Configurare i controlli di sicurezza tramite `security.enableSecurityCheck`
- [Opzioni da Linea di Comando](/it/guide/command-line-options) - Usare il flag `--no-security-check`
- [Informativa sulla Privacy](/it/guide/privacy) - Scoprire come Repomix gestisce i dati
