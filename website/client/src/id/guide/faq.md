---
title: FAQ dan Pemecahan Masalah
description: Jawaban untuk pertanyaan umum tentang Repomix, repository privat, format output, pengurangan token, repository GitHub remote, keamanan, dan workflow AI.
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

## Referensi terkait

- [Penggunaan Dasar](/id/guide/usage)
- [Opsi Command Line](/id/guide/command-line-options)
- [Kompresi Kode](/id/guide/code-compress)
- [Keamanan](/id/guide/security)
