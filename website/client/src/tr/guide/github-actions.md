# Repomix'i GitHub Actions ile Kullanma

Repomix'i GitHub Actions iş akışlarınıza entegre ederek kod tabanınızın yapay zeka analizi için paketlenmesi sürecini otomatikleştirebilirsiniz. Bu yöntem; sürekli entegrasyon (CI), kod inceleme veya deponuzu LLM tabanlı araçlar için hazırlama amacıyla oldukça kullanışlıdır.

## Temel Kullanım

Deponuzu paketlemek için iş akışı YAML dosyanıza aşağıdaki adımı ekleyin:

```yaml
- name: Pack repository with Repomix
  uses: yamadashy/repomix/.github/actions/repomix@main
  with:
    output: repomix-output.xml
```

## Farklı Çıktı Formatlarını Kullanma

`style` parametresiyle farklı çıktı formatları belirtebilirsiniz (varsayılan değer `xml`'dir):

```yaml
- name: Pack repository with Repomix
  uses: yamadashy/repomix/.github/actions/repomix@main
  with:
    output: repomix-output.md
    style: markdown
```

```yaml
- name: Pack repository with Repomix (JSON format)
  uses: yamadashy/repomix/.github/actions/repomix@main
  with:
    output: repomix-output.json
    style: json
```

## Birden Fazla Dizini Sıkıştırarak Paketleme

Birden fazla dizin, dahil etme/hariç tutma kalıpları belirtebilir ve akıllı sıkıştırmayı etkinleştirebilirsiniz:

```yaml
- name: Pack repository with Repomix
  uses: yamadashy/repomix/.github/actions/repomix@main
  with:
    directories: src tests
    include: "**/*.ts,**/*.md"
    ignore: "**/*.test.ts"
    output: repomix-output.xml
    compress: true
```

## Çıktıyı Artifact Olarak Yükleme

Paketlenmiş dosyayı sonraki iş akışı adımlarında kullanabilmek veya indirilebilir hale getirmek için artifact olarak yükleyin:

```yaml
- name: Pack repository with Repomix
  uses: yamadashy/repomix/.github/actions/repomix@main
  with:
    directories: src
    output: repomix-output.xml
    compress: true

- name: Upload Repomix output
  uses: actions/upload-artifact@v4
  with:
    name: repomix-output
    path: repomix-output.xml
```

## Action Girdileri

| Ad                | Açıklama                                              | Varsayılan           |
|-------------------|-------------------------------------------------------|----------------------|
| `directories`     | Paketlenecek dizinlerin boşlukla ayrılmış listesi     | `.`                  |
| `include`         | Dahil edilecek glob kalıplarının virgülle ayrılmış listesi | `""`            |
| `ignore`          | Hariç tutulacak glob kalıplarının virgülle ayrılmış listesi | `""`           |
| `output`          | Çıktı dosyasının yolu                                 | `repomix-output.xml` |
| `compress`        | Akıllı sıkıştırmayı etkinleştir                       | `true`               |
| `style`           | Çıktı stili (xml, markdown, json, plain)              | `xml`                |
| `additional-args` | Repomix için ek CLI argümanları                        | `""`                 |
| `repomix-version` | Yüklenecek npm paketinin sürümü                        | `latest`             |

## Action Çıktıları

| Ad            | Açıklama                          |
|---------------|-----------------------------------|
| `output_file` | Oluşturulan çıktı dosyasının yolu |

## Örnek: Tam İş Akışı

Repomix kullanan eksiksiz bir GitHub Actions iş akışı örneği:

```yaml
name: Pack repository with Repomix

on:
  workflow_dispatch:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  pack-repo:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Pack repository with Repomix
        uses: yamadashy/repomix/.github/actions/repomix@main
        with:
          output: repomix-output.xml

      - name: Upload Repomix output
        uses: actions/upload-artifact@v4
        with:
          name: repomix-output.xml
          path: repomix-output.xml
          retention-days: 30
```

[Tam iş akışı örneğine](https://github.com/yamadashy/repomix/blob/main/.github/workflows/pack-repository.yml) göz atın.
