# Opsi Baris Perintah


Repomix menyediakan berbagai opsi baris perintah untuk menyesuaikan perilakunya. Berikut adalah daftar lengkap opsi yang tersedia.

## Opsi Dasar

| Opsi | Deskripsi |
|------|-----------|
| `--help`, `-h` | Menampilkan bantuan |
| `--version`, `-v` | Menampilkan versi |
| `--init` | Membuat file konfigurasi baru (`repomix.config.json`) |

## Opsi Output

| Opsi | Deskripsi |
|------|-----------|
| `--output`, `-o` | Menentukan jalur file output |
| `--style`, `-s` | Menentukan format output (`xml`, `markdown`, `plain`) |
| `--no-line-numbers` | Menonaktifkan nomor baris |
| `--remove-comments` | Menghapus komentar dari kode sumber |
| `--top-files` | Menentukan jumlah file teratas yang akan ditampilkan di ringkasan |
| `--copy-to-clipboard` | Menyalin output ke clipboard |

## Opsi Pengabaian

| Opsi | Deskripsi |
|------|-----------|
| `--include` | Pola glob untuk menyertakan file tertentu |
| `--ignore` | Pola glob untuk mengabaikan file tertentu |
| `--no-gitignore` | Mengabaikan file `.gitignore` |

## Opsi Keamanan

| Opsi | Deskripsi |
|------|-----------|
| `--no-security` | Menonaktifkan pemeriksaan keamanan |

## Opsi Repositori Jarak Jauh

| Opsi | Deskripsi |
|------|-----------|
| `--remote`, `-r` | Mengemas repositori GitHub publik |

## Opsi Diff

| Opsi | Deskripsi |
|------|-----------|
| `--diffs` | Mengaktifkan mode diff |
| `--base-branch` | Menentukan cabang dasar untuk perbandingan diff |

## Opsi MCP Server

| Opsi | Deskripsi |
|------|-----------|
| `--mcp` | Memulai server MCP |
| `--mcp-port` | Menentukan port untuk server MCP |

## Contoh Penggunaan

### Mengemas Seluruh Repositori

```bash
repomix
```

### Mengemas dengan Format Markdown

```bash
repomix --style markdown
```

### Mengemas Direktori Tertentu

```bash
repomix path/to/directory
```

### Mengemas File Tertentu

```bash
repomix --include "src/**/*.ts,**/*.md"
```

### Mengecualikan File Tertentu

```bash
repomix --ignore "**/*.log,tmp/"
```

### Mengemas Repositori Jarak Jauh

```bash
repomix --remote yamadashy/repomix
```

### Mengaktifkan Mode Diff

```bash
repomix --diffs --base-branch main
```

### Memulai Server MCP

```bash
repomix --mcp
```

### Menggunakan Daftar File dari stdin (Deteksi Otomatis)

```bash
find src -name "*.ts" -type f | repomix
git ls-files "*.js" | repomix
echo -e "src/index.ts\nsrc/utils.ts" | repomix
```

## Menggunakan Opsi dengan File Konfigurasi

Semua opsi baris perintah dapat juga ditentukan dalam file konfigurasi. Opsi baris perintah akan mengganti pengaturan dalam file konfigurasi.

Untuk informasi lebih lanjut tentang file konfigurasi, lihat [Panduan Konfigurasi](configuration.md).
