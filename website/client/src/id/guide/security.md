---
title: Keamanan
description: Pelajari bagaimana Repomix memakai Secretlint dan safety check untuk mendeteksi secret, API key, token, credential, dan konten repositori sensitif sebelum pengemasan.
---

# Keamanan


Repomix dirancang dengan fokus pada keamanan untuk membantu mencegah kebocoran informasi sensitif saat berbagi basis kode Anda dengan AI.

## Pemeriksaan Keamanan

Secara default, Repomix mengintegrasikan [Secretlint](https://github.com/secretlint/secretlint) untuk mendeteksi informasi sensitif dalam basis kode Anda. Ini membantu mencegah kebocoran rahasia seperti kunci API, token, dan kredensial.

Ketika Repomix mendeteksi informasi sensitif, itu akan:

1. Memperingatkan Anda tentang file yang berisi informasi sensitif
2. Mengecualikan file-file tersebut dari output
3. Memberikan detail tentang jenis informasi sensitif yang ditemukan

## Kepercayaan Konfigurasi Repositori Remote {#remote-repository-config-trust}

Saat Anda mengemas repositori remote dengan `--remote`, Repomix memperlakukan konfigurasi repositori tersebut sebagai kode yang tidak tepercaya.

### Mengapa file konfigurasi adalah kode

File `repomix.config.*` bukan sekadar data:

- `repomix.config.ts` / `.js` / `.mjs` **dieksekusi** saat dimuat.
- `input.processors` menjalankan perintah eksternal pada file yang cocok.
- `output.instructionFilePath` dan pola include yang menggunakan `../` membaca file di luar repositori.

Oleh karena itu, memuat konfigurasi yang belum ditinjau dari repositori yang tidak dikenal setara dengan menjalankan `Makefile`-nya, atau menjalankan `npm install` pada paket dengan lifecycle script.

### Default: konfigurasi remote tidak pernah dimuat

Repomix mengabaikan konfigurasi repositori yang di-clone kecuali Anda secara eksplisit memintanya. Konfigurasi global dan opsi CLI Anda tetap berlaku. Jika Anda tidak pernah menggunakan flag di bawah ini, tidak ada yang di bagian ini akan memengaruhi Anda.

### Mengaktifkan kepercayaan

```bash
# Menggunakan flag CLI
repomix --remote user/repo --remote-trust-config

# Menggunakan variabel lingkungan
REPOMIX_REMOTE_TRUST_CONFIG=true repomix --remote user/repo
```

Ini memberikan konfigurasi remote tingkat kepercayaan yang sama seperti konfigurasi yang Anda tulis sendiri. Gunakan ini hanya untuk repositori yang Anda percayai dan telah ditinjau.

### Prompt konfirmasi

Di terminal interaktif, Repomix menampilkan konfigurasi yang akan dijalankan dan meminta konfirmasi sebelum memuatnya:

| Pilihan | Efek |
| --- | --- |
| **Ya, sekali ini saja** | Hanya mempercayai proses ini. |
| **Ya, dan jangan tanya lagi untuk repositori ini** | Mengingat keputusan ini (lihat di bawah). |
| **Tidak** (pilihan default) | Batalkan tanpa memuat konfigurasi. |

Konfigurasi yang ditampilkan kepada Anda ditulis oleh penulis repositori, sehingga Repomix memastikan tampilannya tidak dapat dimanipulasi:

- **Karakter kontrol dan urutan ANSI di-escape**, sehingga konfigurasi tidak dapat menggambar ulang terminal atau menggulirkan peringatan hingga tidak terlihat.
- **Karakter bidirectional dan tak terlihat di-escape**, sehingga teks yang Anda baca adalah teks yang dijalankan ([Trojan Source](https://trojansource.codes/)).
- **Output dibatasi** berdasarkan jumlah baris maupun ukuran byte, sehingga konfigurasi yang di-padding tidak dapat mendorong peringatan keluar layar.
- **Setiap baris konfigurasi diberi prefix**, sehingga konfigurasi tidak dapat memalsukan pemisah atau pesan milik Repomix sendiri.
- **Symlink ditolak.** Git mempertahankan symlink, sehingga repositori dapat menyertakan `repomix.config.json` yang menunjuk ke luar clone. Repomix mewajibkan konfigurasi berupa file biasa di dalam pohon clone — jika tidak, byte yang Anda tinjau bukanlah byte yang dijalankan.

### Mengingat keputusan

Memilih "jangan tanya lagi" menyimpan penanda di dalam direktori sementara Anda (`$TMPDIR/repomix/trusted-remotes/`), yang hanya dapat dibaca dan ditulis oleh akun pengguna Anda.

Penanda ini **terikat pada konten (content-pinned)**: penanda mencatat hash dari konfigurasi yang Anda setujui. Jika repositori tersebut kemudian menyediakan konfigurasi yang berbeda, hash tidak akan cocok lagi dan **Anda akan ditanya kembali** — model yang sama seperti `direnv allow`.

::: warning Cakupan penandaan
Hash ini hanya mencakup file konfigurasi utama. Konfigurasi `.ts` / `.js` dapat meng-`import` file lain, dan `input.processors` dapat memanggil skrip eksternal; keduanya tidak di-hash. Repositori yang sudah Anda percayai dapat mengubah file-file tersebut sementara file utamanya tetap sama. Inilah sebabnya konfigurasi yang dapat dieksekusi diberi label sebagai demikian pada prompt — perlakukan "jangan tanya lagi" sebagai kepercayaan terhadap repositori, bukan hanya terhadap file yang Anda baca.
:::

Penanda disimpan di direktori sementara, sehingga keputusan akan kedaluwarsa saat OS Anda membersihkannya. Ini disengaja: kedaluwarsa ke arah "tanya lagi" adalah arah yang aman.

### Saat prompt dilewati

| Situasi | Perilaku |
| --- | --- |
| `--force` diberikan | Dipercaya tanpa bertanya. Flag ini berarti Anda menerima konsekuensinya; pemberitahuan dicetak ke stderr. |
| Shell non-interaktif (CI, pipa) | Dipercaya tanpa bertanya, menjaga otomatisasi yang ada tetap berjalan. Pemberitahuan dicetak ke stderr. |
| Repositori sudah dipercaya | Dimuat tanpa bertanya, selama konfigurasi tidak berubah. |
| `--config` absolut digunakan | Konfigurasi milik repositori yang di-clone tidak pernah dimuat, sehingga tidak ada yang perlu dikonfirmasi. |
| Clone tidak memiliki file konfigurasi | Tidak ada yang perlu dipercaya. |

Di bawah `--stdout`, atau saat stdout dialihkan, prompt tidak dapat ditampilkan. Repomix melaporkan error beserta panduannya, alih-alih diam-diam mempercayai konfigurasi.

### Rekomendasi

1. Biarkan `--remote-trust-config` nonaktif kecuali Anda memerlukan konfigurasi milik repositori tersebut.
2. Baca konfigurasi pada prompt sebelum menjawab, terutama `input.processors` dan path `../` apa pun.
3. Utamakan "Ya, sekali ini saja" untuk repositori yang tidak Anda kendalikan.
4. Di CI, ingat bahwa prompt tidak dapat melindungi Anda — kunci revisi yang Anda kemas dan tinjau terlebih dahulu.

## Contoh Peringatan Keamanan

```
⚠️ Security check found sensitive information in the following files:
- src/config.js: Contains API key
- .env: Contains multiple secrets

These files have been excluded from the output for security reasons.
```

## Menonaktifkan Pemeriksaan Keamanan

Meskipun tidak disarankan, Anda dapat menonaktifkan pemeriksaan keamanan dengan opsi baris perintah:

```bash
repomix --no-security
```

Atau dalam file konfigurasi:

```json
{
  "security": {
    "enabled": false
  }
}
```

## Aturan Keamanan Kustom

Anda dapat menentukan aturan keamanan kustom dalam file konfigurasi:

```json
{
  "security": {
    "enabled": true,
    "rules": [
      "@secretlint/secretlint-rule-preset-recommend",
      "@secretlint/secretlint-rule-pattern",
      {
        "id": "@secretlint/secretlint-rule-pattern",
        "options": {
          "patterns": [
            {
              "name": "Custom Secret Pattern",
              "pattern": "MY_SECRET_[A-Z0-9]{10}",
              "message": "Found custom secret pattern"
            }
          ]
        }
      }
    ]
  }
}
```

## Praktik Terbaik Keamanan

Saat berbagi basis kode dengan AI, ikuti praktik terbaik ini:

1. **Selalu gunakan pemeriksaan keamanan**: Jangan menonaktifkan fitur keamanan Repomix.
2. **Gunakan file .gitignore**: Tambahkan file sensitif ke `.gitignore` Anda.
3. **Gunakan file .env**: Simpan rahasia dalam file `.env` dan tambahkan ke `.gitignore`.
4. **Periksa output**: Selalu periksa file output sebelum membagikannya untuk memastikan tidak ada informasi sensitif.
5. **Gunakan variabel lingkungan**: Gunakan variabel lingkungan untuk rahasia dalam kode Anda.

## Pelaporan Masalah Keamanan

Jika Anda menemukan masalah keamanan di Repomix, harap laporkan secara bertanggung jawab dengan membuka [issue di GitHub](https://github.com/yamadashy/repomix/issues) atau menghubungi pemelihara secara langsung.

## Sumber Daya Terkait

- [Pemrosesan Repositori GitHub](/id/guide/remote-repository-processing) - Mengemas repositori yang belum Anda clone sendiri
- [Konfigurasi](/id/guide/configuration) - Konfigurasi pemeriksaan keamanan melalui `security.enableSecurityCheck`
- [Opsi Baris Perintah](/id/guide/command-line-options) - Gunakan flag `--no-security-check`
- [Kebijakan Privasi](/id/guide/privacy) - Pelajari tentang penanganan data Repomix
