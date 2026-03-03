# Güvenlik

## Güvenlik Kontrol Özelliği

Repomix, dosyalarınızdaki hassas bilgileri tespit etmek için [Secretlint](https://github.com/secretlint/secretlint) kullanır:
- API anahtarları
- Erişim token'ları
- Kimlik bilgileri
- Özel anahtarlar
- Ortam değişkenleri

## Yapılandırma

Güvenlik kontrolleri varsayılan olarak etkindir.

CLI üzerinden devre dışı bırakmak için:
```bash
repomix --no-security-check
```

Ya da `repomix.config.json` dosyasında:
```json
{
  "security": {
    "enableSecurityCheck": false
  }
}
```

## Güvenlik Önlemleri

1. **İkili Dosya İşleme**: İkili dosyaların içerikleri çıktıdan hariç tutulur, ancak tam depo görünümü için yolları dizin yapısında listelenir
2. **Git Farkındalığı**: `.gitignore` kalıplarına uyar
3. **Otomatik Tespit**: Yaygın güvenlik sorunlarını tarar:
  - AWS kimlik bilgileri
  - Veritabanı bağlantı dizeleri
  - Kimlik doğrulama token'ları
  - Özel anahtarlar

## Güvenlik Kontrolü Sorun Bulduğunda

Örnek çıktı:
```bash
🔍 Security Check:
──────────────────
2 suspicious file(s) detected and excluded:
1. config/credentials.json
  - Found AWS access key
2. .env.local
  - Found database password
```

## En İyi Uygulamalar

1. Paylaşmadan önce çıktıyı her zaman gözden geçirin
2. Hassas yollar için `.repomixignore` kullanın
3. Güvenlik kontrollerini etkin tutun
4. Hassas dosyaları depodan kaldırın

## Güvenlik Açıklarını Bildirme

Bir güvenlik açığı mı buldunuz? Lütfen:
1. Herkese açık bir sorun (issue) açmayın
2. E-posta gönderin: koukun0120@gmail.com
3. Ya da [GitHub Güvenlik Danışmaları](https://github.com/yamadashy/repomix/security/advisories/new)'nı kullanın
