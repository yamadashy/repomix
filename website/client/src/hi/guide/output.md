# आउटपुट फॉर्मेट

Repomix चार आउटपुट फॉर्मेट का समर्थन करता है:
- XML (डिफ़ॉल्ट)
- मार्कडाउन
- JSON
- प्लेन टेक्स्ट

## XML फॉर्मेट

```bash
repomix --style xml
```

XML फॉर्मेट AI प्रसंस्करण के लिए अनुकूलित है:

```xml
यह फ़ाइल संपूर्ण कोडबेस का मर्ज किया गया प्रतिनिधित्व है...

<file_summary>
(मेटाडेटा और AI निर्देश)
</file_summary>

<directory_structure>
src/
  index.ts
  utils/
    helper.ts
</directory_structure>

<files>
<file path="src/index.ts">
// फ़ाइल सामग्री यहाँ
</file>
</files>

<git_logs>
<git_log_commit>
<date>2025-08-20 00:47:19 +0900</date>
<message>feat(cli): Add --include-logs option for git commit history</message>
<files>
README.md
src/cli/cliRun.ts
src/core/git/gitCommand.ts
src/core/git/gitLogHandle.ts
src/core/output/outputGenerate.ts
</files>
</git_log_commit>

<git_log_commit>
<date>2025-08-21 00:09:43 +0900</date>
<message>Merge pull request #795 from yamadashy/chore/ratchet-update-ci</message>
<files>
.github/workflows/ratchet-update.yml
</files>
</git_log_commit>
</git_logs>
```

### XML को डिफ़ॉल्ट फॉर्मेट के रूप में क्यों?

Repomix व्यापक अनुसंधान और परीक्षण के आधार पर XML को डिफ़ॉल्ट आउटपुट फॉर्मेट के रूप में उपयोग करता है। यह निर्णय अनुभवजन्य साक्ष्य और AI-सहायता प्राप्त कोड विश्लेषण के व्यावहारिक विचारों पर आधारित है।

