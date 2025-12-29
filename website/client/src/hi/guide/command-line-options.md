# कमांड लाइन विकल्प

## बुनियादी विकल्प
- `-v, --version`: टूल संस्करण दिखाएं

## CLI इनपुट/आउटपुट विकल्प
- `--verbose`: विस्तृत लॉगिंग सक्षम करें
- `--quiet`: Stdout पर सभी आउटपुट अक्षम करें
- `--stdout`: फ़ाइल में लिखने के बजाय stdout पर आउटपुट (`--output` विकल्प के साथ उपयोग नहीं किया जा सकता)
- `--stdin`: फ़ाइलों को स्वचालित रूप से खोजने के बजाय stdin से फ़ाइल पथ पढ़ें
- `--copy`: उत्पन्न आउटपुट को सिस्टम क्लिपबोर्ड में अतिरिक्त रूप से कॉपी करें
- `--token-count-tree [threshold]`: टोकन गिनती सारांश के साथ फ़ाइल ट्री प्रदर्शित करें (वैकल्पिक: न्यूनतम टोकन गिनती सीमा)। बड़ी फ़ाइलों की पहचान करने और AI संदर्भ सीमाओं के लिए टोकन उपयोग को अनुकूलित करने के लिए उपयोगी
- `--top-files-len <number>`: सारांश में दिखाने वाली सबसे बड़ी फ़ाइलों की संख्या (डिफ़ॉल्ट: 5, उदाहरण: --top-files-len 20)

## Repomix आउटपुट विकल्प
- `-o, --output <file>`: आउटपुट फ़ाइल पथ (डिफ़ॉल्ट: repomix-output.xml, stdout के लिए "-" का उपयोग करें)
- `--style <type>`: आउटपुट फ़ॉर्मेट: xml, markdown, json या plain (डिफ़ॉल्ट: xml)
- `--parsable-style`: चुनी गई स्टाइल स्कीमा के आधार पर पार्स करने योग्य आउटपुट सक्षम करें। ध्यान दें कि यह टोकन गिनती बढ़ा सकता है।
- `--compress`: टोकन गिनती कम करने के लिए आवश्यक फ़ंक्शन और क्लास हस्ताक्षरों पर ध्यान केंद्रित करते हुए बुद्धिमान कोड निष्कर्षण करें
- `--output-show-line-numbers`: आउटपुट में लाइन नंबर दिखाएं
- `--no-file-summary`: फ़ाइल सारांश अनुभाग आउटपुट अक्षम करें
- `--no-directory-structure`: डायरेक्टरी संरचना अनुभाग आउटपुट अक्षम करें
- `--no-files`: फ़ाइल सामग्री आउटपुट अक्षम करें (केवल मेटाडेटा मोड)
- `--remove-comments`: समर्थित फ़ाइल प्रकारों से टिप्पणियां हटाएं
- `--remove-empty-lines`: आउटपुट से खाली लाइनें हटाएं
- `--truncate-base64`: Base64 डेटा स्ट्रिंग्स की कटाई सक्षम करें
- `--header-text <text>`: फ़ाइल हेडर में शामिल करने के लिए कस्टम टेक्स्ट
- `--instruction-file-path <path>`: विस्तृत कस्टम निर्देश वाली फ़ाइल का पथ
- `--split-output <size>`: आउटपुट को कई नंबर वाली फ़ाइलों में विभाजित करें (जैसे repomix-output.1.xml, repomix-output.2.xml); उदाहरण के लिए, 500kb, 2mb, या 1.5mb
- `--include-empty-directories`: आउटपुट में खाली डायरेक्टरियां शामिल करें
- `--include-full-directory-structure`: --include पैटर्न का उपयोग करते समय भी डायरेक्टरी संरचना सेक्शन में संपूर्ण रिपॉजिटरी ट्री दिखाएं
- `--include-diffs`: आउटपुट में git diffs शामिल करें (कार्य ट्री और staged परिवर्तनों को अलग से शामिल करता है)
- `--include-logs`: आउटपुट में git logs शामिल करें (तारीखों, संदेशों और फ़ाइल पथों के साथ कमिट इतिहास शामिल करता है)
- `--include-logs-count <count>`: शामिल करने के लिए git log कमिट की संख्या (डिफ़ॉल्ट: 50)
- `--no-git-sort-by-changes`: Git परिवर्तन गिनती द्वारा फ़ाइल सॉर्टिंग अक्षम करें (डिफ़ॉल्ट रूप से सक्षम)

