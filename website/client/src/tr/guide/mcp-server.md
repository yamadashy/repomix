# MCP Sunucusu

Repomix, [Model Context Protocol (MCP)](https://modelcontextprotocol.io)'yi destekler ve AI asistanlarının kod tabanınızla doğrudan etkileşime girmesini sağlar. MCP sunucusu olarak çalıştırıldığında Repomix, AI asistanlarının manuel dosya hazırlamaya gerek kalmadan yerel veya uzak depoları analiz için paketleyebileceği araçlar sunar.

> [!NOTE]
> Bu, kullanıcı geri bildirimlerine ve gerçek dünya kullanımına göre aktif olarak geliştireceğimiz deneysel bir özelliktir

## Repomix'i MCP Sunucusu Olarak Çalıştırma

Repomix'i MCP sunucusu olarak çalıştırmak için `--mcp` bayrağını kullanın:

```bash
repomix --mcp
```

Bu komut Repomix'i MCP sunucusu modunda başlatır ve Model Context Protocol'ü destekleyen AI asistanları tarafından kullanılabilir hale getirir.

## MCP Sunucularını Yapılandırma

Repomix'i Claude gibi AI asistanlarıyla MCP sunucusu olarak kullanmak için MCP ayarlarını yapılandırmanız gerekir:

### VS Code için

VS Code'a Repomix MCP sunucusunu şu yöntemlerden biriyle kurabilirsiniz:

1. **Kurulum Rozetini Kullanarak:**

  [![VS Code'a Kur](https://img.shields.io/badge/VS_Code-VS_Code?style=flat-square&label=Install%20Server&color=0098FF)](vscode:mcp/install?%7B%22name%22%3A%22repomix%22%2C%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22repomix%22%2C%22--mcp%22%5D%7D)<br>
  [![VS Code Insiders'a Kur](https://img.shields.io/badge/VS_Code_Insiders-VS_Code_Insiders?style=flat-square&label=Install%20Server&color=24bfa5)](vscode-insiders:mcp/install?%7B%22name%22%3A%22repomix%22%2C%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22repomix%22%2C%22--mcp%22%5D%7D)

2. **Komut Satırını Kullanarak:**

  ```bash
  code --add-mcp '{"name":"repomix","command":"npx","args":["-y","repomix","--mcp"]}'
  ```

  VS Code Insiders için:
  ```bash
  code-insiders --add-mcp '{"name":"repomix","command":"npx","args":["-y","repomix","--mcp"]}'
  ```

### Cline (VS Code eklentisi) için

`cline_mcp_settings.json` dosyasını düzenleyin:

```json
{
  "mcpServers": {
    "repomix": {
      "command": "npx",
      "args": [
        "-y",
        "repomix",
        "--mcp"
      ]
    }
  }
}
```

### Cursor için

Cursor'da `Cursor Settings` > `MCP` > `+ Add new global MCP server` yolunu izleyerek Cline ile benzer bir yapılandırmayla yeni bir MCP sunucusu ekleyin.

### Claude Desktop için

`claude_desktop_config.json` dosyasını Cline yapılandırmasına benzer şekilde düzenleyin.

### Claude Code için

[Claude Code](https://docs.anthropic.com/en/docs/claude-code/overview)'da Repomix'i MCP sunucusu olarak yapılandırmak için şu komutu kullanın:

```bash
claude mcp add repomix -- npx -y repomix --mcp
```

Alternatif olarak, daha kolay bir deneyim için **resmi Repomix eklentilerini** kullanabilirsiniz. Eklentiler doğal dil komutları ve daha basit kurulum sunar. Ayrıntılar için [Claude Code Eklentileri](/guide/claude-code-plugins) belgelerine bakın.

### npx yerine Docker Kullanımı

npx yerine Docker kullanarak da Repomix'i MCP sunucusu olarak çalıştırabilirsiniz:

```json
{
  "mcpServers": {
    "repomix-docker": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "ghcr.io/yamadashy/repomix",
        "--mcp"
      ]
    }
  }
}
```

## Kullanılabilir MCP Araçları

MCP sunucusu olarak çalışırken Repomix şu araçları sunar:

### pack_codebase

Bu araç, yerel bir kod dizinini AI analizine uygun birleşik bir XML dosyasına paketler. Kod tabanı yapısını analiz eder, ilgili kod içeriğini çıkarır ve metrikler, dosya ağacı ile biçimlendirilmiş kod içeriği dahil kapsamlı bir rapor oluşturur.

**Parametreler:**
- `directory`: (Zorunlu) Paketlenecek dizinin mutlak yolu
- `compress`: (İsteğe bağlı, varsayılan: false) Uygulama ayrıntılarını kaldırırken temel kod imzalarını ve yapısını çıkarmak için Tree-sitter sıkıştırmasını etkinleştirin. Token kullanımını yaklaşık %70 azaltırken anlam bütünlüğünü korur. grep_repomix_output artımlı içerik getirmeye izin verdiğinden genellikle gerekli değildir. Yalnızca büyük depolar için tüm kod tabanı içeriğine ihtiyaç duyduğunuzda kullanın.
- `includePatterns`: (İsteğe bağlı) fast-glob desenleri kullanarak eklenecek dosyaları belirtin. Birden fazla desen virgülle ayrılabilir (örn. "**/*.{js,ts}", "src/**,docs/**"). Yalnızca eşleşen dosyalar işlenir.
- `ignorePatterns`: (İsteğe bağlı) fast-glob desenleri kullanarak hariç tutulacak ek dosyaları belirtin. Birden fazla desen virgülle ayrılabilir (örn. "test/**,*.spec.js", "node_modules/**,dist/**"). Bu desenler .gitignore ve yerleşik dışlamaları tamamlar.
- `topFilesLength`: (İsteğe bağlı, varsayılan: 10) Kod tabanı analizi için metrik özetinde gösterilecek boyuta göre en büyük dosya sayısı.

**Örnek:**
```json
{
  "directory": "/path/to/your/project",
  "compress": false,
  "includePatterns": "src/**/*.ts,**/*.md",
  "ignorePatterns": "**/*.log,tmp/",
  "topFilesLength": 10
}
```

### pack_remote_repository

Bu araç, bir GitHub deposunu getirir, klonlar ve AI analizine uygun birleşik bir XML dosyasına paketler. Uzak depoyu otomatik olarak klonlar, yapısını analiz eder ve kapsamlı bir rapor oluşturur.

**Parametreler:**
- `remote`: (Zorunlu) GitHub deposu URL'si veya kullanıcı/repo biçimi (örn. "yamadashy/repomix", "https://github.com/user/repo" veya "https://github.com/user/repo/tree/branch")
- `compress`: (İsteğe bağlı, varsayılan: false) Uygulama ayrıntılarını kaldırırken temel kod imzalarını ve yapısını çıkarmak için Tree-sitter sıkıştırmasını etkinleştirin. Token kullanımını yaklaşık %70 azaltırken anlam bütünlüğünü korur. grep_repomix_output artımlı içerik getirmeye izin verdiğinden genellikle gerekli değildir. Yalnızca büyük depolar için tüm kod tabanı içeriğine ihtiyaç duyduğunuzda kullanın.
- `includePatterns`: (İsteğe bağlı) fast-glob desenleri kullanarak eklenecek dosyaları belirtin. Birden fazla desen virgülle ayrılabilir (örn. "**/*.{js,ts}", "src/**,docs/**"). Yalnızca eşleşen dosyalar işlenir.
- `ignorePatterns`: (İsteğe bağlı) fast-glob desenleri kullanarak hariç tutulacak ek dosyaları belirtin. Birden fazla desen virgülle ayrılabilir (örn. "test/**,*.spec.js", "node_modules/**,dist/**"). Bu desenler .gitignore ve yerleşik dışlamaları tamamlar.
- `topFilesLength`: (İsteğe bağlı, varsayılan: 10) Kod tabanı analizi için metrik özetinde gösterilecek boyuta göre en büyük dosya sayısı.

**Örnek:**
```json
{
  "remote": "yamadashy/repomix",
  "compress": false,
  "includePatterns": "src/**/*.ts,**/*.md",
  "ignorePatterns": "**/*.log,tmp/",
  "topFilesLength": 10
}
```

### read_repomix_output

Bu araç, Repomix tarafından oluşturulan çıktı dosyasının içeriğini okur. Büyük dosyalar için satır aralığı belirterek kısmi okumayı destekler. Bu araç, doğrudan dosya sistemi erişiminin sınırlı olduğu ortamlar için tasarlanmıştır.

**Parametreler:**
- `outputId`: (Zorunlu) Okunacak Repomix çıktı dosyasının kimliği
- `startLine`: (İsteğe bağlı) Başlangıç satır numarası (1 tabanlı, dahil). Belirtilmezse baştan okur.
- `endLine`: (İsteğe bağlı) Bitiş satır numarası (1 tabanlı, dahil). Belirtilmezse sona kadar okur.

**Özellikler:**
- Web tabanlı ortamlar veya korumalı uygulamalar için özel olarak tasarlanmıştır
- Daha önce oluşturulan çıktıların içeriğini kimliklerini kullanarak getirir
- Dosya sistemi erişimi gerektirmeden paketlenmiş kod tabanına güvenli erişim sağlar
- Büyük dosyalar için kısmi okumayı destekler

**Örnek:**
```json
{
  "outputId": "8f7d3b1e2a9c6054",
  "startLine": 100,
  "endLine": 200
}
```

### grep_repomix_output

Bu araç, JavaScript RegExp sözdizimini kullanan grep benzeri işlevsellikle bir Repomix çıktı dosyasında desen arar. Eşleşmelerin çevresinde isteğe bağlı bağlam satırlarıyla birlikte eşleşen satırları döndürür.

**Parametreler:**
- `outputId`: (Zorunlu) Aranacak Repomix çıktı dosyasının kimliği
- `pattern`: (Zorunlu) Arama deseni (JavaScript RegExp düzenli ifade sözdizimi)
- `contextLines`: (İsteğe bağlı, varsayılan: 0) Her eşleşmeden önce ve sonra gösterilecek bağlam satırı sayısı. beforeLines/afterLines belirtilmişse bunlar tarafından geçersiz kılınır.
- `beforeLines`: (İsteğe bağlı) Her eşleşmeden önce gösterilecek bağlam satırı sayısı (grep -B gibi). contextLines'dan önceliklidir.
- `afterLines`: (İsteğe bağlı) Her eşleşmeden sonra gösterilecek bağlam satırı sayısı (grep -A gibi). contextLines'dan önceliklidir.
- `ignoreCase`: (İsteğe bağlı, varsayılan: false) Büyük/küçük harfe duyarsız eşleşme gerçekleştirin

**Özellikler:**
- Güçlü desen eşleştirme için JavaScript RegExp sözdizimini kullanır
- Eşleşmeleri daha iyi anlamak için bağlam satırlarını destekler
- Önceki/sonraki bağlam satırlarının ayrı kontrolüne olanak tanır
- Büyük/küçük harfe duyarlı ve duyarsız arama seçenekleri

**Örnek:**
```json
{
  "outputId": "8f7d3b1e2a9c6054",
  "pattern": "function\\s+\\w+\\(",
  "contextLines": 3,
  "ignoreCase": false
}
```

### file_system_read_file ve file_system_read_directory

Repomix'in MCP sunucusu, AI asistanlarının yerel dosya sistemiyle güvenli bir şekilde etkileşime girmesini sağlayan iki dosya sistemi aracı sunar:

1. `file_system_read_file`
  - Mutlak yollar kullanarak yerel dosya sisteminden dosya içeriğini okur
  - Hassas bilgiler içeren dosyalara erişimi tespit edip önlemek için yerleşik güvenlik doğrulaması içerir
  - [Secretlint](https://github.com/secretlint/secretlint) kullanarak güvenlik doğrulaması uygular
  - Hassas bilgiler içeren dosyalara erişimi engeller (API anahtarları, parolalar, gizli bilgiler)
  - Dizin geçiş saldırılarını önlemek için mutlak yolları doğrular
  - Geçersiz yollar veya güvenlik sorunları için açık hata mesajlarıyla biçimlendirilmiş içerik döndürür

2. `file_system_read_directory`
  - Mutlak yol kullanarak bir dizinin içeriğini listeler
  - Dosya ve alt dizinleri açık göstergelerle gösteren biçimlendirilmiş bir liste döndürür
  - Hem dosyaları hem dizinleri açık göstergelerle (`[FILE]` veya `[DIR]`) gösterir
  - Uygun hata yönetimiyle güvenli dizin gezintisi sağlar
  - Yolları doğrular ve mutlak olduklarından emin olur
  - Proje yapısını keşfetmek ve kod tabanı organizasyonunu anlamak için kullanışlıdır

Her iki araç da güçlü güvenlik önlemleri içerir:
- Dizin geçiş saldırılarını önlemek için mutlak yol doğrulaması
- Uygun erişim haklarını sağlamak için izin kontrolleri
- Hassas bilgi tespiti için Secretlint entegrasyonu
- Daha iyi hata ayıklama ve güvenlik farkındalığı için açık hata mesajları

**Örnek:**
```typescript
// Dosya okuma
const fileContent = await tools.file_system_read_file({
  path: '/absolute/path/to/file.txt'
});

// Dizin içeriğini listeleme
const dirContent = await tools.file_system_read_directory({
  path: '/absolute/path/to/directory'
});
```

Bu araçlar, AI asistanlarının şunları yapması gerektiğinde özellikle kullanışlıdır:
- Kod tabanındaki belirli dosyaları analiz etmek
- Dizin yapılarında gezinmek
- Dosya varlığını ve erişilebilirliğini doğrulamak
- Güvenli dosya sistemi işlemlerini sağlamak

## Repomix'i MCP Sunucusu Olarak Kullanmanın Avantajları

Repomix'i MCP sunucusu olarak kullanmak birçok avantaj sunar:

1. **Doğrudan Entegrasyon**: AI asistanları, manuel dosya hazırlamaya gerek kalmadan kod tabanınızı doğrudan analiz edebilir.
2. **Verimli İş Akışı**: Dosyaları manuel olarak oluşturma ve yükleme ihtiyacını ortadan kaldırarak kod analizi sürecini kolaylaştırır.
3. **Tutarlı Çıktı**: AI asistanının kod tabanını tutarlı ve optimize edilmiş bir biçimde almasını sağlar.
4. **Gelişmiş Özellikler**: Kod sıkıştırma, token sayımı ve güvenlik kontrolleri gibi Repomix'in tüm özelliklerinden yararlanır.

Yapılandırıldıktan sonra AI asistanınız, kod tabanlarını analiz etmek için Repomix'in yeteneklerini doğrudan kullanabilir ve kod analizi iş akışlarını daha verimli hale getirir.
