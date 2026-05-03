---
title: SSS ve sorun giderme
description: Repomix ile özel depolar, C# ve Python desteği, MCP uyumlu agent'lar, çıktı formatları, token azaltma, güvenlik kontrolleri ve AI iş akışları hakkında sık sorulan sorular.
---

# SSS ve sorun giderme

Bu sayfa doğru Repomix iş akışını seçmenize, büyük çıktıları azaltmanıza ve AI asistanları için codebase bağlamı hazırlamanıza yardımcı olur.

## Sık sorulan sorular

### Repomix ne için kullanılır?

Repomix bir depoyu tek bir AI-friendly dosyaya paketler. ChatGPT, Claude, Gemini veya diğer asistanlara codebase bağlamı vererek code review, bug investigation, refactoring, dokümantasyon ve onboarding için kullanabilirsiniz.

### Repomix özel depolarla çalışır mı?

Evet. Makinenizin zaten erişebildiği bir checkout içinde Repomix'i yerel olarak çalıştırın:

```bash
repomix
```

Üretilen dosyayı harici bir AI servisine göndermeden önce inceleyin.

### Herkese açık GitHub depolarını clone etmeden işleyebilir mi?

Evet. `--remote` ile kısa biçim veya tam URL kullanın:

```bash
npx repomix --remote yamadashy/repomix
npx repomix --remote https://github.com/yamadashy/repomix
```

### Hangi çıktı formatını seçmeliyim?

Emin değilseniz varsayılan XML ile başlayın. Okunabilir sohbetler için Markdown, otomasyon için JSON, maksimum uyumluluk için plain text kullanın.

```bash
repomix --style markdown
repomix --style json
```

Bkz. [Çıktı formatları](/tr/guide/output).

## Token kullanımını azaltma

### Üretilen dosya çok büyük. Ne yapmalıyım?

Bağlamı daraltın:

```bash
repomix --include "src/**/*.ts,docs/**/*.md"
repomix --ignore "**/*.test.ts,dist/**"
repomix --compress
repomix --remove-comments
```

Büyük depolarda include/ignore pattern'larını kod sıkıştırma ile birlikte kullanın.

### `--compress` ne yapar?

`--compress` import, export, class, function ve interface gibi önemli yapıları korur, birçok implementation detail'i kaldırır. Modelin mimariyi anlaması gerektiğinde kullanışlıdır.

## Güvenlik ve gizlilik

### CLI kodumu yükler mi?

Repomix CLI yerel çalışır ve çıktı dosyasını makinenize yazar. Web sitesi ve tarayıcı eklentisi farklı akışlara sahiptir; [Gizlilik Politikası](/tr/guide/privacy) sayfasını kontrol edin.

### Repomix secret içermeyi nasıl önler?

Repomix Secretlint tabanlı güvenlik kontrolleri kullanır. Bunu ek bir koruma olarak görün ve çıktıyı her zaman gözden geçirin.

## Sorun giderme

### Çıktıda neden dosyalar eksik?

Repomix `.gitignore`, varsayılan ignore kuralları ve özel pattern'ları dikkate alır. `repomix.config.json`, `--ignore` ve git ignore kurallarınızı kontrol edin.

### Ekip için tekrarlanabilir çıktı nasıl sağlanır?

Paylaşılan bir yapılandırma oluşturup commit edin:

```bash
repomix --init
```

## Ek sık sorulan sorular

### Repomix C#, Python, Java, Go, Rust veya diğer dillerle çalışır mı?

Evet. Repomix projenizdeki dosyaları okur ve AI araçları için formatlar, bu yüzden herhangi bir programlama dilindeki repository'leri paketleyebilir. CLI için Node.js 20 veya daha yeni bir sürüm gerekir. Tree-sitter tabanlı kod sıkıştırma gibi bazı gelişmiş özellikler, ilgili dil parser desteğine bağlıdır.

### Repomix'i Hermes Agent, OpenClaw veya diğer MCP uyumlu agent'larla kullanabilir miyim?

Evet. Repomix MCP server olarak çalışabilir:

```bash
npx -y repomix --mcp
```

Hermes Agent için Repomix'i `~/.hermes/config.yaml` içinde stdio MCP server olarak ekleyin:

```yaml
mcp_servers:
  repomix:
    command: "npx"
    args: ["-y", "repomix", "--mcp"]
```

OpenClaw veya diğer MCP uyumlu agent'larda, external stdio MCP server yapılandırılan yerde aynı command ve args değerlerini kullanın. Assistant Agent Skills formatını destekliyorsa [Repomix Explorer Skill](/tr/guide/repomix-explorer-skill) de kullanılabilir.

### Bir AI assistant'ın yeni bir library veya framework'ü anlaması için Repomix'i nasıl kullanırım?

Library repository'sini veya dokümantasyonunu paketleyin ve çıktıyı AI assistant'a referans materyali olarak verin:

```bash
npx repomix --remote owner/repo
npx repomix --remote owner/repo --include "docs/**,src/**"
```

Tekrarlı kullanım için yeniden kullanılabilir Agent Skills dizini de oluşturabilirsiniz:

```bash
npx repomix --remote owner/repo --skill-generate library-reference
```

### CSS, testler, build output veya diğer gürültülü dosyaları nasıl hariç tutarım?

Tek seferlik komutlar için `--ignore` kullanın:

```bash
repomix --ignore "**/*.css,**/*.test.ts,dist/**,coverage/**"
```

Yalnızca belirli source veya docs path'lerini tutmak için `--include` kullanın:

```bash
repomix --include "src/**/*.ts,docs/**/*.md"
```

### Repository size limit var mı?

CLI'de sabit bir repository size limit yoktur, ancak çok büyük repository'ler bellek, dosya boyutu veya AI aracının upload ve context limitleriyle sınırlanabilir. Büyük projelerde hedefli include pattern'lerle başlayın, token-heavy dosyaları inceleyin ve gerekirse output'u bölün:

```bash
repomix --token-count-tree 1000
repomix --split-output 1mb
```

### `--include` neden `node_modules`, build dizinleri veya ignored path'lerdeki dosyaları dahil etmiyor?

`--include`, Repomix'in paketlemeye çalıştığı dosyaları daraltır, ancak ignore rules yine uygulanır. Dosyalar `.gitignore`, `.ignore`, `.repomixignore`, built-in default patterns veya `repomix.config.json` nedeniyle hariç tutulabilir. Advanced durumlarda `--no-gitignore` veya `--no-default-patterns` yardımcı olabilir, ancak dependencies, build artifacts ve diğer gürültülü dosyaları dahil edebileceği için dikkatli kullanın.

## İlgili kaynaklar

- [Temel kullanım](/tr/guide/usage)
- [Komut satırı seçenekleri](/tr/guide/command-line-options)
- [Kod sıkıştırma](/tr/guide/code-compress)
- [Güvenlik](/tr/guide/security)
