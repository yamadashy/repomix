# Keamanan


Repomix dirancang dengan fokus pada keamanan untuk membantu mencegah kebocoran informasi sensitif saat berbagi basis kode Anda dengan AI.

## Pemeriksaan Keamanan

Secara default, Repomix mengintegrasikan [Secretlint](https://github.com/secretlint/secretlint) untuk mendeteksi informasi sensitif dalam basis kode Anda. Ini membantu mencegah kebocoran rahasia seperti kunci API, token, dan kredensial.

Ketika Repomix mendeteksi informasi sensitif, itu akan:

1. Memperingatkan Anda tentang file yang berisi informasi sensitif
2. Mengecualikan file-file tersebut dari output
3. Memberikan detail tentang jenis informasi sensitif yang ditemukan

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

- [Konfigurasi](/id/guide/configuration) - Konfigurasi pemeriksaan keamanan melalui `security.enableSecurityCheck`
- [Opsi Baris Perintah](/id/guide/command-line-options) - Gunakan flag `--no-security-check`
- [Kebijakan Privasi](/id/guide/privacy) - Pelajari tentang penanganan data Repomix
