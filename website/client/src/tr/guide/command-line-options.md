# Komut Satırı Seçenekleri

## Temel Seçenekler
- `-v, --version`: Sürüm bilgisini göster ve çık

## CLI Giriş/Çıkış Seçenekleri
- `--verbose`: Ayrıntılı hata ayıklama günlüğünü etkinleştir (dosya işleme, token sayısı ve yapılandırma ayrıntılarını gösterir)
- `--quiet`: Hatalar dışında tüm konsol çıktısını bastır (betik yazımı için kullanışlıdır)
- `--stdout`: Paketlenmiş çıktıyı dosya yerine doğrudan stdout'a yaz (tüm günlük kaydını bastırır)
- `--stdin`: Stdin'den dosya yollarını satır satır oku (belirtilen dosyalar doğrudan işlenir)
- `--copy`: İşlemden sonra oluşturulan çıktıyı sistem panosuna kopyala
- `--token-count-tree [threshold]`: Token sayısıyla dosya ağacını göster; isteğe bağlı eşik değeri yalnızca ≥N token içeren dosyaları gösterir (örn. --token-count-tree 100)
- `--top-files-len <number>`: Özette gösterilecek en büyük dosya sayısı (varsayılan: 5, örn. --top-files-len 20)

## Repomix Çıktı Seçenekleri
- `-o, --output <file>`: Çıktı dosyası yolu (varsayılan: repomix-output.xml, stdout için "-" kullanın)
- `--style <style>`: Çıktı formatı: xml, markdown, json veya plain (varsayılan: xml)
- `--parsable-style`: Geçerli XML/Markdown sağlamak için özel karakterleri kaçış karakteriyle işle (çıktı biçimlendirmeyi bozan kod içerdiğinde gereklidir)
- `--compress`: Tree-sitter ayrıştırmasını kullanarak temel kod yapısını (sınıflar, fonksiyonlar, arayüzler) çıkar
- `--output-show-line-numbers`: Çıktıda her satırın önüne satır numarası ekle
- `--no-file-summary`: Çıktıdan dosya özeti bölümünü çıkar
- `--no-directory-structure`: Çıktıdan dizin ağacı görselleştirmesini çıkar
- `--no-files`: Dosya içerikleri olmadan yalnızca meta veri oluştur (depo analizi için kullanışlıdır)
- `--remove-comments`: Paketlemeden önce tüm kod yorumlarını kaldır
- `--remove-empty-lines`: Tüm dosyalardan boş satırları kaldır
- `--truncate-base64`: Çıktı boyutunu azaltmak için uzun base64 veri dizelerini kırp
- `--header-text <text>`: Çıktının başına eklenecek özel metin
- `--instruction-file-path <path>`: Çıktıya dahil edilecek özel talimatları içeren dosyanın yolu
- `--split-output <size>`: Çıktıyı numaralı birden fazla dosyaya böl (örn. repomix-output.1.xml, repomix-output.2.xml); 500kb, 2mb veya 1.5mb gibi boyut değerleri
- `--include-empty-directories`: Dizin yapısına dosyasız klasörleri dahil et
- `--include-full-directory-structure`: --include kalıpları kullanılırken bile Dizin Yapısı bölümünde tüm depo ağacını göster
- `--no-git-sort-by-changes`: Dosyaları git değişiklik sıklığına göre sıralama (varsayılan: en çok değiştirilen dosyalar önce)
- `--include-diffs`: Çalışma ağacı ve aşamalı değişiklikleri gösteren git fark bölümü ekle
- `--include-logs`: Mesajlar ve değiştirilen dosyalarla git commit geçmişi ekle
- `--include-logs-count <count>`: --include-logs ile dahil edilecek son commit sayısı (varsayılan: 50)

## Dosya Seçim Seçenekleri
- `--include <patterns>`: Yalnızca bu glob kalıplarıyla eşleşen dosyaları dahil et (virgülle ayrılmış, örn. "src/**/*.js,*.md")
- `-i, --ignore <patterns>`: Hariç tutulacak ek kalıplar (virgülle ayrılmış, örn. "*.test.js,docs/**")
- `--no-gitignore`: Dosyaları filtrelerken .gitignore kurallarını kullanma
- `--no-dot-ignore`: Dosyaları filtrelerken .ignore kurallarını kullanma
- `--no-default-patterns`: Yerleşik yoksayma kalıplarını uygulama (node_modules, .git, derleme dizinleri vb.)

## Uzak Depo Seçenekleri
- `--remote <url>`: Uzak bir depoyu klonla ve paketle (GitHub URL'si veya kullanıcı/depo formatı)
- `--remote-branch <name>`: Kullanılacak belirli dal, etiket veya commit (varsayılan: deponun varsayılan dalı)

## Yapılandırma Seçenekleri
- `-c, --config <path>`: repomix.config.json yerine özel yapılandırma dosyası kullan
- `--init`: Varsayılan ayarlarla yeni bir repomix.config.json dosyası oluştur
- `--global`: --init ile birlikte, yapılandırmayı geçerli dizin yerine home dizininde oluştur

## Güvenlik Seçenekleri
- `--no-security-check`: API anahtarları ve parolalar gibi hassas verilerin taranmasını atla (dikkatli kullanın; çıktıda gizli bilgiler açığa çıkabilir)

## Token Sayımı Seçenekleri
- `--token-count-encoding <encoding>`: Sayım için tokenleştirici model: o200k_base (GPT-4o), cl100k_base (GPT-3.5/4) vb. (varsayılan: o200k_base)

## MCP Seçenekleri
- `--mcp`: AI araç entegrasyonu için Model Context Protocol sunucusu olarak çalıştır

## İlgili Kaynaklar

- [Yapılandırma](/tr/guide/configuration) - CLI bayrakları yerine yapılandırma dosyasında seçenekleri ayarlayın
- [Çıktı Formatları](/tr/guide/output) - XML, Markdown, JSON ve düz metin formatlarının ayrıntıları
- [Kod Sıkıştırma](/tr/guide/code-compress) - `--compress` seçeneğinin Tree-sitter ile nasıl çalıştığı
- [Güvenlik](/tr/guide/security) - `--no-security-check` seçeneğinin devre dışı bıraktıkları

## Örnekler

```bash
# Basic usage
repomix

# Custom output file and format
repomix -o my-output.md --style markdown
repomix -o my-output.json --style json

# Output to stdout
repomix --stdout > custom-output.txt

# Send output to stdout, then pipe into another command (for example, simonw/llm)
repomix --stdout | llm "Please explain what this code does."

# Custom output with compression
repomix --compress

# Split output into multiple files (max size per part)
repomix --split-output 20mb

# Process specific files with patterns
repomix --include "src/**/*.ts,*.md" --ignore "*.test.js,docs/**"

# Remote repository with branch
repomix --remote https://github.com/user/repo/tree/main

# Remote repository with commit
repomix --remote https://github.com/user/repo/commit/836abcd7335137228ad77feb28655d85712680f1

# Remote repository with shorthand
repomix --remote user/repo

# Using stdin for file list
find src -name "*.ts" -type f | repomix --stdin
git ls-files "*.js" | repomix --stdin
echo -e "src/index.ts\nsrc/utils.ts" | repomix --stdin

# Git integration
repomix --include-diffs  # Include git diffs for uncommitted changes
repomix --include-logs   # Include git logs (last 50 commits by default)
repomix --include-logs --include-logs-count 10  # Include last 10 commits
repomix --include-diffs --include-logs  # Include both diffs and logs

# Token count analysis
repomix --token-count-tree
repomix --token-count-tree 1000  # Only show files/directories with 1000+ tokens
```