## फ़ाइल चयन विकल्प
- `--include <patterns>`: शामिल पैटर्न की सूची (कॉमा-अलग)
- `-i, --ignore <patterns>`: अतिरिक्त अनदेखा पैटर्न (कॉमा-अलग)
- `--no-gitignore`: .gitignore फ़ाइल उपयोग अक्षम करें
- `--no-dot-ignore`: .ignore फ़ाइल उपयोग अक्षम करें
- `--no-default-patterns`: डिफ़ॉल्ट पैटर्न अक्षम करें

## रिमोट रिपॉजिटरी विकल्प
- `--remote <url>`: रिमोट रिपॉजिटरी प्रोसेस करें
- `--remote-branch <name>`: रिमोट ब्रांच नाम, टैग, या कमिट हैश निर्दिष्ट करें (डिफ़ॉल्ट रिपॉजिटरी डिफ़ॉल्ट ब्रांच)

## कॉन्फ़िगरेशन विकल्प
- `-c, --config <path>`: कस्टम कॉन्फ़िगरेशन फ़ाइल पथ
- `--init`: कॉन्फ़िगरेशन फ़ाइल बनाएं
- `--global`: ग्लोबल कॉन्फ़िगरेशन उपयोग करें

## सुरक्षा विकल्प
- `--no-security-check`: API कीज़ और पासवर्ड जैसे संवेदनशील डेटा की स्कैनिंग छोड़ें

## टोकन गिनती विकल्प
- `--token-count-encoding <encoding>`: गिनती के लिए टोकनाइज़र मॉडल: o200k_base (GPT-4o), cl100k_base (GPT-3.5/4), आदि (डिफ़ॉल्ट: o200k_base)

## MCP विकल्प
- `--mcp`: AI टूल एकीकरण के लिए Model Context Protocol सर्वर के रूप में चलाएं

## उदाहरण

```bash
# बुनियादी उपयोग
repomix

# कस्टम आउटपुट फ़ाइल और फ़ॉर्मेट
repomix -o my-output.xml --style xml

# stdout पर आउटपुट
repomix --stdout > custom-output.txt

# stdout पर आउटपुट, फिर अन्य कमांड में pipe (उदाहरण, simonw/llm)
repomix --stdout | llm "कृपया समझाएं कि यह कोड क्या करता है।"

# संपीड़न के साथ कस्टम आउटपुट
repomix --compress

# पैटर्न के साथ विशिष्ट फ़ाइलों को प्रोसेस करना
repomix --include "src/**/*.ts,*.md" --ignore "*.test.js,docs/**"

# ब्रांच के साथ रिमोट रिपॉजिटरी
repomix --remote https://github.com/user/repo/tree/main

# कमिट के साथ रिमोट रिपॉजिटरी
repomix --remote https://github.com/user/repo/commit/836abcd7335137228ad77feb28655d85712680f1

# शॉर्टहैंड के साथ रिमोट रिपॉजिटरी
repomix --remote user/repo

# stdin का उपयोग करके फ़ाइल सूची
find src -name "*.ts" -type f | repomix --stdin
git ls-files "*.js" | repomix --stdin
echo -e "src/index.ts\nsrc/utils.ts" | repomix --stdin

# Git एकीकरण
repomix --include-diffs  # अप्रतिबद्ध परिवर्तनों के लिए git diffs शामिल करें
repomix --include-logs   # git logs शामिल करें (डिफ़ॉल्ट रूप से अंतिम 50 कमिट)
repomix --include-logs --include-logs-count 10  # अंतिम 10 कमिट शामिल करें
repomix --include-diffs --include-logs  # diffs और logs दोनों शामिल करें

# टोकन गिनती विश्लेषण
repomix --token-count-tree
repomix --token-count-tree 1000  # केवल 1000+ टोकन वाली फ़ाइलें/डायरेक्टरियां दिखाएं
```

