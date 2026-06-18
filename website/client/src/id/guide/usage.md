---
title: Penggunaan Dasar
description: Gunakan Repomix CLI untuk mengemas direktori, repositori remote, file terpilih, git diff, log commit, output terpisah, jumlah token, dan kode terkompresi.
---

# Penggunaan Dasar

## Mulai Cepat

Kemas seluruh repositori Anda:
```bash
repomix
```

## Kasus Penggunaan Umum

### Mengemas Direktori Tertentu
```bash
repomix path/to/directory
```

### Menyertakan File Tertentu
Gunakan [pola glob](https://github.com/mrmlnc/fast-glob?tab=readme-ov-file#pattern-syntax):
```bash
repomix --include "src/**/*.ts,**/*.md"
```

### Mengecualikan File
```bash
repomix --ignore "**/*.log,tmp/"
```

### Membagi Output Menjadi Beberapa File

Saat bekerja dengan basis kode besar, output yang dikemas dapat melebihi batas ukuran file yang diberlakukan oleh beberapa alat AI (misalnya, batas 1MB Google AI Studio). Gunakan `--split-output` untuk membagi output menjadi beberapa file secara otomatis:

```bash
repomix --split-output 1mb
```

Ini menghasilkan file bernomor seperti:
- `repomix-output.1.xml`
- `repomix-output.2.xml`
- `repomix-output.3.xml`

Ukuran dapat ditentukan dengan satuan: `500kb`, `1mb`, `2mb`, `1.5mb`, dll. Nilai desimal didukung.

> [!NOTE]
> File dikelompokkan berdasarkan direktori tingkat atas untuk mempertahankan konteks. Satu file atau direktori tidak akan pernah dibagi ke beberapa file output.

### Repositori Remote
```bash
# Menggunakan URL GitHub
repomix --remote https://github.com/user/repo

# Menggunakan singkatan
repomix --remote user/repo

# Menggunakan singkatan tanpa --remote (terdeteksi otomatis)
repomix user/repo

# Branch/tag/commit tertentu
repomix --remote user/repo --remote-branch main
repomix --remote user/repo --remote-branch 935b695
```

### Input Daftar File (stdin)

Berikan path file melalui stdin untuk fleksibilitas maksimal:

```bash
# Menggunakan perintah find
find src -name "*.ts" -type f | repomix --stdin

# Menggunakan git untuk mendapatkan file yang dilacak
git ls-files "*.ts" | repomix --stdin

# Menggunakan ripgrep (rg) untuk menemukan file
rg --files --type ts | repomix --stdin

# Menggunakan grep untuk menemukan file yang berisi konten tertentu
grep -l "TODO" **/*.ts | repomix --stdin

# Menggunakan ripgrep untuk menemukan file dengan konten tertentu
rg -l "TODO|FIXME" --type ts | repomix --stdin

# Menggunakan sharkdp/fd untuk menemukan file
fd -e ts | repomix --stdin

# Menggunakan fzf untuk memilih dari semua file
fzf -m | repomix --stdin

# Pemilihan file interaktif dengan fzf
find . -name "*.ts" -type f | fzf -m | repomix --stdin

# Menggunakan ls dengan pola glob
ls src/**/*.ts | repomix --stdin

# Dari file yang berisi path file
cat file-list.txt | repomix --stdin

# Input langsung dengan echo
echo -e "src/index.ts\nsrc/utils.ts" | repomix --stdin
```

Opsi `--stdin` memungkinkan Anda menyalurkan daftar path file ke Repomix, memberi Anda fleksibilitas maksimal dalam memilih file mana yang akan dikemas.

Saat menggunakan `--stdin`, file yang ditentukan secara efektif ditambahkan ke pola include. Ini berarti perilaku include dan ignore normal tetap berlaku: file yang ditentukan melalui stdin akan tetap dikecualikan jika cocok dengan pola ignore.

> [!NOTE]
> Saat menggunakan `--stdin`, path file dapat berupa relatif atau absolut, dan Repomix akan secara otomatis menangani resolusi path dan deduplikasi.

### Kompresi Kode {#code-compression}

Mengurangi jumlah token sambil mempertahankan struktur kode. Lihat [panduan Kompresi Kode](/id/guide/code-compress) untuk detailnya.

```bash
repomix --compress

# Anda juga dapat menggunakannya dengan repositori remote:
repomix --remote yamadashy/repomix --compress
```

### Integrasi Git

Sertakan informasi Git untuk memberikan konteks pengembangan bagi analisis AI:

```bash
# Sertakan git diff (perubahan yang belum di-commit)
repomix --include-diffs

# Sertakan log commit git (50 commit terakhir secara default)
repomix --include-logs

# Sertakan jumlah commit tertentu
repomix --include-logs --include-logs-count 10

# Sertakan diff dan log
repomix --include-diffs --include-logs
```

Ini menambahkan konteks berharga tentang:
- **Perubahan terbaru**: Git diff menunjukkan modifikasi yang belum di-commit
- **Pola pengembangan**: Git log mengungkapkan file mana yang biasanya diubah bersama
- **Riwayat commit**: Pesan commit terbaru memberikan wawasan tentang fokus pengembangan
- **Hubungan file**: Memahami file mana yang dimodifikasi dalam commit yang sama

### Optimasi Jumlah Token

Memahami distribusi token basis kode Anda sangat penting untuk mengoptimalkan interaksi AI. Gunakan opsi `--token-count-tree` untuk memvisualisasikan penggunaan token di seluruh proyek Anda:

```bash
repomix --token-count-tree
```

Ini menampilkan tampilan hierarkis basis kode Anda dengan jumlah token:

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

Anda juga dapat menetapkan ambang batas token minimum untuk fokus pada file yang lebih besar:

```bash
repomix --token-count-tree 1000  # Hanya tampilkan file/direktori dengan 1000+ token
```

Ini membantu Anda:
- **Mengidentifikasi file dengan banyak token** yang mungkin melebihi batas konteks AI
- **Mengoptimalkan pemilihan file** menggunakan pola `--include` dan `--ignore`
- **Merencanakan strategi kompresi** dengan menargetkan kontributor terbesar
- **Menyeimbangkan konten vs. konteks** saat menyiapkan kode untuk analisis AI

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

### Teks Biasa
```bash
repomix --style plain
```

## Opsi Tambahan

### Hapus Komentar

Lihat [Penghapusan Komentar](/id/guide/comment-removal) untuk bahasa yang didukung dan detailnya.

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

Lihat [Keamanan](/id/guide/security) untuk detail tentang apa yang dideteksi Repomix.

```bash
repomix --no-security-check
```

## Konfigurasi

Inisialisasi file konfigurasi:
```bash
repomix --init
```

Lihat [Panduan Konfigurasi](/id/guide/configuration) untuk opsi terperinci.

## Sumber Daya Terkait

- [Format Output](/id/guide/output) - Pelajari tentang format XML, Markdown, JSON, dan teks biasa
- [Opsi Baris Perintah](/id/guide/command-line-options) - Referensi CLI lengkap
- [Contoh Prompt](/id/guide/prompt-examples) - Contoh prompt untuk analisis AI
- [Kasus Penggunaan](/id/guide/use-cases) - Contoh dan alur kerja dunia nyata
