# Opsi Baris Perintah

## Opsi Dasar
- `-v, --version`: Menampilkan versi alat

## Opsi Input/Output CLI

| Opsi | Deskripsi |
|------|-----------|
| `--verbose` | Mengaktifkan pencatatan debug detail (menampilkan pemrosesan file, jumlah token, dan detail konfigurasi) |
| `--quiet` | Menekan semua output konsol kecuali error (berguna untuk scripting) |
| `--stdout` | Menulis output yang dikemas langsung ke stdout alih-alih file (menekan semua pencatatan) |
| `--stdin` | Membaca jalur file dari stdin, satu per baris (file yang ditentukan langsung diproses) |
| `--copy` | Menyalin output yang dihasilkan ke clipboard sistem setelah pemrosesan |
| `--token-count-tree [threshold]` | Menampilkan pohon file dengan jumlah token; ambang batas opsional untuk menampilkan hanya file dengan ≥N token (mis. `--token-count-tree 100`) |
| `--top-files-len <number>` | Jumlah file terbesar untuk ditampilkan dalam ringkasan (default: `5`) |

## Opsi Output Repomix

| Opsi | Deskripsi |
|------|-----------|
| `-o, --output <file>` | Jalur file output (default: `repomix-output.xml`, gunakan `"-"` untuk stdout) |
| `--style <style>` | Format output: `xml`, `markdown`, `json`, atau `plain` (default: `xml`) |
| `--parsable-style` | Escape karakter khusus untuk memastikan XML/Markdown yang valid (diperlukan saat output berisi kode yang merusak format) |
| `--compress` | Mengekstrak struktur kode esensial (kelas, fungsi, interface) menggunakan parsing Tree-sitter |
| `--output-show-line-numbers` | Menambahkan nomor baris di depan setiap baris dalam output |
| `--no-file-summary` | Menghilangkan bagian ringkasan file dari output |
| `--no-directory-structure` | Menghilangkan visualisasi pohon direktori dari output |
| `--no-files` | Menghasilkan hanya metadata tanpa konten file (berguna untuk analisis repositori) |
| `--remove-comments` | Menghapus semua komentar kode sebelum pengemasan |
| `--remove-empty-lines` | Menghapus baris kosong dari semua file |
| `--truncate-base64` | Memotong string data base64 yang panjang untuk mengurangi ukuran output |
| `--header-text <text>` | Teks kustom untuk disertakan di awal output |
| `--instruction-file-path <path>` | Jalur ke file berisi instruksi kustom untuk disertakan dalam output |
| `--split-output <size>` | Membagi output menjadi beberapa file bernomor (mis. `repomix-output.1.xml`); ukuran seperti `500kb`, `2mb`, atau `1.5mb` |
| `--include-empty-directories` | Menyertakan folder tanpa file dalam struktur direktori |
| `--include-full-directory-structure` | Menampilkan pohon repositori lengkap di bagian Struktur Direktori, bahkan saat menggunakan pola `--include` |
| `--no-git-sort-by-changes` | Jangan mengurutkan file berdasarkan frekuensi perubahan git (default: file paling sering diubah dahulu) |
| `--include-diffs` | Menambahkan bagian git diff yang menampilkan perubahan pohon kerja dan staged |
| `--include-logs` | Menambahkan riwayat commit git dengan pesan dan file yang diubah |
| `--include-logs-count <count>` | Jumlah commit terbaru untuk disertakan dengan `--include-logs` (default: `50`) |

## Opsi Seleksi File

| Opsi | Deskripsi |
|------|-----------|
| `--include <patterns>` | Hanya menyertakan file yang cocok dengan pola glob ini (dipisahkan koma, mis. `"src/**/*.js,*.md"`) |
| `-i, --ignore <patterns>` | Pola tambahan untuk dikecualikan (dipisahkan koma, mis. `"*.test.js,docs/**"`) |
| `--no-gitignore` | Tidak menggunakan aturan `.gitignore` untuk memfilter file |
| `--no-dot-ignore` | Tidak menggunakan aturan `.ignore` untuk memfilter file |
| `--no-default-patterns` | Tidak menerapkan pola pengabaian bawaan (`node_modules`, `.git`, direktori build, dll.) |

## Opsi Repositori Remote

| Opsi | Deskripsi |
|------|-----------|
| `--remote <url>` | Mengkloning dan mengemas repositori remote (URL GitHub atau format `user/repo`) |
| `--remote-branch <name>` | Branch, tag, atau commit spesifik yang akan digunakan (default: branch default repositori) |
| `--remote-trust-config` | Memercayai dan memuat file konfigurasi dari repositori remote (dinonaktifkan secara default untuk keamanan) |

## Opsi Konfigurasi

| Opsi | Deskripsi |
|------|-----------|
| `-c, --config <path>` | Menggunakan file konfigurasi kustom alih-alih `repomix.config.json` |
| `--init` | Membuat file `repomix.config.json` baru dengan pengaturan default |
| `--global` | Dengan `--init`, membuat konfigurasi di direktori home alih-alih direktori saat ini |

## Opsi Keamanan
- `--no-security-check`: Lewati pemindaian data sensitif seperti kunci API dan kata sandi

## Opsi Jumlah Token
- `--token-count-encoding <encoding>`: Model tokenizer untuk penghitungan: o200k_base (GPT-4o), cl100k_base (GPT-3.5/4), dll. (default: o200k_base)

## Opsi MCP
- `--mcp`: Jalankan sebagai server Model Context Protocol untuk integrasi alat AI

## Opsi Pembuatan Agent Skills

| Opsi | Deskripsi |
|------|-----------|
| `--skill-generate [name]` | Menghasilkan output format Claude Agent Skills ke direktori `.claude/skills/<name>/` (nama otomatis dihasilkan jika dihilangkan) |
| `--skill-output <path>` | Menentukan jalur direktori output skill secara langsung (melewati prompt lokasi) |
| `-f, --force` | Melewati semua prompt konfirmasi (mis. penimpaan direktori skill) |

## Sumber Daya Terkait

- [Konfigurasi](/id/guide/configuration) - Atur opsi di file konfigurasi alih-alih flag CLI
- [Format Output](/id/guide/output) - Detail tentang format XML, Markdown, JSON, dan plain text
- [Kompresi Kode](/id/guide/code-compress) - Cara kerja `--compress` dengan Tree-sitter
- [Keamanan](/id/guide/security) - Apa yang dinonaktifkan oleh `--no-security-check`

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

