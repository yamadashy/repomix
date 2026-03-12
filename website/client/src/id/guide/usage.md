# Penggunaan Dasar


Repomix dirancang untuk menjadi alat yang mudah digunakan dengan antarmuka command-line yang sederhana. Berikut adalah panduan penggunaan dasar.

## Perintah Dasar

Untuk mengemas seluruh repositori Anda:

```bash
repomix
```

Ini akan menghasilkan file `repomix-output.xml` di direktori saat ini, berisi seluruh repositori Anda dalam format yang ramah AI.

## Mengemas Direktori Tertentu

Untuk mengemas direktori tertentu:

```bash
repomix path/to/directory
```

## Menggunakan Pola Glob

Untuk mengemas file atau direktori tertentu menggunakan [pola glob](https://github.com/mrmlnc/fast-glob?tab=readme-ov-file#pattern-syntax):

```bash
repomix --include "src/**/*.ts,**/*.md"
```

## Mengecualikan File atau Direktori

Untuk mengecualikan file atau direktori tertentu:

```bash
repomix --ignore "**/*.log,tmp/"
```

### Membagi Output ke Beberapa File

Saat bekerja dengan codebase besar, output yang dikemas mungkin melebihi batas ukuran file yang diberlakukan oleh beberapa alat AI (misalnya, batas 1MB Google AI Studio). Gunakan `--split-output` untuk secara otomatis membagi output menjadi beberapa file:

```bash
repomix --split-output 1mb
```

Ini menghasilkan file bernomor seperti:
- `repomix-output.1.xml`
- `repomix-output.2.xml`
- `repomix-output.3.xml`

Ukuran dapat ditentukan dengan unit: `500kb`, `1mb`, `2mb`, `1.5mb`, dll. Nilai desimal didukung.

> [!NOTE]
> File dikelompokkan berdasarkan direktori tingkat atas untuk mempertahankan konteks. Satu file atau direktori tidak akan pernah dibagi di antara beberapa file output.

## Mengemas Repositori Jarak Jauh

Repomix dapat mengemas repositori GitHub publik:

```bash
# Menggunakan format singkat
npx repomix --remote yamadashy/repomix

# Menggunakan URL lengkap (mendukung cabang dan jalur tertentu)
npx repomix --remote https://github.com/yamadashy/repomix
npx repomix --remote https://github.com/yamadashy/repomix/tree/main

# Menggunakan URL commit
npx repomix --remote https://github.com/yamadashy/repomix/commit/836abcd7335137228ad77feb28655d85712680f1
```

## Input Daftar File (stdin)

Masukkan jalur file melalui stdin untuk fleksibilitas maksimum:

```bash
# Menggunakan perintah find
find src -name "*.ts" -type f | repomix --stdin

# Menggunakan git untuk mendapatkan file yang terlacak
git ls-files "*.ts" | repomix --stdin

# Menggunakan grep untuk mencari file yang berisi konten tertentu
grep -l "TODO" **/*.ts | repomix --stdin

# Menggunakan ripgrep untuk mencari file dengan konten tertentu
rg -l "TODO|FIXME" --type ts | repomix --stdin

# Menggunakan ripgrep (rg) untuk mencari file
rg --files --type ts | repomix --stdin

# Menggunakan sharkdp/fd untuk mencari file
fd -e ts | repomix --stdin

# Menggunakan fzf untuk memilih dari semua file
fzf -m | repomix --stdin

# Pemilihan file interaktif dengan fzf
find . -name "*.ts" -type f | fzf -m | repomix --stdin

# Menggunakan ls dengan pola glob
ls src/**/*.ts | repomix --stdin

# Dari file yang berisi jalur file
cat file-list.txt | repomix --stdin

# Input langsung dengan echo
echo -e "src/index.ts\nsrc/utils.ts" | repomix --stdin
```

Opsi `--stdin` memungkinkan Anda untuk mem-pipe daftar jalur file ke Repomix, memberikan fleksibilitas maksimum dalam memilih file mana yang akan dikemas.

Saat menggunakan `--stdin`, file yang ditentukan secara efektif ditambahkan ke pola include. Ini berarti perilaku include dan ignore normal masih berlaku - file yang ditentukan melalui stdin masih akan dikecualikan jika cocok dengan pola ignore.

> [!NOTE]
> Saat menggunakan `--stdin`, jalur file dapat berupa jalur relatif atau absolut, dan Repomix akan menangani resolusi jalur dan deduplikasi secara otomatis.

### Kompresi Kode

```bash
repomix --compress

# Anda juga dapat menggunakannya dengan repositori jarak jauh:
repomix --remote yamadashy/repomix --compress
```

### Integrasi Git

Sertakan informasi Git untuk memberikan konteks pengembangan bagi analisis AI:

```bash
# Sertakan diff git (perubahan yang belum di-commit)
repomix --include-diffs

# Sertakan log commit git (50 commit terakhir secara default)
repomix --include-logs

# Sertakan jumlah commit tertentu
repomix --include-logs --include-logs-count 10

# Sertakan diff dan log
repomix --include-diffs --include-logs
```

Ini menambahkan konteks berharga tentang:
- **Perubahan terbaru**: Diff Git menunjukkan modifikasi yang belum di-commit
- **Pola pengembangan**: Log Git mengungkapkan file mana yang biasanya diubah bersamaan
- **Riwayat commit**: Pesan commit terbaru memberikan wawasan tentang fokus pengembangan
- **Hubungan file**: Memahami file mana yang dimodifikasi dalam commit yang sama

### Optimisasi Jumlah Token

Memahami distribusi token dari basis kode Anda sangat penting untuk mengoptimalkan interaksi AI. Gunakan opsi `--token-count-tree` untuk memvisualisasikan penggunaan token di seluruh proyek Anda:

```bash
repomix --token-count-tree
```

Ini menampilkan tampilan hierarkis dari basis kode Anda dengan jumlah token:

```
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

Anda juga dapat menetapkan ambang batas minimum token untuk fokus pada file yang lebih besar:

```bash
repomix --token-count-tree 1000  # Hanya tampilkan file/direktori dengan 1000+ token
```

Ini membantu Anda:
- **Mengidentifikasi file yang berat token** - yang mungkin melebihi batas konteks AI
- **Mengoptimalkan pemilihan file** - menggunakan pola `--include` dan `--ignore`
- **Merencanakan strategi kompresi** - menargetkan kontributor terbesar
- **Menyeimbangkan konten vs konteks** - saat mempersiapkan kode untuk analisis AI

## Format Output

### XML (Default)
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

### Plain Text
```bash
repomix --style plain
```

## Opsi Tambahan

### Hapus Komentar
```bash
repomix --remove-comments
```

### Tampilkan Nomor Baris
```bash
repomix --output-show-line-numbers
```

### Salin ke Clipboard
```bash
repomix --copy
```

### Nonaktifkan Pemeriksaan Keamanan
```bash
repomix --no-security-check
```

## Konfigurasi

Untuk menginisialisasi file konfigurasi baru (`repomix.config.json`):

```bash
repomix --init
```

Untuk informasi lebih lanjut tentang konfigurasi, lihat [Panduan Konfigurasi](configuration.md).

## Penggunaan Docker

Anda juga dapat menjalankan Repomix menggunakan Docker:

```bash
docker run -v .:/app -it --rm ghcr.io/yamadashy/repomix
```

Untuk mengemas direktori tertentu:
```bash
docker run -v .:/app -it --rm ghcr.io/yamadashy/repomix path/to/directory
```

Memproses repositori jarak jauh dan output ke direktori `output`:

```bash
docker run -v ./output:/app -it --rm ghcr.io/yamadashy/repomix --remote https://github.com/yamadashy/repomix
```

## Langkah Selanjutnya

Setelah Anda menghasilkan file yang dikemas, Anda dapat menggunakannya dengan alat AI Generatif seperti Claude, ChatGPT, dan Gemini.

Untuk informasi lebih lanjut tentang opsi baris perintah, lihat [Opsi Baris Perintah](command-line-options.md).
