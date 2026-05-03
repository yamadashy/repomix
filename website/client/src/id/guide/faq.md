---
title: FAQ dan Pemecahan Masalah
description: Jawaban untuk pertanyaan umum tentang Repomix, repository privat, dukungan C# dan Python, agent kompatibel MCP, format output, pengurangan token, keamanan, dan workflow AI.
---

# FAQ dan Pemecahan Masalah

Halaman ini membantu memilih workflow Repomix yang tepat, mengurangi output besar, dan menyiapkan konteks codebase untuk asisten AI.

## Pertanyaan umum

### Untuk apa Repomix digunakan?

Repomix mengemas repository menjadi satu file yang ramah AI. Anda dapat memberi ChatGPT, Claude, Gemini, atau asisten lain konteks codebase lengkap untuk code review, investigasi bug, refactoring, dokumentasi, dan onboarding.

### Apakah Repomix bekerja dengan repository privat?

Ya. Jalankan Repomix secara lokal di checkout yang sudah dapat diakses mesin Anda:

```bash
repomix
```

Tinjau file yang dihasilkan sebelum membagikannya ke layanan AI eksternal.

### Bisakah memproses repository GitHub publik tanpa clone?

Ya. Gunakan `--remote` dengan shorthand atau URL lengkap:

```bash
npx repomix --remote yamadashy/repomix
npx repomix --remote https://github.com/yamadashy/repomix
```

### Format output mana yang sebaiknya dipilih?

Mulai dari XML default jika ragu. Gunakan Markdown untuk percakapan yang mudah dibaca, JSON untuk automation, dan plain text untuk kompatibilitas maksimum.

```bash
repomix --style markdown
repomix --style json
```

Lihat [Format Output](/id/guide/output).

## Mengurangi penggunaan token

### File yang dihasilkan terlalu besar. Apa yang harus dilakukan?

Persempit konteks:

```bash
repomix --include "src/**/*.ts,docs/**/*.md"
repomix --ignore "**/*.test.ts,dist/**"
repomix --compress
repomix --remove-comments
```

Untuk repository besar, gabungkan pola include/ignore dengan kompresi kode.

### Apa fungsi `--compress`?

`--compress` mempertahankan struktur penting seperti imports, exports, class, function, dan interface, sambil menghapus banyak detail implementasi. Ini berguna untuk memahami arsitektur.

## Keamanan dan privasi

### Apakah CLI mengunggah kode saya?

Repomix CLI berjalan lokal dan menulis file output di mesin Anda. Website dan ekstensi browser memiliki workflow berbeda; lihat [Kebijakan Privasi](/id/guide/privacy).

### Bagaimana Repomix mencegah secret ikut masuk?

Repomix menggunakan safety check berbasis Secretlint. Anggap ini sebagai perlindungan tambahan dan selalu tinjau output.

## Pemecahan masalah

### Mengapa ada file yang hilang dari output?

Repomix mengikuti `.gitignore`, aturan ignore default, dan pola custom. Periksa `repomix.config.json`, `--ignore`, dan aturan git ignore.

### Bagaimana membuat output reproducible untuk tim?

Buat dan commit konfigurasi bersama:

```bash
repomix --init
```

## Pertanyaan umum tambahan

### Apakah Repomix bekerja dengan C#, Python, Java, Go, Rust, atau bahasa lain?

Ya. Repomix membaca file dari project Anda dan memformatnya untuk tool AI, sehingga dapat mem-pack repository dalam bahasa pemrograman apa pun. CLI membutuhkan Node.js 20 atau lebih baru. Beberapa fitur lanjutan, seperti kompresi kode berbasis Tree-sitter, bergantung pada dukungan parser untuk setiap bahasa.

### Bisakah saya menggunakan Repomix dengan Hermes Agent, OpenClaw, atau agent lain yang kompatibel dengan MCP?

Ya. Repomix dapat berjalan sebagai MCP server:

```bash
npx -y repomix --mcp
```

Untuk Hermes Agent, tambahkan Repomix sebagai stdio MCP server di `~/.hermes/config.yaml`:

```yaml
mcp_servers:
  repomix:
    command: "npx"
    args: ["-y", "repomix", "--mcp"]
```

Untuk OpenClaw atau agent lain yang kompatibel dengan MCP, gunakan command dan args yang sama di tempat agent tersebut mengizinkan konfigurasi external stdio MCP server. Jika assistant Anda mendukung Agent Skills, Anda juga dapat memakai [Repomix Explorer Skill](/id/guide/repomix-explorer-skill).

### Bagaimana memakai Repomix agar AI assistant memahami library atau framework baru?

Pack repository library atau dokumentasinya, lalu berikan output sebagai referensi untuk AI assistant:

```bash
npx repomix --remote owner/repo
npx repomix --remote owner/repo --include "docs/**,src/**"
```

Untuk penggunaan berulang, Anda dapat membuat direktori Agent Skills yang dapat digunakan kembali:

```bash
npx repomix --remote owner/repo --skill-generate library-reference
```

### Bagaimana mengecualikan CSS, test, build output, atau file noisy lainnya?

Gunakan `--ignore` untuk perintah sekali jalan:

```bash
repomix --ignore "**/*.css,**/*.test.ts,dist/**,coverage/**"
```

Gunakan `--include` jika hanya ingin mempertahankan path source atau dokumentasi tertentu:

```bash
repomix --include "src/**/*.ts,docs/**/*.md"
```

### Apakah ada batas ukuran repository?

CLI tidak memiliki batas ukuran repository tetap, tetapi repository sangat besar dapat dibatasi oleh memori, ukuran file, atau batas upload dan context dari tool AI. Untuk project besar, mulai dari include pattern yang terarah, periksa file dengan token besar, dan pisahkan output jika diperlukan:

```bash
repomix --token-count-tree 1000
repomix --split-output 1mb
```

### Mengapa `--include` tidak menyertakan file dari `node_modules`, direktori build, atau path yang di-ignore?

`--include` mempersempit file yang dicoba untuk di-pack oleh Repomix, tetapi aturan ignore tetap berlaku. File masih dapat dikecualikan oleh `.gitignore`, `.ignore`, `.repomixignore`, pola default bawaan, atau `repomix.config.json`. Untuk kasus lanjutan, opsi seperti `--no-gitignore` atau `--no-default-patterns` dapat membantu, tetapi gunakan dengan hati-hati karena dapat menyertakan dependencies, artefak build, atau file noisy lainnya.

## Referensi terkait

- [Penggunaan Dasar](/id/guide/usage)
- [Opsi Command Line](/id/guide/command-line-options)
- [Kompresi Kode](/id/guide/code-compress)
- [Keamanan](/id/guide/security)
