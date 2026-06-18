---
title: İzleme Modu
description: Repomix izleme modu ile dosya değişikliklerinde kod tabanınızı otomatik olarak yeniden paketleyin; debouncing, yok sayma yönetimi ve seçenek uyumluluğu dahil.
---

# İzleme Modu

Repomix, kod tabanınızı izleyebilir ve dosyalar her değiştiğinde otomatik olarak yeniden paketleyebilir. Bu, siz çalışırken çıktı dosyasını güncel tutar; bir yapay zeka asistanına sürekli yenilenen bir anlık görüntü vermek istediğinizde kullanışlıdır.

## Kullanım

İzleme modunu `-w` (veya `--watch`) bayrağıyla başlatın:

```bash
repomix --watch
```

Repomix önce ilk paketlemeyi yapar, ardından çalışmaya devam eder ve her değişiklikte yeniden paketler. İzleme modunu her zamanki seçeneklerle birleştirebilirsiniz:

```bash
# Belirli bir dosya kümesini izle
repomix -w --include "src/**/*.ts"

# Özel bir çıktı dosyası ve biçimle izle
repomix --watch -o output.md --style markdown
```

İzlemeyi durdurmak için `Ctrl+C` tuşlarına basın.

## Nasıl Çalışır

- **İlk paketleme**: Repomix kod tabanını bir kez paketler, ardından kaç dosyayı izlediğini bildirir.
- **Değişiklik algılama**: Yeni, değişen ve silinen dosyaların tümü yeniden paketlemeyi tetikler.
- **Debouncing**: Hızlı ardışık değişiklikler (örneğin dal değiştirme veya aynı anda birçok dosyayı kaydetme) birleştirilir. Repomix, yeniden paketlemeden önce son değişiklikten sonra `300 ms` bekler, böylece bir dizi düzenleme tek bir yeniden derlemeyle sonuçlanır.
- **Zaman damgaları**: Her yeniden derlemeden sonra Repomix bir zaman damgası yazdırır (`Rebuilt at HH:MM:SS`), böylece çıktının en son ne zaman yenilendiğini anlayabilirsiniz.

## Yok Sayılan Dosyalar

İzleme modu, normal bir çalıştırmayla aynı yok sayma kurallarına uyar: `.gitignore`, `.repomixignore`, yerleşik varsayılan desenler (`node_modules` ve `.git` gibi) ve geçirdiğiniz tüm `--ignore` desenleri. Yok sayılan dizinler izlenmez, bu da izleme modunu büyük projelerde verimli tutar.

## Seçenek Uyumluluğu

İzleme modu yalnızca yerel dizinlerle çalışır, bu nedenle aşağıdaki seçeneklerle birleştirilemez (ister komut satırında ister yapılandırma dosyanızda ayarlamış olun):

- `--remote` veya konumsal bir uzak depo URL'si: izleme modu yalnızca yereldir
- `--stdout` veya `--stdin`: akış modlarının yenilenecek kalıcı bir çıktı dosyası yoktur
- `--split-output`
- `--skill-generate`
- `--copy`: her değişiklikte yeniden paketleme panoyu tekrar tekrar üzerine yazar

Bunlardan birini `--watch` ile birleştirirseniz, Repomix çakışmayı açıklayan bir hatayla çıkar.

## İlgili Kaynaklar

- [Komut Satırı Seçenekleri](/tr/guide/command-line-options) - `--watch` dahil tam CLI referansı
- [Temel Kullanım](/tr/guide/usage) - Repomix'i çalıştırmanın diğer yolları
- [Yapılandırma](/tr/guide/configuration) - Yapılandırma dosyanızda varsayılan çıktı seçeneklerini ayarlayın
