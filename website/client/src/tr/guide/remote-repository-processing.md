# GitHub Deposu İşleme

## Temel Kullanım

Herkese açık depoları işleyin:
```bash
# Tam URL kullanarak
repomix --remote https://github.com/user/repo

# GitHub kısayol formatıyla
repomix --remote user/repo
```

## Dal ve Commit Seçimi

```bash
# Belirli bir dal
repomix --remote user/repo --remote-branch main

# Etiket (tag)
repomix --remote user/repo --remote-branch v1.0.0

# Commit hash
repomix --remote user/repo --remote-branch 935b695
```

## Gereksinimler

- Git kurulu olmalıdır
- İnternet bağlantısı gereklidir
- Depoya okuma erişimi olmalıdır

## Çıktı Kontrolü

```bash
# Özel çıktı konumu
repomix --remote user/repo -o custom-output.xml

# XML formatıyla
repomix --remote user/repo --style xml

# Yorumları kaldırarak
repomix --remote user/repo --remove-comments
```

## Docker Kullanımı

```bash
# İşleyip mevcut dizine çıktı al
docker run -v .:/app -it --rm ghcr.io/yamadashy/repomix \
  --remote user/repo

# Belirli bir dizine çıktı al
docker run -v ./output:/app -it --rm ghcr.io/yamadashy/repomix \
  --remote user/repo
```

## Güvenlik

Güvenlik nedeniyle, uzak depolardaki yapılandırma dosyaları (`repomix.config.*`) varsayılan olarak yüklenmez. Bu sayede güvenilmeyen depoların `repomix.config.ts` gibi yapılandırma dosyaları aracılığıyla kod çalıştırması engellenir.

Global yapılandırmanız ve CLI seçenekleriniz yine de uygulanır.

Uzak bir deponun yapılandırmasına güvenmek için:

```bash
# CLI bayrağı kullanarak
repomix --remote user/repo --remote-trust-config

# Ortam değişkeni kullanarak
REPOMIX_REMOTE_TRUST_CONFIG=true repomix --remote user/repo
```

`--remote` ile `--config` kullanırken mutlak bir yol belirtilmelidir:

```bash
repomix --remote user/repo --config /home/user/repomix.config.json
```

## Sık Karşılaşılan Sorunlar

### Erişim Sorunları
- Deponun herkese açık olduğundan emin olun
- Git kurulumunu kontrol edin
- İnternet bağlantınızı doğrulayın

### Büyük Depolar
- Belirli yolları seçmek için `--include` kullanın
- `--remove-comments` seçeneğini etkinleştirin
- Dalları ayrı ayrı işleyin
