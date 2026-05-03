---
title: SSS ve sorun giderme
description: Repomix ile özel depolar, çıktı formatları, token azaltma, uzak GitHub depoları, güvenlik kontrolleri ve AI iş akışları hakkında sık sorulan sorular.
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

## İlgili kaynaklar

- [Temel kullanım](/tr/guide/usage)
- [Komut satırı seçenekleri](/tr/guide/command-line-options)
- [Kod sıkıştırma](/tr/guide/code-compress)
- [Güvenlik](/tr/guide/security)
