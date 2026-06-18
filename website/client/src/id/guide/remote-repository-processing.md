---
title: Pemrosesan Repositori GitHub
description: Kemas repositori GitHub dengan Repomix menggunakan URL lengkap, singkatan user/repo, branch, tag, commit, Docker, dan kontrol kepercayaan konfigurasi remote.
---

# Pemrosesan Repositori GitHub

## Penggunaan Dasar

Memproses repositori publik:
```bash
# Menggunakan URL lengkap
repomix --remote https://github.com/user/repo

# Menggunakan singkatan GitHub
repomix --remote user/repo
```

Anda juga dapat memberikan singkatan `owner/repo` secara langsung, tanpa `--remote`:

```bash
repomix yamadashy/repomix
```

Karena `owner/repo` juga terlihat seperti path lokal relatif, Repomix hanya memperlakukannya sebagai repositori remote ketika tidak ada file atau direktori lokal dengan nama tersebut dan repositori dapat dijangkau di GitHub. Path lokal yang cocok selalu diutamakan; untuk memaksa penanganan lokal pada path berbentuk `owner/repo`, awali dengan `./` (misalnya, `repomix ./owner/repo`). Jika argumen cocok dengan pola tetapi repositori tidak dapat dijangkau (misalnya, repositori privat atau salah ketik), Repomix kembali menanganinya sebagai path lokal.

## Pemilihan Branch dan Commit

```bash
# Branch tertentu
repomix --remote user/repo --remote-branch main

# Tag
repomix --remote user/repo --remote-branch v1.0.0

# Hash commit
repomix --remote user/repo --remote-branch 935b695
```

## Persyaratan

- Git harus terpasang
- Koneksi internet
- Akses baca ke repositori

## Kontrol Output

```bash
# Lokasi output kustom
repomix --remote user/repo -o custom-output.xml

# Dengan format XML
repomix --remote user/repo --style xml

# Hapus komentar
repomix --remote user/repo --remove-comments
```

## Penggunaan Docker

```bash
# Memproses dan menghasilkan output ke direktori saat ini
docker run -v .:/app -it --rm ghcr.io/yamadashy/repomix \
  --remote user/repo

# Menghasilkan output ke direktori tertentu
docker run -v ./output:/app -it --rm ghcr.io/yamadashy/repomix \
  --remote user/repo
```

## Keamanan

Demi keamanan, file konfigurasi (`repomix.config.*`) di repositori remote tidak dimuat secara default. Ini mencegah repositori yang tidak tepercaya menjalankan kode melalui file konfigurasi seperti `repomix.config.ts`.

Konfigurasi global dan opsi CLI Anda tetap diterapkan.

Untuk mempercayai konfigurasi repositori remote:

```bash
# Menggunakan flag CLI
repomix --remote user/repo --remote-trust-config

# Menggunakan variabel lingkungan
REPOMIX_REMOTE_TRUST_CONFIG=true repomix --remote user/repo
```

Saat menggunakan `--config` dengan `--remote`, path absolut diperlukan:

```bash
repomix --remote user/repo --config /home/user/repomix.config.json
```

## Masalah Umum

### Masalah Akses
- Pastikan repositori bersifat publik
- Periksa instalasi Git
- Verifikasi koneksi internet

### Repositori Besar
- Gunakan `--include` untuk memilih path tertentu
- Aktifkan `--remove-comments`
- Proses branch secara terpisah

## Sumber Daya Terkait

- [Opsi Baris Perintah](/id/guide/command-line-options) - Referensi CLI lengkap termasuk opsi `--remote`
- [Konfigurasi](/id/guide/configuration) - Atur opsi default untuk pemrosesan remote
- [Kompresi Kode](/id/guide/code-compress) - Kurangi ukuran output untuk repositori besar
- [Keamanan](/id/guide/security) - Bagaimana Repomix menangani deteksi data sensitif
