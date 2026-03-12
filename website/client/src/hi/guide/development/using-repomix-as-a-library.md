# Repomix को लाइब्रेरी के रूप में उपयोग करना

Repomix को एक स्टैंडअलोन CLI टूल के रूप में उपयोग करने के अलावा, आप इसे अपने JavaScript या TypeScript प्रोजेक्ट में एक लाइब्रेरी के रूप में भी उपयोग कर सकते हैं।

## इंस्टॉलेशन

अपने प्रोजेक्ट में Repomix को लाइब्रेरी के रूप में इंस्टॉल करें:

```bash
# npm के साथ
npm install repomix

# yarn के साथ
yarn add repomix

# pnpm के साथ
pnpm add repomix
```

## बुनियादी उपयोग

Repomix को अपने कोड में इम्पोर्ट करें और उपयोग करें:

```typescript
import { processRepository } from 'repomix';

async function main() {
  const result = await processRepository({
    path: './path/to/repository',
    outputStyle: 'xml',
    outputFile: 'output.xml',
  });

  console.log(`Processed ${result.fileCount} files with ${result.tokenCount} tokens`);
}

main().catch(console.error);
```

## विकल्प

Repomix API निम्नलिखित विकल्पों का समर्थन करता है:

```typescript
interface RepomixOptions {
  // रिपॉजिटरी पथ या URL
  path?: string;
  remote?: string;
  remoteBranch?: string;

  // आउटपुट विकल्प
  outputStyle?: 'xml' | 'markdown' | 'plain';
  outputFile?: string;

  // फिल्टरिंग विकल्प
  include?: string | string[];
  ignore?: string | string[];

  // प्रोसेसिंग विकल्प
  removeComments?: boolean;
  compress?: boolean;

  // सुरक्षा विकल्प
  securityCheck?: boolean;

  // टोकन काउंटिंग विकल्प
  tokenCounter?: 'gpt-4' | 'gpt-3.5-turbo' | 'claude' | 'llama' | 'gemini';
}
```

## उदाहरण

### लोकल रिपॉजिटरी प्रोसेसिंग

```typescript
import { processRepository } from 'repomix';

async function processLocalRepo() {
  const result = await processRepository({
    path: './my-project',
    outputStyle: 'markdown',
    outputFile: 'output.md',
    include: ['src/**/*.ts', 'docs/**/*.md'],
    ignore: ['**/*.test.ts', '**/node_modules/**'],
    removeComments: true,
    compress: true,
  });

  return result;
}
```

### रिमोट रिपॉजिटरी प्रोसेसिंग

```typescript
import { processRepository } from 'repomix';

async function processRemoteRepo() {
  const result = await processRepository({
    remote: 'https://github.com/user/repo',
    remoteBranch: 'main',
    outputStyle: 'xml',
    outputFile: 'output.xml',
  });

  return result;
}
```

### आउटपुट स्ट्रिंग के रूप में प्राप्त करना

```typescript
import { processRepository } from 'repomix';

async function getOutputAsString() {
  const result = await processRepository({
    path: './my-project',
    outputStyle: 'markdown',
    // outputFile को छोड़ दें
  });

  // आउटपुट स्ट्रिंग के रूप में वापस आता है
  console.log(result.output);
  
  return result.output;
}
```

## एडवांस्ड उपयोग

### कस्टम टोकन काउंटर

```typescript
import { processRepository, createTokenCounter } from 'repomix';

async function useCustomTokenCounter() {
  // कस्टम टोकन काउंटर फंक्शन
  const myTokenCounter = createTokenCounter('gpt-4');
  
  const result = await processRepository({
    path: './my-project',
    tokenCounter: myTokenCounter,
  });
  
  console.log(`Total tokens: ${result.tokenCount}`);
}
```

### प्रोग्रेस कॉलबैक

```typescript
import { processRepository } from 'repomix';

async function withProgressCallback() {
  const result = await processRepository({
    path: './my-project',
    onProgress: (info) => {
      console.log(`Processing: ${info.currentFile} (${info.processedFiles}/${info.totalFiles})`);
    },
  });
  
  return result;
}
```

### एरर हैंडलिंग

```typescript
import { processRepository } from 'repomix';

async function withErrorHandling() {
  try {
    const result = await processRepository({
      path: './non-existent-path',
    });
    
    return result;
  } catch (error) {
    console.error('Repomix प्रोसेसिंग एरर:', error.message);
    // एरर हैंडलिंग लॉजिक
  }
}
```

## वेब एप्लिकेशन में उपयोग

Repomix को वेब एप्लिकेशन में भी उपयोग किया जा सकता है, लेकिन कुछ सीमाएं हैं:

```typescript
import { processContent } from 'repomix';

async function processInBrowser() {
  // फाइल कंटेंट का एक ऑब्जेक्ट
  const files = {
    'src/index.ts': 'console.log("Hello, world!");',
    'README.md': '# My Project\n\nThis is a sample project.',
  };
  
  const result = await processContent({
    files,
    outputStyle: 'markdown',
  });
  
  return result.output;
}
```

## बंडलिंग

Rolldown या esbuild जैसे टूल्स के साथ repomix को बंडल करते समय, कुछ डिपेंडेंसी को external रखना होगा और WASM फाइलों को कॉपी करना होगा:

**External डिपेंडेंसी (बंडल नहीं की जा सकती):**
- `tinypool` - फाइल पाथ का उपयोग करके वर्कर थ्रेड्स स्पॉन करता है
- `tiktoken` - रनटाइम पर WASM फाइलें डायनामिकली लोड करता है

**कॉपी करने के लिए WASM फाइलें:**
- `web-tree-sitter.wasm` → बंडल किए गए JS के समान डायरेक्टरी (कोड कंप्रेशन फीचर के लिए आवश्यक)
- Tree-sitter लैंग्वेज फाइलें → `REPOMIX_WASM_DIR` एनवायरनमेंट वेरिएबल द्वारा निर्दिष्ट डायरेक्टरी

एक कार्यशील उदाहरण के लिए, [website/server/scripts/bundle.mjs](https://github.com/yamadashy/repomix/blob/main/website/server/scripts/bundle.mjs) देखें।

## अगला क्या है?

- [विकास गाइड](index.md) पढ़ें
- [AI-सहायक विकास टिप्स](../tips/best-practices.md) का अन्वेषण करें
- [कमांड लाइन विकल्पों](../command-line-options.md) के बारे में अधिक जानें
