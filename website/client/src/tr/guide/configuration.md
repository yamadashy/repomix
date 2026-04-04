# Yapılandırma

Repomix, bir yapılandırma dosyası veya komut satırı seçenekleri kullanılarak yapılandırılabilir. Yapılandırma dosyası, Repomix'in kod tabanınızı işleme ve çıktı alma biçiminin çeşitli yönlerini özelleştirmenize olanak tanır.

## Yapılandırma Dosyası Formatları

Repomix, esneklik ve kullanım kolaylığı için birden fazla yapılandırma dosyası formatını destekler.

Repomix, yapılandırma dosyalarını otomatik olarak aşağıdaki öncelik sırasına göre arar:

1. **TypeScript** (`repomix.config.ts`, `repomix.config.mts`, `repomix.config.cts`)
2. **JavaScript/ES Modülü** (`repomix.config.js`, `repomix.config.mjs`, `repomix.config.cjs`)
3. **JSON** (`repomix.config.json5`, `repomix.config.jsonc`, `repomix.config.json`)

### JSON Yapılandırması

Proje dizininizde bir yapılandırma dosyası oluşturun:
```bash
repomix --init
```

Bu komut, varsayılan ayarlarla bir `repomix.config.json` dosyası oluşturur. Yerel yapılandırma bulunamadığında yedek olarak kullanılacak global bir yapılandırma dosyası da oluşturabilirsiniz:

```bash
repomix --init --global
```

### TypeScript Yapılandırması

TypeScript yapılandırma dosyaları, tam tür denetimi ve IDE desteğiyle en iyi geliştirici deneyimini sunar.

**Kurulum:**

TypeScript veya JavaScript yapılandırmasını `defineConfig` ile kullanmak için Repomix'i geliştirme bağımlılığı olarak yüklemeniz gerekir:

```bash
npm install -D repomix
```

**Örnek:**

```typescript
// repomix.config.ts
import { defineConfig } from 'repomix';

export default defineConfig({
  output: {
    filePath: 'output.xml',
    style: 'xml',
    removeComments: true,
  },
  ignore: {
    customPatterns: ['**/node_modules/**', '**/dist/**'],
  },
});
```

**Avantajlar:**
- IDE'nizde tam TypeScript tür denetimi
- Mükemmel IDE otomatik tamamlama ve IntelliSense
- Dinamik değerler kullanabilme (zaman damgaları, ortam değişkenleri vb.)

**Dinamik Değer Örneği:**

```typescript
// repomix.config.ts
import { defineConfig } from 'repomix';

// Generate timestamp-based filename
const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');

export default defineConfig({
  output: {
    filePath: `output-${timestamp}.xml`,
    style: 'xml',
  },
});
```

### JavaScript Yapılandırması

JavaScript yapılandırma dosyaları, `defineConfig` ve dinamik değerleri destekleyerek TypeScript ile aynı şekilde çalışır.

## Yapılandırma Seçenekleri

