# Pemrosesan Repositori GitHub


Repomix dapat memproses repositori GitHub publik secara langsung tanpa perlu mengkloning mereka secara lokal terlebih dahulu. Ini sangat berguna untuk menganalisis proyek open source atau berbagi basis kode dengan AI tanpa mengunduh seluruh repositori.

## Penggunaan Dasar

Untuk memproses repositori remote, gunakan flag `--remote`:

```bash
# Menggunakan format singkat
npx repomix --remote yamadashy/repomix

# Menggunakan URL lengkap
npx repomix --remote https://github.com/yamadashy/repomix
```

## Format yang Didukung

Repomix mendukung beberapa format URL dan referensi:

### Format Singkat

```bash
npx repomix --remote pemilik/repo
```

### URL Lengkap

```bash
npx repomix --remote https://github.com/pemilik/repo
```

### Cabang Tertentu

```bash
npx repomix --remote https://github.com/pemilik/repo/tree/nama-cabang
```

### Commit Tertentu

```bash
npx repomix --remote https://github.com/pemilik/repo/commit/hash-commit
```

### Direktori Tertentu

```bash
npx repomix --remote https://github.com/pemilik/repo/tree/main/path/to/directory
```

## Opsi Tambahan

Anda dapat menggabungkan pemrosesan repositori remote dengan opsi Repomix lainnya:

```bash
# Menggunakan format Markdown
npx repomix --remote pemilik/repo --style markdown

# Menghapus komentar
npx repomix --remote pemilik/repo --remove-comments

# Mengabaikan file tertentu
npx repomix --remote pemilik/repo --ignore "*.log,tmp/"
```

## Batasan

Saat memproses repositori remote, perhatikan batasan berikut:

- Hanya repositori GitHub publik yang didukung
- Ukuran repositori yang sangat besar mungkin memerlukan waktu lebih lama untuk diproses
- Beberapa fitur seperti penghormatan terhadap `.gitignore` mungkin berperilaku berbeda dibandingkan dengan repositori lokal

## Keamanan

Demi keamanan, file konfigurasi (`repomix.config.*`) di dalam repositori remote tidak dimuat secara default. Ini mencegah repositori yang tidak dipercaya mengeksekusi kode melalui file konfigurasi seperti `repomix.config.ts`.

Konfigurasi global dan opsi CLI Anda tetap diterapkan seperti biasa.

Untuk memercayai konfigurasi repositori remote:

```bash
# Menggunakan flag CLI
repomix --remote user/repo --remote-trust-config

# Menggunakan variabel lingkungan
REPOMIX_REMOTE_TRUST_CONFIG=true repomix --remote user/repo
```

## Kasus Penggunaan

Pemrosesan repositori remote sangat berguna untuk:

- Menganalisis proyek open source tanpa mengkloning seluruh repositori
- Berbagi basis kode dengan AI untuk mendapatkan wawasan cepat
- Memeriksa bagian tertentu dari repositori besar
- Membandingkan implementasi di berbagai proyek
