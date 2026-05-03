---
title: FAQ और समस्या निवारण
description: Repomix में private repositories, output formats, token reduction, remote GitHub repositories, security checks और AI workflows के बारे में आम सवालों के जवाब।
---

# FAQ और समस्या निवारण

यह पेज सही Repomix workflow चुनने, बड़े output को कम करने और AI assistants के लिए codebase context तैयार करने में मदद करता है।

## आम सवाल

### Repomix किस काम आता है?

Repomix repository को एक AI-friendly file में pack करता है। आप ChatGPT, Claude, Gemini या दूसरे assistants को code review, bug investigation, refactoring, documentation और onboarding के लिए पूरा codebase context दे सकते हैं।

### क्या Repomix private repositories के साथ काम करता है?

हाँ। जिस checkout तक आपकी machine की access है, उसमें Repomix local रूप से चलाएँ:

```bash
repomix
```

Generated file को किसी external AI service से share करने से पहले ज़रूर review करें।

### क्या public GitHub repository को clone किए बिना process किया जा सकता है?

हाँ। `--remote` के साथ shorthand या full URL दें:

```bash
npx repomix --remote yamadashy/repomix
npx repomix --remote https://github.com/yamadashy/repomix
```

### कौन सा output format चुनना चाहिए?

अगर निश्चित न हों तो default XML से शुरू करें। Readable conversations के लिए Markdown, automation के लिए JSON और maximum compatibility के लिए plain text उपयोग करें।

```bash
repomix --style markdown
repomix --style json
```

देखें [Output Formats](/hi/guide/output)।

## Token usage कम करना

### Generated file बहुत बड़ी है। क्या करें?

Context को सीमित करें:

```bash
repomix --include "src/**/*.ts,docs/**/*.md"
repomix --ignore "**/*.test.ts,dist/**"
repomix --compress
repomix --remove-comments
```

बड़ी repositories में include/ignore patterns को code compression के साथ मिलाएँ।

### `--compress` क्या करता है?

`--compress` imports, exports, classes, functions और interfaces जैसी महत्वपूर्ण structure रखता है, लेकिन कई implementation details हटा देता है। यह architecture समझाने के लिए उपयोगी है।

## Security और privacy

### क्या CLI मेरा code upload करता है?

Repomix CLI local रूप से चलता है और output file आपकी machine पर लिखता है। Website और browser extension workflows अलग हैं; [Privacy Policy](/hi/guide/privacy) देखें।

### Repomix secrets को कैसे रोकता है?

Repomix Secretlint-based safety checks उपयोग करता है। इसे extra protection मानें और output हमेशा खुद review करें।

## समस्या निवारण

### Output में files क्यों missing हैं?

Repomix `.gitignore`, default ignore rules और custom patterns का पालन करता है। `repomix.config.json`, `--ignore` और git ignore rules जाँचें।

### Team के लिए repeatable output कैसे बनाएँ?

Shared configuration बनाएँ और commit करें:

```bash
repomix --init
```

## संबंधित संसाधन

- [बुनियादी उपयोग](/hi/guide/usage)
- [Command Line Options](/hi/guide/command-line-options)
- [Code Compression](/hi/guide/code-compress)
- [Security](/hi/guide/security)