| Seçenek                          | Açıklama                                                                                                                     | Varsayılan             |
|----------------------------------|------------------------------------------------------------------------------------------------------------------------------|------------------------|
| `input.maxFileSize`              | İşlenecek maksimum dosya boyutu (bayt). Bu boyutu aşan dosyalar atlanır. Büyük ikili dosyaları veya veri dosyalarını hariç tutmak için kullanışlıdır | `50000000`            |
| `output.filePath`                | Çıktı dosyasının adı. XML, Markdown ve düz metin formatlarını destekler                                                     | `"repomix-output.xml"` |
| `output.style`                   | Çıktının stili (`xml`, `markdown`, `json`, `plain`). Her formatın farklı AI araçları için kendine özgü avantajları vardır   | `"xml"`                |
| `output.parsableStyle`           | Çıktının seçilen stil şemasına göre kaçış karakteriyle işlenip işlenmeyeceği. Daha iyi ayrıştırma sağlar ancak token sayısını artırabilir | `false`                |
| `output.compress`                | Token sayısını azaltırken yapıyı korumak amacıyla Tree-sitter kullanarak akıllı kod çıkarma yapılıp yapılmayacağı            | `false`                |
| `output.headerText`              | Dosya başlığına dahil edilecek özel metin. AI araçları için bağlam veya talimat sağlamak için kullanışlıdır                  | `null`                 |
| `output.instructionFilePath`     | AI işleme için ayrıntılı özel talimatlar içeren dosyanın yolu                                                               | `null`                 |
| `output.fileSummary`             | Başlangıçta dosya sayıları, boyutları ve diğer metrikleri gösteren özet bölümünün dahil edilip edilmeyeceği                 | `true`                 |
| `output.directoryStructure`      | Çıktıya dizin yapısının dahil edilip edilmeyeceği. AI'ın proje organizasyonunu anlamasına yardımcı olur                     | `true`                 |
| `output.files`                   | Çıktıya dosya içeriklerinin dahil edilip edilmeyeceği. Yalnızca yapı ve meta veri dahil etmek için false olarak ayarlayın   | `true`                 |
| `output.removeComments`          | Desteklenen dosya türlerinden yorumların kaldırılıp kaldırılmayacağı. Gürültüyü ve token sayısını azaltabilir               | `false`                |
| `output.removeEmptyLines`        | Token sayısını azaltmak için çıktıdan boş satırların kaldırılıp kaldırılmayacağı                                            | `false`                |
| `output.showLineNumbers`         | Her satıra satır numarası eklenip eklenmeyeceği. Kodun belirli bölümlerine atıfta bulunmak için kullanışlıdır               | `false`                |
| `output.truncateBase64`          | Token sayısını azaltmak için uzun base64 veri dizelerinin (örn. görseller) kırpılıp kırpılmayacağı                          | `false`                |
| `output.copyToClipboard`         | Dosyayı kaydetmeye ek olarak çıktının sistem panosuna kopyalanıp kopyalanmayacağı                                           | `false`                |
| `output.splitOutput`             | Çıktıyı parça başına maksimum boyuta göre numaralı birden fazla dosyaya böl (örn. yaklaşık 1MB için `1000000`). CLI, `500kb` veya `2mb` gibi insan tarafından okunabilir boyutları kabul eder. Her dosyayı sınırın altında tutar ve dosyaların parçalar arasında bölünmesini önler | Ayarlanmamış           |
| `output.topFilesLength`          | Özette gösterilecek en iyi dosya sayısı. 0 olarak ayarlanırsa özet gösterilmez                                              | `5`                    |
| `output.includeEmptyDirectories` | Depo yapısına boş dizinlerin dahil edilip edilmeyeceği                                                                      | `false`                |
| `output.includeFullDirectoryStructure` | `include` kalıpları kullanılırken yalnızca dahil edilen dosyaları işlerken tam dizin ağacının (yoksayma kalıplarına uyarak) görüntülenip görüntülenmeyeceği. AI analizi için tam depo bağlamı sağlar | `false`                |
| `output.git.sortByChanges`       | Dosyaların git değişiklik sayısına göre sıralanıp sıralanmayacağı. Daha fazla değişikliğe sahip dosyalar altta görünür      | `true`                 |
| `output.git.sortByChangesMaxCommits` | Git değişiklikleri için analiz edilecek maksimum commit sayısı. Performans için geçmiş derinliğini sınırlar            | `100`                  |
| `output.git.includeDiffs`        | Git farklarının çıktıya dahil edilip edilmeyeceği. Hem çalışma ağacını hem de aşamalı değişiklikleri ayrı ayrı gösterir    | `false`                |
| `output.git.includeLogs`         | Git günlüklerinin çıktıya dahil edilip edilmeyeceği. Tarihler, mesajlar ve dosya yollarıyla commit geçmişini gösterir      | `false`                |
| `output.git.includeLogsCount`    | Çıktıya dahil edilecek git günlüğü commit sayısı                                                                            | `50`                   |
| `include`                        | [Glob kalıpları](https://github.com/mrmlnc/fast-glob?tab=readme-ov-file#pattern-syntax) kullanılarak dahil edilecek dosya kalıpları | `[]`                   |
| `ignore.useGitignore`            | Projenin `.gitignore` dosyasındaki kalıpların kullanılıp kullanılmayacağı                                                   | `true`                 |
| `ignore.useDotIgnore`            | Projenin `.ignore` dosyasındaki kalıpların kullanılıp kullanılmayacağı                                                      | `true`                 |
| `ignore.useDefaultPatterns`      | Varsayılan yoksayma kalıplarının kullanılıp kullanılmayacağı (node_modules, .git vb.)                                       | `true`                 |
| `ignore.customPatterns`          | [Glob kalıpları](https://github.com/mrmlnc/fast-glob?tab=readme-ov-file#pattern-syntax) kullanılarak yoksayılacak ek kalıplar | `[]`                   |
| `security.enableSecurityCheck`   | Hassas bilgileri tespit etmek için Secretlint kullanılarak güvenlik kontrollerinin yapılıp yapılmayacağı                    | `true`                 |
| `tokenCount.encoding`            | OpenAI'ın [tiktoken](https://github.com/openai/tiktoken) tokenleştiricisi tarafından kullanılan token sayımı kodlaması. GPT-4o için `o200k_base`, GPT-4/3.5 için `cl100k_base` kullanın. Ayrıntılar için [tiktoken model.py](https://github.com/openai/tiktoken/blob/main/tiktoken/model.py#L24) sayfasına bakın. | `"o200k_base"`         |

Yapılandırma dosyası [JSON5](https://json5.org/) sözdizimini destekler; bu şunlara olanak tanır:
- Yorumlar (hem tek satırlı hem de çok satırlı)
- Nesnelerde ve dizilerde sondaki virgüller
- Tırnaksız özellik adları
- Daha esnek dize sözdizimi

## Şema Doğrulaması

`$schema` özelliğini ekleyerek yapılandırma dosyanız için şema doğrulamasını etkinleştirebilirsiniz:

```json
{
  "$schema": "https://repomix.com/schemas/latest/schema.json",
  "output": {
    "filePath": "repomix-output.xml",
    "style": "xml"
  }
}
```

Bu, JSON şemasını destekleyen editörlerde otomatik tamamlama ve doğrulama sağlar.

## Örnek Yapılandırma Dosyası

Eksiksiz bir yapılandırma dosyası örneği (`repomix.config.json`):

```json
{
  "$schema": "https://repomix.com/schemas/latest/schema.json",
  "input": {
    "maxFileSize": 50000000
  },
  "output": {
    "filePath": "repomix-output.xml",
    "style": "xml",
    "parsableStyle": false,
    "compress": false,
    "headerText": "Custom header information for the packed file.",
    "fileSummary": true,
    "directoryStructure": true,
    "files": true,
    "removeComments": false,
    "removeEmptyLines": false,
    "topFilesLength": 5,
    "showLineNumbers": false,
    "truncateBase64": false,
    "copyToClipboard": false,
    "includeEmptyDirectories": false,
    "git": {
      "sortByChanges": true,
      "sortByChangesMaxCommits": 100,
      "includeDiffs": false,
      "includeLogs": false,
      "includeLogsCount": 50
    }
  },
  "include": ["**/*"],
  "ignore": {
    "useGitignore": true,
    "useDefaultPatterns": true,
    // Patterns can also be specified in .repomixignore
    "customPatterns": [
      "additional-folder",
      "**/*.log"
    ],
  },
  "security": {
    "enableSecurityCheck": true
  },
  "tokenCount": {
    "encoding": "o200k_base"
  }
}
```

## Yapılandırma Dosyası Konumları

Repomix, yapılandırma dosyalarını aşağıdaki sırayla arar:
1. Geçerli dizindeki yerel yapılandırma dosyası (öncelik sırası: TS > JS > JSON)
   - TypeScript: `repomix.config.ts`, `repomix.config.mts`, `repomix.config.cts`
   - JavaScript: `repomix.config.js`, `repomix.config.mjs`, `repomix.config.cjs`
   - JSON: `repomix.config.json5`, `repomix.config.jsonc`, `repomix.config.json`
2. Global yapılandırma dosyası (öncelik sırası: TS > JS > JSON)
   - Windows:
     - TypeScript: `%LOCALAPPDATA%\Repomix\repomix.config.ts`, `.mts`, `.cts`
     - JavaScript: `%LOCALAPPDATA%\Repomix\repomix.config.js`, `.mjs`, `.cjs`
     - JSON: `%LOCALAPPDATA%\Repomix\repomix.config.json5`, `.jsonc`, `.json`
   - macOS/Linux:
     - TypeScript: `~/.config/repomix/repomix.config.ts`, `.mts`, `.cts`
     - JavaScript: `~/.config/repomix/repomix.config.js`, `.mjs`, `.cjs`
     - JSON: `~/.config/repomix/repomix.config.json5`, `.jsonc`, `.json`

Komut satırı seçenekleri, yapılandırma dosyası ayarlarından önce gelir.

## Dahil Etme Kalıpları

Repomix, [glob kalıpları](https://github.com/mrmlnc/fast-glob?tab=readme-ov-file#pattern-syntax) kullanılarak dahil edilecek dosyaların belirtilmesini destekler. Bu, daha esnek ve güçlü dosya seçimi sağlar:

- Herhangi bir dizindeki tüm JavaScript dosyalarını dahil etmek için `**/*.js` kullanın
- `src` dizini ve alt dizinlerindeki tüm dosyaları dahil etmek için `src/**/*` kullanın
- `src`'deki JavaScript dosyalarını ve tüm Markdown dosyalarını dahil etmek için `["src/**/*.js", "**/*.md"]` gibi birden fazla kalıbı birleştirin

Yapılandırma dosyanızda dahil etme kalıplarını belirtebilirsiniz:

```json
{
  "include": ["src/**/*", "tests/**/*.test.js"]
}
```

Ya da tek seferlik filtreleme için `--include` komut satırı seçeneğini kullanın.

## Yoksayma Kalıpları

Repomix, paketleme işlemi sırasında belirli dosyaları veya dizinleri hariç tutmak için yoksayma kalıpları belirlemeye yönelik birden fazla yöntem sunar:

- **.gitignore**: Varsayılan olarak, projenizin `.gitignore` dosyalarında ve `.git/info/exclude` içinde listelenen kalıplar kullanılır. Bu davranış `ignore.useGitignore` ayarı veya `--no-gitignore` CLI seçeneğiyle kontrol edilebilir.
- **.ignore**: Proje kökünüzde `.gitignore` ile aynı formatta bir `.ignore` dosyası kullanabilirsiniz. Bu dosya, ripgrep ve silver searcher gibi araçlar tarafından dikkate alınır ve birden fazla yoksayma dosyasını yönetme ihtiyacını azaltır. Bu davranış `ignore.useDotIgnore` ayarı veya `--no-dot-ignore` CLI seçeneğiyle kontrol edilebilir.
- **Varsayılan kalıplar**: Repomix, yaygın olarak hariç tutulan dosya ve dizinlerin (örn. node_modules, .git, ikili dosyalar) varsayılan bir listesini içerir. Bu özellik `ignore.useDefaultPatterns` ayarı veya `--no-default-patterns` CLI seçeneğiyle kontrol edilebilir. Daha fazla ayrıntı için [defaultIgnore.ts](https://github.com/yamadashy/repomix/blob/main/src/config/defaultIgnore.ts) dosyasına bakın.
- **.repomixignore**: Repomix'e özgü yoksayma kalıpları tanımlamak için proje kökünüzde `.repomixignore` dosyası oluşturabilirsiniz. Bu dosya `.gitignore` ile aynı formatı izler.
- **Özel kalıplar**: Ek yoksayma kalıpları, yapılandırma dosyasındaki `ignore.customPatterns` seçeneği kullanılarak belirtilebilir. Bu ayarın üzerine `-i, --ignore` komut satırı seçeneğiyle yazabilirsiniz.

**Öncelik Sırası** (en yüksekten en düşüğe):

1. Özel kalıplar (`ignore.customPatterns`)
2. Yoksayma dosyaları (`.repomixignore`, `.ignore`, `.gitignore` ve `.git/info/exclude`):
   - İç içe dizinlerde, daha derin dizinlerdeki dosyalar daha yüksek önceliğe sahiptir
   - Aynı dizinde ise bu dosyalar belirli bir sıra gözetilmeksizin birleştirilir
3. Varsayılan kalıplar (`ignore.useDefaultPatterns` true ise ve `--no-default-patterns` kullanılmıyorsa)

Bu yaklaşım, projenizin ihtiyaçlarına göre esnek dosya hariç tutma yapılandırmasına olanak tanır. Güvenlik açısından hassas dosyaların ve büyük ikili dosyaların hariç tutulmasını sağlayarak oluşturulan paket dosyasının boyutunu optimize etmeye ve gizli bilgilerin sızmasını önlemeye yardımcı olur.

**Not:** İkili dosyalar varsayılan olarak paketlenmiş çıktıya dahil edilmez, ancak yolları çıktı dosyasının "Depo Yapısı" bölümünde listelenir. Bu, paket dosyasını verimli ve metin tabanlı tutarken depo yapısının tam bir görünümünü sağlar. Daha fazla ayrıntı için [İkili Dosya İşleme](#ikili-dosya-isleme) bölümüne bakın.

`.repomixignore` örneği:
```text
# Cache directories
.cache/
tmp/

# Build outputs
dist/
build/

# Logs
*.log
```

## Varsayılan Yoksayma Kalıpları

`ignore.useDefaultPatterns` true olduğunda, Repomix yaygın kalıpları otomatik olarak yoksayar:
```text
node_modules/**
.git/**
coverage/**
dist/**
```

Tam liste için [defaultIgnore.ts](https://github.com/yamadashy/repomix/blob/main/src/config/defaultIgnore.ts) dosyasına bakın.

## İkili Dosya İşleme

İkili dosyalar (görseller, PDF'ler, derlenmiş ikili dosyalar, arşivler vb.) verimli, metin tabanlı bir çıktı sağlamak amacıyla özel olarak işlenir:

- **Dosya İçerikleri**: İkili dosyalar, çıktının metin tabanlı ve AI işleme için verimli kalması amacıyla paketlenmiş çıktıya **dahil edilmez**
- **Dizin Yapısı**: İkili dosya **yolları**, deponuzun tam görünümünü sağlamak amacıyla dizin yapısı bölümünde **listelenir**

Bu yaklaşım, AI tüketimi için optimize edilmiş verimli, metin tabanlı bir çıktıyı korurken depo yapınızın tam görünümünü elde etmenizi sağlar.

**Örnek:**

Deponuz `logo.png` ve `app.jar` içeriyorsa:
- Dizin Yapısı bölümünde görünecekler
- İçerikleri Dosyalar bölümüne dahil edilmeyecek

**Dizin Yapısı Çıktısı:**
```
src/
  index.ts
  utils.ts
assets/
  logo.png
build/
  app.jar
```

Bu sayede AI araçları, ikili içeriklerini işlemeden bu ikili dosyaların proje yapınızda var olduğunu anlayabilir.

**Not:** `input.maxFileSize` yapılandırma seçeneğini kullanarak maksimum dosya boyutu eşiğini kontrol edebilirsiniz (varsayılan: 50MB). Bu sınırı aşan dosyalar tamamen atlanır.

## Gelişmiş Özellikler

### Kod Sıkıştırma

`output.compress: true` ile etkinleştirilen kod sıkıştırma özelliği, uygulama ayrıntılarını kaldırırken temel kod yapılarını akıllıca çıkarmak için [Tree-sitter](https://github.com/tree-sitter/tree-sitter) kullanır. Bu, önemli yapısal bilgileri korurken token sayısını azaltmaya yardımcı olur.

Temel avantajlar:
- Token sayısını önemli ölçüde azaltır
- Sınıf ve fonksiyon imzalarını korur
- İçe ve dışa aktarmaları muhafaza eder
- Tür tanımlarını ve arayüzleri korur
- Fonksiyon gövdelerini ve uygulama ayrıntılarını kaldırır

Daha fazla ayrıntı ve örnek için [Kod Sıkıştırma Kılavuzu](code-compress) sayfasına bakın.

### Git Entegrasyonu

`output.git` yapılandırması güçlü Git destekli özellikler sunar:

- `sortByChanges`: True olduğunda, dosyalar Git değişiklik sayısına (dosyayı değiştiren commit sayısı) göre sıralanır. Daha fazla değişikliğe sahip dosyalar çıktının altında görünür. Bu, daha aktif geliştirilen dosyalara öncelik verilmesine yardımcı olur. Varsayılan: `true`
- `sortByChangesMaxCommits`: Dosya değişikliklerini sayarken analiz edilecek maksimum commit sayısı. Varsayılan: `100`
- `includeDiffs`: True olduğunda, çıktıya Git farklarını dahil eder (hem çalışma ağacını hem de aşamalı değişiklikleri ayrı ayrı içerir). Bu, okuyucunun depodaki bekleyen değişiklikleri görmesini sağlar. Varsayılan: `false`
- `includeLogs`: True olduğunda, çıktıya Git commit geçmişini dahil eder. Her commit için commit tarihlerini, mesajlarını ve dosya yollarını gösterir. Bu, AI'ın geliştirme kalıplarını ve dosya ilişkilerini anlamasına yardımcı olur. Varsayılan: `false`
- `includeLogsCount`: Git günlüklerine dahil edilecek son commit sayısı. Varsayılan: `50`

Örnek yapılandırma:
```json
{
  "output": {
    "git": {
      "sortByChanges": true,
      "sortByChangesMaxCommits": 100,
      "includeDiffs": true,
      "includeLogs": true,
      "includeLogsCount": 25
    }
  }
}
```

### Güvenlik Kontrolleri

`security.enableSecurityCheck` etkinleştirildiğinde, Repomix çıktıya dahil etmeden önce kod tabanınızdaki hassas bilgileri tespit etmek için [Secretlint](https://github.com/secretlint/secretlint) kullanır. Bu, aşağıdakilerin yanlışlıkla ifşa edilmesinin önüne geçmeye yardımcı olur:

- API anahtarları
- Erişim token'ları
- Özel anahtarlar
- Parolalar
- Diğer hassas kimlik bilgileri

### Yorum Kaldırma

`output.removeComments` `true` olarak ayarlandığında, çıktı boyutunu azaltmak ve temel kod içeriğine odaklanmak için desteklenen dosya türlerinden yorumlar kaldırılır. Bu özellikle şu durumlarda yararlı olabilir:

- Yoğun biçimde belgelenmiş kodla çalışırken
- Token sayısını azaltmaya çalışırken
- Kod yapısına ve mantığına odaklanırken

Desteklenen diller ve ayrıntılı örnekler için [Yorum Kaldırma Kılavuzu](comment-removal) sayfasına bakın.

## İlgili Kaynaklar

- [Komut Satırı Seçenekleri](/tr/guide/command-line-options) - Tam CLI referansı (CLI seçenekleri yapılandırma dosyası ayarlarını geçersiz kılar)
- [Çıktı Formatları](/tr/guide/output) - Her çıktı formatının ayrıntıları
- [Güvenlik](/tr/guide/security) - Repomix'in hassas bilgileri nasıl tespit ettiği
- [Kod Sıkıştırma](/tr/guide/code-compress) - Tree-sitter ile token sayısını azaltın
- [GitHub Depo İşleme](/tr/guide/remote-repository-processing) - Uzak depolar için seçenekler
