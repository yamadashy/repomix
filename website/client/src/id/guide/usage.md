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

## Input Daftar File (pipe via stdin)

Masukkan jalur file melalui stdin untuk fleksibilitas maksimum:

```bash
# Menggunakan perintah find
find src -name "*.ts" -type f | repomix

# Menggunakan git untuk mendapatkan file yang terlacak
git ls-files "*.ts" | repomix

# Menggunakan ls dengan pola glob
ls src/**/*.ts | repomix

# Dari file yang berisi jalur file
cat file-list.txt | repomix

# Input langsung dengan echo
echo -e "src/index.ts\nsrc/utils.ts" | repomix

# Menggunakan perintah find dengan tanda hubung (indikator stdin eksplisit)
find src -name "*.ts" | repomix -
```

Repomix secara otomatis mendeteksi ketika jalur file di-pipe melalui stdin, memberikan fleksibilitas maksimum dalam memilih file mana yang akan dikemas.

> [!NOTE]
> Saat menggunakan input stdin, jalur file dapat berupa jalur relatif atau absolut, dan Repomix akan menangani resolusi jalur dan deduplikasi secara otomatis.

## Format Output

Pilih format output yang Anda inginkan:

```bash
# Format XML (default)
repomix --style xml

# Format Markdown
repomix --style markdown

# Format teks biasa
repomix --style plain
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
