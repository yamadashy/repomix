---
title: "Güvenlik"
description: "Repomix’in paketleme öncesinde sırları, API anahtarlarını, tokenları, kimlik bilgilerini ve hassas depo içeriklerini tespit etmek için Secretlint ve güvenlik kontrollerini nasıl kullandığını öğrenin."
---

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

## Uzak Depo Yapılandırma Güveni {#remote-repository-config-trust}

Bir uzak depoyu `--remote` ile paketlediğinizde, Repomix o deponun yapılandırmasını güvenilmeyen kod olarak ele alır.

### Bir yapılandırma dosyası neden koddur

Bir `repomix.config.*` yalnızca veri değildir:

- `repomix.config.ts` / `.js` / `.mjs` yüklendiğinde **çalıştırılır**.
- `input.processors`, eşleşen dosyalar üzerinde harici komutlar çalıştırır.
- `output.instructionFilePath` ve `../` kullanan include kalıpları, depo dışındaki dosyaları okur.

Gözden geçirilmemiş bir yapılandırmayı tanımadığınız bir depodan yüklemek, bu nedenle onun `Makefile`'ını çalıştırmaya veya lifecycle script'leri olan bir pakette `npm install` çalıştırmaya benzer.

### Varsayılan: uzak yapılandırmalar asla yüklenmez

Repomix, siz açıkça istemediğiniz sürece klonlanmış bir deponun yapılandırmasını yok sayar. Global yapılandırmanız ve CLI seçenekleriniz yine de uygulanır. Aşağıdaki bayrağı hiç geçmezseniz, bu bölümdeki hiçbir şey sizi etkileyemez.

### Etkinleştirme

```bash
# CLI bayrağı kullanarak
repomix --remote user/repo --remote-trust-config

# Ortam değişkeni kullanarak
REPOMIX_REMOTE_TRUST_CONFIG=true repomix --remote user/repo
```

Bu, uzak yapılandırmaya kendi yazdığınız bir yapılandırmayla aynı güveni tanır. Bunu yalnızca güvendiğiniz ve incelediğiniz depolar için kullanın.

### Onay istemi

Etkileşimli bir terminalde, Repomix çalıştırılmak üzere olan yapılandırmayı gösterir ve yüklemeden önce onaylamanızı ister:

| Seçim | Etki |
| --- | --- |
| **Evet, yalnızca bu sefer** | Yalnızca bu çalıştırmaya güvenilir. |
| **Evet, bu depo için tekrar sorma** | Kararı hatırla (aşağıya bakın). |
| **Hayır** (varsayılan seçim) | Yapılandırmayı yüklemeden iptal et. |

Size gösterilen yapılandırma deponun yazarı tarafından yazıldığından, Repomix görüntünün değiştirilemeyeceğinden emin olur:

- **Kontrol ve ANSI dizileri kaçışlanır**, böylece bir yapılandırma terminali yeniden boyayamaz veya uyarıyı görünümden kaydıramaz.
- **Çift yönlü (bidirectional) ve görünmez karakterler kaçışlanır**, böylece okuduğunuz metin çalıştırılan metinle aynı olur ([Trojan Source](https://trojansource.codes/)).
- **Çıktı hem satır sayısı hem de bayt boyutuyla sınırlandırılır**, böylece doldurulmuş (padded) bir yapılandırma uyarıyı ekran dışına itemez.
- **Her yapılandırma satırının başına önek eklenir**, böylece bir yapılandırma Repomix'in kendi ayraçlarını veya mesajlarını taklit edemez.
- **Sembolik bağlantılar (symlink) reddedilir.** Git sembolik bağlantıları korur, bu yüzden bir depo, klonun dışına işaret eden bir `repomix.config.json` gönderebilir. Repomix, yapılandırmanın klonlanan ağaç içinde normal bir dosya olmasını zorunlu kılar — aksi halde incelediğiniz baytlar çalıştırılan baytlarla aynı olmaz.

### Bir kararı hatırlama

"Tekrar sorma" seçeneğini seçmek, geçici dizininizin altında (`$TMPDIR/repomix/trusted-remotes/`) yalnızca kullanıcı hesabınız tarafından okunup yazılabilen bir işaretleyici saklar.

İşaretleyici **içeriğe sabitlenmiştir**: onayladığınız yapılandırmanın bir hash'ini kaydeder. O depo daha sonra farklı bir yapılandırma gönderirse, hash artık eşleşmez ve **size tekrar sorulur** — `direnv allow` ile aynı model.

::: warning Sabitlemenin kapsamı
Hash yalnızca giriş yapılandırma dosyasını kapsar. Bir `.ts` / `.js` yapılandırması başka dosyaları `import` edebilir ve `input.processors` harici script'leri çalıştırabilir; ikisi de hash'lenmez. Zaten güvendiğiniz bir depo, giriş dosyası aynı kalırken bunları değiştirebilir. Bu yüzden çalıştırılabilir yapılandırmalar istemde bu şekilde etiketlenir — "tekrar sorma"yı yalnızca okuduğunuz dosyaya değil, depoya duyulan güven olarak ele alın.
:::

İşaretleyiciler geçici dizinde yaşar, bu yüzden işletim sisteminiz onu temizlediğinde kararlar sona erer. Bu kasıtlıdır: "tekrar sor"a doğru sona ermek güvenli yöndür.

### İstemin atlandığı durumlar

| Durum | Davranış |
| --- | --- |
| `--force` geçildiğinde | Sorulmadan güvenilir. Bayrak, sonuçları kabul ettiğiniz anlamına gelir; stderr'e bir bildirim yazdırılır. |
| Etkileşimli olmayan kabuk (CI, pipe'lar) | Sorulmadan güvenilir, mevcut otomasyonu korur. stderr'e bir bildirim yazdırılır. |
| Depo zaten güvenilir | Yapılandırma değişmediği sürece sorulmadan yüklenir. |
| Mutlak bir `--config` kullanıldığında | Klonlanan deponun kendi yapılandırması hiç yüklenmez, bu yüzden onaylanacak bir şey yoktur. |
| Klonda yapılandırma dosyası yoksa | Güvenilecek bir şey yoktur. |

`--stdout` altında veya stdout yeniden yönlendirildiğinde, istem gösterilemez. Repomix, yapılandırmayı sessizce güvenmek yerine yönlendirmeyle birlikte bir hata bildirir.

### Öneriler

1. Deponun kendi yapılandırmasına ihtiyacınız olmadıkça `--remote-trust-config` bayrağını kapalı bırakın.
2. Yanıtlamadan önce istemdeki yapılandırmayı okuyun, özellikle `input.processors` ve `../` yollarını.
3. Kontrol etmediğiniz depolar için "Evet, yalnızca bu sefer"i tercih edin.
4. CI'da, istemin sizi koruyamayacağını unutmayın — paketlediğiniz revizyonu sabitleyin ve önceden inceleyin.

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

## İlgili Kaynaklar

- [GitHub Depo İşleme](/tr/guide/remote-repository-processing) - Kendi klonlamadığınız depoları paketleyin
- [Yapılandırma](/tr/guide/configuration) - `security.enableSecurityCheck` ile güvenlik kontrollerini yapılandırın
- [Komut Satırı Seçenekleri](/tr/guide/command-line-options) - `--no-security-check` bayrağını kullanın
- [Gizlilik Politikası](/tr/guide/privacy) - Repomix'in veri işleme hakkında bilgi edinin
