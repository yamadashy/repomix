# Temel Kullanım

## Hızlı Başlangıç

Tüm depoyu paketleyin:
```bash
repomix
```

## Yaygın Kullanım Senaryoları

### Belirli Dizinleri Paketleme
```bash
repomix path/to/directory
```

### Belirli Dosyaları Dahil Etme
[Glob desenleri](https://github.com/mrmlnc/fast-glob?tab=readme-ov-file#pattern-syntax) kullanın:
```bash
repomix --include "src/**/*.ts,**/*.md"
```

### Dosyaları Dışarıda Bırakma
```bash
repomix --ignore "**/*.log,tmp/"
```

### Çıktıyı Birden Fazla Dosyaya Bölme

Büyük kod tabanlarıyla çalışırken, paketlenmiş çıktı bazı yapay zeka araçlarının dosya boyutu limitlerini aşabilir (örneğin Google AI Studio'nun 1MB limiti). Çıktıyı otomatik olarak birden fazla dosyaya bölmek için `--split-output` seçeneğini kullanın:

```bash
repomix --split-output 1mb
```

Bu seçenek aşağıdaki gibi numaralı dosyalar oluşturur:
- `repomix-output.1.xml`
- `repomix-output.2.xml`
- `repomix-output.3.xml`

Boyut şu birimlerle belirtilebilir: `500kb`, `1mb`, `2mb`, `1.5mb` vb. Ondalık değerler desteklenir.

> [!NOTE]
> Dosyalar bağlamı korumak için üst düzey dizine göre gruplandırılır. Tek bir dosya veya dizin, birden fazla çıktı dosyasına bölünmez.

### Uzak Depolar
```bash
# GitHub URL'si kullanarak
repomix --remote https://github.com/user/repo

# Kısa biçim kullanarak
repomix --remote user/repo

# Belirli dal/etiket/commit
repomix --remote user/repo --remote-branch main
repomix --remote user/repo --remote-branch 935b695
```

### Dosya Listesi Girişi (stdin)

Tam esneklik için dosya yollarını stdin üzerinden iletin:

```bash
# find komutu kullanarak
find src -name "*.ts" -type f | repomix --stdin

# git ile izlenen dosyaları almak için
git ls-files "*.ts" | repomix --stdin

# ripgrep (rg) ile dosya bulmak için
rg --files --type ts | repomix --stdin

# Belirli içeriği olan dosyaları grep ile bulmak için
grep -l "TODO" **/*.ts | repomix --stdin

# ripgrep ile belirli içerikli dosyaları bulmak için
rg -l "TODO|FIXME" --type ts | repomix --stdin

# sharkdp/fd ile dosya bulmak için
fd -e ts | repomix --stdin

# fzf ile tüm dosyalar arasından seçim yapmak için
fzf -m | repomix --stdin

# fzf ile etkileşimli dosya seçimi
find . -name "*.ts" -type f | fzf -m | repomix --stdin

# ls ile glob desenleri kullanarak
ls src/**/*.ts | repomix --stdin

# Dosya yollarını içeren bir dosyadan
cat file-list.txt | repomix --stdin

# echo ile doğrudan girdi
echo -e "src/index.ts\nsrc/utils.ts" | repomix --stdin
```

`--stdin` seçeneği, Repomix'e bir dosya yolları listesi iletmenize olanak tanır ve hangi dosyaların paketleneceğini seçmede tam esneklik sağlar.

`--stdin` kullanıldığında, belirtilen dosyalar include desenlerine eklenir. Bu, normal dahil etme ve dışarıda bırakma davranışının hâlâ geçerli olduğu anlamına gelir; stdin aracılığıyla belirtilen dosyalar, ignore desenleriyle eşleşiyorsa yine de dışarıda bırakılır.

> [!NOTE]
> `--stdin` kullanıldığında dosya yolları göreceli veya mutlak olabilir; Repomix yol çözümlemesi ve tekilleştirmeyi otomatik olarak gerçekleştirir.

### Kod Sıkıştırma

```bash
repomix --compress

# Uzak depolarla da kullanabilirsiniz:
repomix --remote yamadashy/repomix --compress
```

### Git Entegrasyonu

Yapay zeka analizi için geliştirme bağlamı sağlamak amacıyla Git bilgilerini ekleyin:

```bash
# Git diff'lerini ekle (kaydedilmemiş değişiklikler)
repomix --include-diffs

# Git commit loglarını ekle (varsayılan olarak son 50 commit)
repomix --include-logs

# Belirli sayıda commit ekle
repomix --include-logs --include-logs-count 10

# Hem diff'leri hem de logları ekle
repomix --include-diffs --include-logs
```

Bu seçenek şu değerli bağlamları ekler:
- **Son değişiklikler**: Git diff'leri kaydedilmemiş değişiklikleri gösterir
- **Geliştirme desenleri**: Git logları hangi dosyaların genellikle birlikte değiştirildiğini ortaya koyar
- **Commit geçmişi**: Son commit mesajları geliştirme odağına ilişkin bilgi sağlar
- **Dosya ilişkileri**: Hangi dosyaların aynı commit'lerde değiştirildiğini anlamayı kolaylaştırır

### Token Sayısı Optimizasyonu

Yapay zeka etkileşimlerini optimize etmek için kod tabanınızın token dağılımını anlamak çok önemlidir. Projenizde token kullanımını görselleştirmek için `--token-count-tree` seçeneğini kullanın:

```bash
repomix --token-count-tree
```

Bu seçenek, token sayılarıyla birlikte kod tabanınızın hiyerarşik bir görünümünü gösterir:

```text
🔢 Token Count Tree:
────────────────────
└── src/ (70,925 tokens)
    ├── cli/ (12,714 tokens)
    │   ├── actions/ (7,546 tokens)
    │   └── reporters/ (990 tokens)
    └── core/ (41,600 tokens)
        ├── file/ (10,098 tokens)
        └── output/ (5,808 tokens)
```

Daha büyük dosyalara odaklanmak için minimum token eşiği de belirleyebilirsiniz:

```bash
repomix --token-count-tree 1000  # Yalnızca 1000+ token içeren dosya/dizinleri göster
```

Bu özellik şunlara yardımcı olur:
- **Token açısından ağır dosyaları tespit etme**: Yapay zeka bağlam limitlerini aşabilecek dosyaları bulun
- **Dosya seçimini optimize etme**: `--include` ve `--ignore` desenlerini kullanarak seçimi daraltın
- **Sıkıştırma stratejileri planlama**: En büyük katkı sağlayan dosyaları hedefleyin
- **İçerik ve bağlam dengesini kurma**: Yapay zeka analizi için kod hazırlarken optimum denge sağlayın

## Çıktı Formatları

### XML (Varsayılan)
```bash
repomix --style xml
```

### Markdown
```bash
repomix --style markdown
```

### JSON
```bash
repomix --style json
```

### Düz Metin
```bash
repomix --style plain
```

## Ek Seçenekler

### Yorumları Kaldırma
```bash
repomix --remove-comments
```

### Satır Numaralarını Gösterme
```bash
repomix --output-show-line-numbers
```

### Panoya Kopyalama
```bash
repomix --copy
```

### Güvenlik Kontrolünü Devre Dışı Bırakma
```bash
repomix --no-security-check
```

## Yapılandırma

Yapılandırma dosyasını başlatın:
```bash
repomix --init
```

Ayrıntılı seçenekler için [Yapılandırma Rehberi](/tr/guide/configuration)'ne bakın.
