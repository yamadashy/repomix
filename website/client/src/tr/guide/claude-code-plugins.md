# Claude Code Eklentileri

Repomix, [Claude Code](https://docs.anthropic.com/en/docs/claude-code/overview) için AI destekli geliştirme ortamıyla sorunsuz entegrasyon sağlayan resmi eklentiler sunar. Bu eklentiler, doğal dil komutlarını kullanarak doğrudan Claude Code içinde kod tabanlarını analiz etmeyi ve paketlemeyi kolaylaştırır.

## Kurulum

### 1. Repomix Eklenti Pazaryerini Ekleyin

Önce Repomix eklenti pazaryerini Claude Code'a ekleyin:

```text
/plugin marketplace add yamadashy/repomix
```

### 2. Eklentileri Kurun

Aşağıdaki komutları kullanarak eklentileri kurun:

```text
# MCP sunucu eklentisini kur (önerilen temel)
/plugin install repomix-mcp@repomix

# Komutlar eklentisini kur (işlevselliği genişletir)
/plugin install repomix-commands@repomix

# Depo gezgini eklentisini kur (AI destekli analiz)
/plugin install repomix-explorer@repomix
```

::: tip Eklenti İlişkisi
`repomix-mcp` eklentisi temel olarak önerilir. `repomix-commands` eklentisi kullanışlı eğik çizgi komutları sağlarken, `repomix-explorer` AI destekli analiz yetenekleri ekler. Bunları bağımsız olarak kurabilirsiniz, ancak üçünü birlikte kullanmak en kapsamlı deneyimi sunar.
:::

### Alternatif: Etkileşimli Kurulum

Etkileşimli eklenti yükleyicisini de kullanabilirsiniz:

```text
/plugin
```

Bu komut, mevcut eklentilere göz atıp kurabileceğiniz etkileşimli bir arayüz açar.

## Kullanılabilir Eklentiler

### 1. repomix-mcp (MCP Sunucu Eklentisi)

MCP sunucu entegrasyonu aracılığıyla AI destekli kod tabanı analizini sağlayan temel eklenti.

**Özellikler:**
- Yerel ve uzak depoları paketleme
- Paketlenmiş çıktılarda arama
- Yerleşik güvenlik taramasıyla dosya okuma ([Secretlint](https://github.com/secretlint/secretlint))
- Otomatik Tree-sitter sıkıştırması (~%70 token azaltması)

### 2. repomix-commands (Eğik Çizgi Komutları Eklentisi)

Doğal dil desteğiyle hızlı işlemler için kullanışlı eğik çizgi komutları sağlar.

**Kullanılabilir Komutlar:**
- `/repomix-commands:pack-local` - Yerel kod tabanını çeşitli seçeneklerle paketler
- `/repomix-commands:pack-remote` - Uzak GitHub depolarını paketler ve analiz eder

### 3. repomix-explorer (AI Analiz Ajanı Eklentisi)

Repomix CLI kullanarak kod tabanlarını akıllıca keşfeden AI destekli depo analiz ajanı.

**Özellikler:**
- Doğal dille kod tabanı keşfi ve analizi
- Akıllı desen keşfi ve kod yapısı anlama
- Grep ve hedefli dosya okuma kullanarak artımlı analiz
- Büyük depolar için otomatik bağlam yönetimi

**Kullanılabilir Komutlar:**
- `/repomix-explorer:explore-local` - Yerel kod tabanını AI yardımıyla analiz eder
- `/repomix-explorer:explore-remote` - Uzak GitHub depolarını AI yardımıyla analiz eder

**Nasıl Çalışır:**
1. Depoyu paketlemek için `npx repomix@latest` çalıştırır
2. Çıktıyı verimli şekilde aramak için Grep ve Read araçlarını kullanır
3. Aşırı bağlam tüketmeden kapsamlı analiz sağlar

## Kullanım Örnekleri

### Yerel Kod Tabanını Paketleme

`/repomix-commands:pack-local` komutunu doğal dil talimatlarıyla kullanın:

```text
/repomix-commands:pack-local
Bu projeyi sıkıştırmayla birlikte markdown olarak paketle
```

Diğer örnekler:
- "Yalnızca src dizinini paketle"
- "TypeScript dosyalarını satır numaralarıyla paketle"
- "JSON biçiminde çıktı oluştur"

### Uzak Depoyu Paketleme

GitHub depolarını analiz etmek için `/repomix-commands:pack-remote` komutunu kullanın:

```text
/repomix-commands:pack-remote yamadashy/repomix
yamadashy/repomix deposundan yalnızca TypeScript dosyalarını paketle
```

Diğer örnekler:
- "Ana dalı sıkıştırmayla paketle"
- "Yalnızca belgeler dosyalarını dahil et"
- "Belirli dizinleri paketle"

### Yerel Kod Tabanını AI ile Keşfetme

AI destekli analiz için `/repomix-explorer:explore-local` komutunu kullanın:

```text
/repomix-explorer:explore-local ./src
Kimlik doğrulamayla ilgili tüm kodları bul
```

Diğer örnekler:
- "Bu projenin yapısını analiz et"
- "Ana bileşenleri göster"
- "Tüm API uç noktalarını bul"

### Uzak Depoyu AI ile Keşfetme

GitHub depolarını analiz etmek için `/repomix-explorer:explore-remote` komutunu kullanın:

```text
/repomix-explorer:explore-remote facebook/react
Ana bileşen mimarisini göster
```

Diğer örnekler:
- "Depodaki tüm React hook'larını bul"
- "Proje yapısını açıkla"
- "Hata sınırları nerede tanımlanmış?"

## İlgili Kaynaklar

- [MCP Sunucu Belgeleri](/guide/mcp-server) - Temel MCP sunucusu hakkında bilgi edinin
- [Yapılandırma](/guide/configuration) - Repomix davranışını özelleştirin
- [Güvenlik](/guide/security) - Güvenlik özelliklerini anlayın
- [Komut Satırı Seçenekleri](/guide/command-line-options) - Kullanılabilir CLI seçenekleri

## Eklenti Kaynak Kodu

Eklenti kaynak kodu Repomix deposunda mevcuttur:

- [Eklenti Pazaryeri](https://github.com/yamadashy/repomix/tree/main/.claude-plugin)
- [MCP Eklentisi](https://github.com/yamadashy/repomix/tree/main/.claude/plugins/repomix-mcp)
- [Komutlar Eklentisi](https://github.com/yamadashy/repomix/tree/main/.claude/plugins/repomix-commands)
- [Depo Gezgini Eklentisi](https://github.com/yamadashy/repomix/tree/main/.claude/plugins/repomix-explorer)

## Geri Bildirim ve Destek

Claude Code eklentileriyle ilgili sorunlarla karşılaşırsanız veya önerileriniz varsa:

- [GitHub'da sorun bildirin](https://github.com/yamadashy/repomix/issues)
- [Discord topluluğumuza katılın](https://discord.gg/wNYzTwZFku)
- [Mevcut tartışmaları görüntüleyin](https://github.com/yamadashy/repomix/discussions)
