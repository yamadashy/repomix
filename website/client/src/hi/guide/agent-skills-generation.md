# Agent Skills जनरेशन

Repomix [Claude Agent Skills](https://docs.anthropic.com/en/docs/claude-code/skills) फॉर्मेट में आउटपुट जनरेट कर सकता है, एक स्ट्रक्चर्ड Skills डायरेक्टरी बनाता है जिसे AI असिस्टेंट के लिए पुन: प्रयोज्य कोडबेस रेफरेंस के रूप में उपयोग किया जा सकता है।

यह फीचर विशेष रूप से शक्तिशाली है जब आप रिमोट रिपॉजिटरी से इम्प्लीमेंटेशन रेफर करना चाहते हैं। ओपन सोर्स प्रोजेक्ट्स से Skills जनरेट करके, आप आसानी से Claude से अपने कोड पर काम करते समय विशिष्ट पैटर्न या इम्प्लीमेंटेशन रेफर करने के लिए कह सकते हैं।

एक सिंगल पैक्ड फाइल जनरेट करने के बजाय, Skills जनरेशन AI समझ और grep-फ्रेंडली सर्चिंग के लिए ऑप्टिमाइज़ किए गए मल्टीपल रेफरेंस फाइलों के साथ एक स्ट्रक्चर्ड डायरेक्टरी बनाता है।

> [!NOTE]
> यह एक प्रयोगात्मक फीचर है। आउटपुट फॉर्मेट और ऑप्शन भविष्य के रिलीज में यूजर फीडबैक के आधार पर बदल सकते हैं।

## बेसिक उपयोग

अपनी लोकल डायरेक्टरी से Skills जनरेट करें:

```bash
# करंट डायरेक्टरी से Skills जनरेट करें
repomix --skill-generate

# कस्टम Skills नाम के साथ जनरेट करें
repomix --skill-generate my-project-reference

# विशिष्ट डायरेक्टरी से जनरेट करें
repomix path/to/directory --skill-generate

# रिमोट रिपॉजिटरी से जनरेट करें
repomix --remote https://github.com/user/repo --skill-generate
```

## Skills लोकेशन सिलेक्शन

जब आप कमांड चलाते हैं, Repomix आपको Skills को कहाँ सेव करना है चुनने के लिए कहता है:

1. **Personal Skills** (`~/.claude/skills/`) - आपकी मशीन पर सभी प्रोजेक्ट्स में उपलब्ध
2. **Project Skills** (`.claude/skills/`) - git के माध्यम से आपकी टीम के साथ शेयर

अगर Skills डायरेक्टरी पहले से मौजूद है, आपसे ओवरराइट करने की पुष्टि मांगी जाएगी।

> [!TIP]
> Project Skills जनरेट करते समय, बड़ी फाइलों को कमिट करने से बचने के लिए उन्हें `.gitignore` में जोड़ने पर विचार करें:
> ```gitignore
> .claude/skills/repomix-reference-*/
> ```

## जनरेटेड स्ट्रक्चर

Skills निम्नलिखित स्ट्रक्चर के साथ जनरेट होते हैं:

```text
.claude/skills/<skill-name>/
├── SKILL.md                    # मेन Skills मेटाडेटा और डॉक्यूमेंटेशन
└── references/
    ├── summary.md              # पर्पस, फॉर्मेट, और स्टैटिस्टिक्स
    ├── project-structure.md    # लाइन काउंट के साथ डायरेक्टरी ट्री
    ├── files.md                # सभी फाइल कंटेंट (grep-फ्रेंडली)
    └── tech-stack.md           # लैंग्वेजेस, फ्रेमवर्क्स, डिपेंडेंसीज
```

### फाइल डिस्क्रिप्शन

#### SKILL.md

मेन Skills फाइल में शामिल है:
- Skills नाम, डिस्क्रिप्शन, और प्रोजेक्ट इन्फो
- फाइल काउंट, लाइन काउंट, और टोकन काउंट
- Skills का उपयोग कैसे करें का ओवरव्यू
- फाइल लोकेशन और फॉर्मेट एक्सप्लेनेशन
- कॉमन यूज केसेस और टिप्स

#### references/summary.md

शामिल है:
- **पर्पस**: बताता है कि यह AI कंजम्पशन के लिए एक रेफरेंस कोडबेस है
- **फाइल स्ट्रक्चर**: प्रत्येक रेफरेंस फाइल में क्या है डॉक्यूमेंट करता है
- **उपयोग गाइडलाइंस**: Skills को प्रभावी ढंग से कैसे उपयोग करें
- **स्टैटिस्टिक्स**: फाइल टाइप, लैंग्वेज, और सबसे बड़ी फाइलों के अनुसार ब्रेकडाउन

#### references/project-structure.md

आसान फाइल डिस्कवरी के लिए प्रति फाइल लाइन काउंट के साथ डायरेक्टरी ट्री:

```text
src/
  index.ts (42 lines)
  utils/
    helpers.ts (128 lines)
    math.ts (87 lines)
```

#### references/files.md

सभी फाइल कंटेंट सिंटैक्स हाइलाइटिंग हेडर के साथ, grep-फ्रेंडली सर्चिंग के लिए ऑप्टिमाइज़:

````markdown
## File: src/index.ts
```typescript
import { sum } from './utils/helpers';

export function main() {
  console.log(sum(1, 2));
}
```
````

#### references/tech-stack.md

डिपेंडेंसी फाइलों से ऑटो-डिटेक्टेड टेक स्टैक:
- **लैंग्वेजेस**: TypeScript, JavaScript, Python, आदि
- **फ्रेमवर्क्स**: React, Next.js, Express, Django, आदि
- **रनटाइम वर्जन्स**: Node.js, Python, Go, आदि
- **पैकेज मैनेजर**: npm, pnpm, poetry, आदि
- **डिपेंडेंसीज**: सभी डायरेक्ट और dev डिपेंडेंसीज
- **कॉन्फिग फाइल्स**: सभी डिटेक्टेड कॉन्फिगरेशन फाइलें

इन फाइलों से डिटेक्ट: `package.json`, `requirements.txt`, `Cargo.toml`, `go.mod`, `.nvmrc`, `pyproject.toml`, आदि।

## ऑटो-जनरेटेड Skills नाम

अगर कोई नाम नहीं दिया जाता, Repomix इस पैटर्न का उपयोग करके ऑटो-जनरेट करता है:

```bash
repomix src/ --skill-generate                # → repomix-reference-src
repomix --remote user/repo --skill-generate  # → repomix-reference-repo
repomix --skill-generate CustomName          # → custom-name (kebab-case में नॉर्मलाइज़)
```

Skills नाम:
- kebab-case (लोअरकेस, हाइफन-सेपरेटेड) में कन्वर्ट
- अधिकतम 64 कैरेक्टर तक सीमित
- पाथ ट्रैवर्सल से प्रोटेक्टेड

## Repomix ऑप्शंस के साथ इंटीग्रेशन

Skills जनरेशन सभी स्टैंडर्ड Repomix ऑप्शंस का सम्मान करता है:

```bash
# फाइल फिल्टरिंग के साथ Skills जनरेट करें
repomix --skill-generate --include "src/**/*.ts" --ignore "**/*.test.ts"

# कम्प्रेशन के साथ Skills जनरेट करें
repomix --skill-generate --compress

# रिमोट रिपॉजिटरी से Skills जनरेट करें
repomix --remote yamadashy/repomix --skill-generate

# स्पेसिफिक आउटपुट फॉर्मेट ऑप्शंस के साथ Skills जनरेट करें
repomix --skill-generate --remove-comments --remove-empty-lines
```

### डॉक्यूमेंटेशन-ओनली Skills

`--include` का उपयोग करके, आप GitHub रिपॉजिटरी से केवल डॉक्यूमेंटेशन वाले Skills जनरेट कर सकते हैं। यह तब उपयोगी है जब आप चाहते हैं कि Claude आपके कोड पर काम करते समय स्पेसिफिक लाइब्रेरी या फ्रेमवर्क डॉक्यूमेंटेशन रेफर करे:

```bash
# Claude Code Action डॉक्यूमेंटेशन
repomix --remote https://github.com/anthropics/claude-code-action --include docs --skill-generate

# Vite डॉक्यूमेंटेशन
repomix --remote https://github.com/vitejs/vite --include docs --skill-generate

# React डॉक्यूमेंटेशन
repomix --remote https://github.com/reactjs/react.dev --include src/content --skill-generate
```

## सीमाएं

`--skill-generate` ऑप्शन इनके साथ उपयोग नहीं किया जा सकता:
- `--stdout` - Skills आउटपुट को फाइलसिस्टम में लिखना आवश्यक है
- `--copy` - Skills आउटपुट एक डायरेक्टरी है, क्लिपबोर्ड में कॉपी नहीं किया जा सकता

## जनरेटेड Skills का उपयोग

जनरेट होने के बाद, आप Claude के साथ Skills का उपयोग कर सकते हैं:

1. **Claude Code**: अगर `~/.claude/skills/` या `.claude/skills/` में सेव किया गया है तो Skills ऑटोमैटिकली उपलब्ध हैं
2. **Claude Web**: कोडबेस एनालिसिस के लिए Skills डायरेक्टरी को Claude पर अपलोड करें
3. **टीम शेयरिंग**: टीम-वाइड एक्सेस के लिए `.claude/skills/` को अपने रिपॉजिटरी में कमिट करें

## उदाहरण वर्कफ्लो

### पर्सनल रेफरेंस लाइब्रेरी बनाना

```bash
# एक इंटरेस्टिंग ओपन सोर्स प्रोजेक्ट क्लोन और एनालाइज़ करें
repomix --remote facebook/react --skill-generate react-reference

# Skills ~/.claude/skills/react-reference/ में सेव होते हैं
# अब आप किसी भी Claude कन्वर्सेशन में React का कोडबेस रेफर कर सकते हैं
```

### टीम प्रोजेक्ट डॉक्यूमेंटेशन

```bash
# अपनी प्रोजेक्ट डायरेक्टरी में
cd my-project

# अपनी टीम के लिए Skills जनरेट करें
repomix --skill-generate

# प्रॉम्प्ट होने पर "Project Skills" चुनें
# Skills .claude/skills/repomix-reference-my-project/ में सेव होते हैं

# कमिट करें और अपनी टीम के साथ शेयर करें
git add .claude/skills/
git commit -m "Add codebase reference Skills"
```

## संबंधित रिसोर्सेज

- [Claude Code Plugins](/hi/guide/claude-code-plugins) - Claude Code के लिए Repomix प्लगइन्स के बारे में जानें
- [MCP Server](/hi/guide/mcp-server) - वैकल्पिक इंटीग्रेशन मेथड
- [कोड कम्प्रेशन](/hi/guide/code-compress) - कम्प्रेशन के साथ टोकन काउंट कम करें
- [कॉन्फिगरेशन](/hi/guide/configuration) - Repomix बिहेवियर कस्टमाइज़ करें
