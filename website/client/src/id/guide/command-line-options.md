# Opsi Baris Perintah

## Opsi Dasar
- `-v, --version`: Menampilkan versi alat

## Opsi Input/Output CLI
- `--verbose`: Mengaktifkan pencatatan verbose
- `--quiet`: Menonaktifkan semua output ke stdout
- `--stdout`: Output ke stdout alih-alih menulis ke file (tidak dapat digunakan dengan opsi `--output`)
- `--stdin`: Membaca jalur file dari stdin alih-alih menemukan file secara otomatis
- `--copy`: Menyalin output yang dihasilkan ke clipboard sistem
- `--token-count-tree [threshold]`: Menampilkan pohon file dengan ringkasan jumlah token (opsional: ambang batas jumlah token minimum). Berguna untuk mengidentifikasi file besar dan mengoptimalkan penggunaan token untuk batas konteks AI
- `--top-files-len <number>`: Jumlah file terbesar untuk ditampilkan dalam ringkasan (default: 5, contoh: --top-files-len 20)

## Opsi Output Repomix
- `-o, --output <file>`: Jalur file output (default: repomix-output.xml, gunakan "-" untuk stdout)
- `--style <type>`: Format output: xml, markdown, json atau plain (default: xml)
- `--parsable-style`: Mengaktifkan output yang dapat diurai berdasarkan skema gaya yang dipilih. Perhatikan bahwa ini dapat meningkatkan jumlah token.
- `--compress`: Melakukan ekstraksi kode cerdas, fokus pada tanda tangan fungsi dan kelas penting untuk mengurangi jumlah token
- `--output-show-line-numbers`: Menampilkan nomor baris dalam output
- `--no-file-summary`: Menonaktifkan output bagian ringkasan file
- `--no-directory-structure`: Menonaktifkan output bagian struktur direktori
- `--no-files`: Menonaktifkan output konten file (mode hanya metadata)
- `--remove-comments`: Menghapus komentar dari jenis file yang didukung
- `--remove-empty-lines`: Menghapus baris kosong dari output
- `--truncate-base64`: Mengaktifkan pemotongan string data base64
- `--header-text <text>`: Teks kustom untuk disertakan dalam header file
- `--instruction-file-path <path>`: Jalur ke file yang berisi instruksi kustom terperinci
- `--split-output <size>`: Membagi output menjadi beberapa file bernomor (mis: repomix-output.1.xml, repomix-output.2.xml); contohnya 500kb, 2mb, atau 1.5mb
- `--include-empty-directories`: Menyertakan direktori kosong dalam output
- `--include-full-directory-structure`: Menampilkan pohon repositori lengkap di bagian Struktur Direktori, bahkan saat menggunakan pola --include
- `--include-diffs`: Menyertakan diff git dalam output (menyertakan perubahan pohon kerja dan perubahan staged secara terpisah)
- `--include-logs`: Menyertakan log git dalam output (menyertakan riwayat commit dengan tanggal, pesan, dan jalur file)
- `--include-logs-count <count>`: Jumlah commit log git yang akan disertakan (default: 50)
- `--no-git-sort-by-changes`: Menonaktifkan pengurutan file berdasarkan jumlah perubahan git (diaktifkan secara default)

## Opsi Seleksi File
- `--include <patterns>`: Daftar pola penyertaan (dipisahkan koma)
- `-i, --ignore <patterns>`: Pola pengabaian tambahan (dipisahkan koma)
- `--no-gitignore`: Menonaktifkan penggunaan file .gitignore
- `--no-dot-ignore`: Menonaktifkan penggunaan file .ignore
- `--no-default-patterns`: Menonaktifkan pola default

## Opsi Repositori Remote
- `--remote <url>`: Memproses repositori remote
- `--remote-branch <name>`: Menentukan nama branch remote, tag, atau hash commit (default ke branch default repositori)

## Opsi Konfigurasi
- `-c, --config <path>`: Jalur file konfigurasi kustom
- `--init`: Membuat file konfigurasi
- `--global`: Menggunakan konfigurasi global

## Opsi Keamanan
- `--no-security-check`: Lewati pemindaian data sensitif seperti kunci API dan kata sandi

## Opsi Jumlah Token
- `--token-count-encoding <encoding>`: Model tokenizer untuk penghitungan: o200k_base (GPT-4o), cl100k_base (GPT-3.5/4), dll. (default: o200k_base)

## Opsi MCP
- `--mcp`: Jalankan sebagai server Model Context Protocol untuk integrasi alat AI

## Contoh

```bash
# Penggunaan dasar
repomix

# File output dan format kustom
repomix -o my-output.xml --style xml

# Output ke stdout
repomix --stdout > custom-output.txt

# Output ke stdout, kemudian pipe ke perintah lain (mis., simonw/llm)
repomix --stdout | llm "Tolong jelaskan apa yang dilakukan kode ini."

# Output kustom dengan kompresi
repomix --compress

# Memproses file tertentu dengan pola
repomix --include "src/**/*.ts,*.md" --ignore "*.test.js,docs/**"

# Repositori remote dengan branch
repomix --remote https://github.com/user/repo/tree/main

# Repositori remote dengan commit
repomix --remote https://github.com/user/repo/commit/836abcd7335137228ad77feb28655d85712680f1

# Repositori remote dengan bentuk singkat
repomix --remote user/repo

# Daftar file menggunakan stdin
find src -name "*.ts" -type f | repomix --stdin
git ls-files "*.js" | repomix --stdin
echo -e "src/index.ts\nsrc/utils.ts" | repomix --stdin

# Integrasi Git
repomix --include-diffs  # Sertakan diff git untuk perubahan yang belum di-commit
repomix --include-logs   # Sertakan log git (50 commit terakhir secara default)
repomix --include-logs --include-logs-count 10  # Sertakan 10 commit terakhir
repomix --include-diffs --include-logs  # Sertakan diff dan log

# Analisis jumlah token
repomix --token-count-tree
repomix --token-count-tree 1000  # Hanya tampilkan file/direktori dengan 1000+ token
```

