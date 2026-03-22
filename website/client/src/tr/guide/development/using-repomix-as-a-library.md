# Repomix'i Kütüphane Olarak Kullanma

Repomix'i yalnızca bir CLI aracı olarak kullanmakla kalmayıp, işlevselliğini doğrudan Node.js uygulamalarınıza da entegre edebilirsiniz.

## Kurulum

Repomix'i projenize bağımlılık olarak yükleyin:

```bash
npm install repomix
```

## Temel Kullanım

Repomix'i kullanmanın en basit yolu, komut satırı arayüzüyle aynı işlevselliği sunan `runCli` fonksiyonudur:

```javascript
import { runCli, type CliOptions } from 'repomix';

// Process current directory with custom options
async function packProject() {
  const options = {
    output: 'output.xml',
    style: 'xml',
    compress: true,
    quiet: true
  } as CliOptions;

  const result = await runCli(['.'], process.cwd(), options);
  return result.packResult;
}
```

`result.packResult`, işlenen dosyalar hakkında aşağıdaki bilgileri içerir:
- `totalFiles`: İşlenen dosya sayısı
- `totalCharacters`: Toplam karakter sayısı
- `totalTokens`: Toplam token sayısı (LLM bağlam sınırları için kullanışlıdır)
- `fileCharCounts`: Dosya başına karakter sayısı
- `fileTokenCounts`: Dosya başına token sayısı

## Uzak Depoları İşleme

Uzak bir depoyu klonlayıp işleyebilirsiniz:

```javascript
import { runCli, type CliOptions } from 'repomix';

// Clone and process a GitHub repo
async function processRemoteRepo(repoUrl) {
  const options = {
    remote: repoUrl,
    output: 'output.xml',
    compress: true
  } as CliOptions;

  return await runCli(['.'], process.cwd(), options);
}
```

> [!NOTE]
> Güvenlik nedeniyle, uzak depolardaki yapılandırma dosyaları varsayılan olarak yüklenmez. Uzak bir deponun yapılandırmasına güvenmek için seçeneklere `remoteTrustConfig: true` ekleyin veya `REPOMIX_REMOTE_TRUST_CONFIG=true` ortam değişkenini ayarlayın.

## Temel Bileşenleri Kullanma

Daha fazla kontrol için Repomix'in alt düzey API'lerini doğrudan kullanabilirsiniz:

```javascript
import { searchFiles, collectFiles, processFiles, TokenCounter } from 'repomix';

async function analyzeFiles(directory) {
  // Find and collect files
  const { filePaths } = await searchFiles(directory, { /* config */ });
  const rawFiles = await collectFiles(filePaths, directory);
  const processedFiles = await processFiles(rawFiles, { /* config */ });

  // Count tokens
  const tokenCounter = new TokenCounter('o200k_base');

  // Return analysis results
  return processedFiles.map(file => ({
    path: file.path,
    tokens: tokenCounter.countTokens(file.content)
  }));
}
```

## Paketleme

Repomix'i Rolldown veya esbuild gibi araçlarla paketlerken bazı bağımlılıkların harici kalması ve WASM dosyalarının kopyalanması gerekir:

**Harici bırakılması gereken bağımlılıklar (paketlenemez):**
- `tinypool` - Dosya yollarını kullanarak worker thread'leri başlatır
- `tiktoken` - Çalışma zamanında WASM dosyalarını dinamik olarak yükler

**Kopyalanması gereken WASM dosyaları:**
- `web-tree-sitter.wasm` → Paketlenmiş JS ile aynı dizine (kod sıkıştırma özelliği için gereklidir)
- Tree-sitter dil dosyaları → `REPOMIX_WASM_DIR` ortam değişkeniyle belirtilen dizine

Çalışan bir örnek için [website/server/scripts/bundle.mjs](https://github.com/yamadashy/repomix/blob/main/website/server/scripts/bundle.mjs) dosyasına bakın.

## Gerçek Dünya Örneği

Repomix web sitesi ([repomix.com](https://repomix.com)), uzak depoları işlemek için Repomix'i kütüphane olarak kullanmaktadır. Uygulamayı [website/server/src/remoteRepo.ts](https://github.com/yamadashy/repomix/blob/main/website/server/src/remoteRepo.ts) dosyasında inceleyebilirsiniz.