XML का हमारा चुनाव मुख्य रूप से प्रमुख AI प्रदाताओं की आधिकारिक सिफारिशों से प्रभावित है:
- **Anthropic (Claude)**: प्रॉम्प्ट को संरचित करने के लिए XML टैग के उपयोग की स्पष्ट रूप से सिफारिश करता है, यह कहते हुए कि "Claude को प्रशिक्षण के दौरान ऐसे प्रॉम्प्ट का सामना हुआ था" ([दस्तावेज़](https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/use-xml-tags))
- **Google (Gemini)**: जटिल कार्यों के लिए XML सहित संरचित फॉर्मेट की सिफारिश करता है ([दस्तावेज़](https://cloud.google.com/vertex-ai/generative-ai/docs/learn/prompts/structure-prompts))
- **OpenAI (GPT)**: जटिल परिदृश्यों में संरचित प्रॉम्प्टिंग की वकालत करता है ([घोषणा](https://x.com/OpenAIDevs/status/1890147300493914437), [cookbook](https://cookbook.openai.com/examples/gpt-5/gpt-5_prompting_guide))

## मार्कडाउन फॉर्मेट

```bash
repomix --style markdown
```

मार्कडाउन पठनीय फॉर्मेटिंग प्रदान करता है:

````markdown
यह फ़ाइल संपूर्ण कोडबेस का मर्ज किया गया प्रतिनिधित्व है...

# फ़ाइल सारांश
(मेटाडेटा और AI निर्देश)

# डायरेक्टरी संरचना
```
src/
index.ts
utils/
helper.ts
```

# फ़ाइलें

## फ़ाइल: src/index.ts
```typescript
// फ़ाइल सामग्री यहाँ
```

# Git Logs
```
2025-08-20 00:47:19 +0900|feat(cli): Add --include-logs option for git commit history
README.md
src/cli/cliRun.ts
src/core/git/gitCommand.ts
src/core/git/gitLogHandle.ts
src/core/output/outputGenerate.ts

2025-08-21 00:09:43 +0900|Merge pull request #795 from yamadashy/chore/ratchet-update-ci
.github/workflows/ratchet-update.yml
```
````

## JSON फॉर्मेट

```bash
repomix --style json
```

JSON फॉर्मेट camelCase प्रॉपर्टी नामों के साथ संरचित, प्रोग्रामेटिक रूप से सुलभ आउटपुट प्रदान करता है:

```json
{
  "fileSummary": {
    "generationHeader": "यह फ़ाइल संपूर्ण कोडबेस का मर्ज किया गया प्रतिनिधित्व है, जो Repomix द्वारा एक एकल दस्तावेज़ में संयोजित की गई है।",
    "purpose": "इस फ़ाइल में संपूर्ण रिपॉज़िटरी सामग्री का पैक किया गया प्रतिनिधित्व शामिल है...",
    "fileFormat": "सामग्री इस प्रकार व्यवस्थित है...",
    "usageGuidelines": "- इस फ़ाइल को केवल-पढ़ने के रूप में माना जाना चाहिए...",
    "notes": "- कुछ फ़ाइलें .gitignore नियमों के आधार पर बाहर रखी गई हो सकती हैं..."
  },
  "userProvidedHeader": "निर्दिष्ट होने पर कस्टम हेडर टेक्स्ट",
  "directoryStructure": "src/
  cli/
    cliOutput.ts
    index.ts
  config/
    configLoader.ts",
  "files": {
    "src/index.js": "// फ़ाइल सामग्री यहाँ",
    "src/utils.js": "// फ़ाइल सामग्री यहाँ"
  },
  "instruction": "instructionFilePath से कस्टम निर्देश"
}
```

### JSON फॉर्मेट के फायदे

JSON फॉर्मेट इसके लिए आदर्श है:
- **प्रोग्रामेटिक प्रोसेसिंग**: किसी भी प्रोग्रामिंग भाषा में JSON लाइब्रेरीज़ के साथ आसानी से पार्स और मैनिपुलेट करना
- **API एकीकरण**: वेब सेवाओं और एप्लिकेशन द्वारा प्रत्यक्ष उपभोग
- **AI टूल संगतता**: मशीन लर्निंग और AI सिस्टम के लिए अनुकूलित संरचित फॉर्मेट
- **डेटा विश्लेषण**: `jq` जैसे टूल का उपयोग करके विशिष्ट जानकारी का सीधा निकालना

### `jq` का उपयोग करके JSON आउटपुट के साथ काम करना

JSON फॉर्मेट विशिष्ट जानकारी को प्रोग्रामेटिक रूप से निकालना आसान बनाता है। यहाँ सामान्य उदाहरण हैं:

#### बुनियादी फ़ाइल ऑपरेशन
```bash
# सभी फ़ाइल पाथ सूचीबद्ध करें
cat repomix-output.json | jq -r '.files | keys[]'

# कुल फ़ाइलों की संख्या गिनें
cat repomix-output.json | jq '.files | keys | length'

# विशिष्ट फ़ाइल सामग्री निकालें
cat repomix-output.json | jq -r '.files["README.md"]'
cat repomix-output.json | jq -r '.files["src/index.js"]'
```

#### फ़ाइल फ़िल्टरिंग और विश्लेषण
```bash
# एक्सटेंशन के आधार पर फ़ाइलें खोजें
cat repomix-output.json | jq -r '.files | keys[] | select(endswith(".ts"))'
cat repomix-output.json | jq -r '.files | keys[] | select(endswith(".js") or endswith(".ts"))'

# विशिष्ट टेक्स्ट युक्त फ़ाइलें प्राप्त करें
cat repomix-output.json | jq -r '.files | to_entries[] | select(.value | contains("function")) | .key'

# कैरेक्टर काउंट के साथ फ़ाइल सूची बनाएं
cat repomix-output.json | jq -r '.files | to_entries[] | "\(.key): \(.value | length) कैरेक्टर"'
```

#### मेटाडेटा निकालना
```bash
# डायरेक्टरी संरचना निकालें
cat repomix-output.json | jq -r '.directoryStructure'

# फ़ाइल सारांश जानकारी प्राप्त करें
cat repomix-output.json | jq '.fileSummary.purpose'
cat repomix-output.json | jq -r '.fileSummary.generationHeader'

# उपयोगकर्ता प्रदान किया गया हेडर निकालें (यदि मौजूद है)
cat repomix-output.json | jq -r '.userProvidedHeader // "कोई हेडर प्रदान नहीं किया गया"'

# कस्टम निर्देश प्राप्त करें
cat repomix-output.json | jq -r '.instruction // "कोई निर्देश प्रदान नहीं किए गए"'
```

#### उन्नत विश्लेषण
```bash
# सामग्री लंबाई के अनुसार सबसे बड़ी फ़ाइलें खोजें
cat repomix-output.json | jq -r '.files | to_entries[] | [.key, (.value | length)] | @tsv' | sort -k2 -nr | head -10

# विशिष्ट पैटर्न युक्त फ़ाइलें खोजें
cat repomix-output.json | jq -r '.files | to_entries[] | select(.value | test("import.*react"; "i")) | .key'

# कई एक्सटेंशन से मेल खाते फ़ाइल पाथ निकालें
cat repomix-output.json | jq -r '.files | keys[] | select(test("\.(js|ts|jsx|tsx)$"))'
```

## प्लेन टेक्स्ट फॉर्मेट

```bash
repomix --style plain
```

आउटपुट संरचना:
```text
यह फ़ाइल संपूर्ण कोडबेस का मर्ज किया गया प्रतिनिधित्व है...

================
फ़ाइल सारांश
================
(मेटाडेटा और AI निर्देश)

================
डायरेक्टरी संरचना
================
src/
  index.ts
  utils/
    helper.ts

================
फ़ाइलें
================

================
फ़ाइल: src/index.ts
================
// फ़ाइल सामग्री यहाँ

================
Git Logs
================
2025-08-20 00:47:19 +0900|feat(cli): Add --include-logs option for git commit history
README.md
src/cli/cliRun.ts
src/core/git/gitCommand.ts
src/core/git/gitLogHandle.ts
src/core/output/outputGenerate.ts

2025-08-21 00:09:43 +0900|Merge pull request #795 from yamadashy/chore/ratchet-update-ci
.github/workflows/ratchet-update.yml
```

## AI मॉडल के साथ उपयोग

प्रत्येक फॉर्मेट AI मॉडल के साथ अच्छी तरह से काम करता है, लेकिन विचार करें:
- Claude के लिए XML का उपयोग करें (सर्वोत्तम पार्सिंग सटीकता)
- सामान्य पठनीयता के लिए मार्कडाउन का उपयोग करें
- प्रोग्रामेटिक प्रोसेसिंग और API एकीकरण के लिए JSON का उपयोग करें
- सादगी और सार्वभौमिक संगतता के लिए प्लेन टेक्स्ट का उपयोग करें

## अनुकूलन

`repomix.config.json` में डिफ़ॉल्ट फॉर्मेट सेट करें:
```json
{
  "output": {
    "style": "xml",
    "filePath": "output.xml"
  }
}
```

## संबंधित संसाधन

- [कॉन्फिगरेशन](/hi/guide/configuration) - पूर्ण कॉन्फिगरेशन विकल्प संदर्भ
- [कमांड लाइन विकल्प](/hi/guide/command-line-options) - आउटपुट फॉर्मेट सेट करने के लिए `--style` का उपयोग करें
- [कोड कम्प्रेशन](/hi/guide/code-compress) - संरचना संरक्षित करते हुए टोकन संख्या कम करें
- [प्रॉम्प्ट उदाहरण](/hi/guide/prompt-examples) - विभिन्न AI मॉडल के साथ आउटपुट उपयोग करने के टिप्स
