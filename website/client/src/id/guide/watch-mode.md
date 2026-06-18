---
title: Mode Watch
description: Kemas ulang basis kode Anda secara otomatis saat file berubah dengan mode watch Repomix, termasuk debouncing, penanganan ignore, dan kompatibilitas opsi.
---

# Mode Watch

Repomix dapat memantau basis kode Anda dan mengemasnya ulang secara otomatis setiap kali file berubah. Hal ini menjaga file output tetap mutakhir saat Anda bekerja, yang sangat berguna ketika Anda ingin memberikan snapshot yang terus diperbarui ke asisten AI.

## Penggunaan

Mulai mode watch dengan flag `-w` (atau `--watch`):

```bash
repomix --watch
```

Repomix melakukan pengemasan awal, lalu terus berjalan dan mengemas ulang setiap kali ada perubahan. Anda dapat menggabungkan mode watch dengan opsi yang biasa digunakan:

```bash
# Memantau sekumpulan file tertentu
repomix -w --include "src/**/*.ts"

# Memantau dengan file output dan format kustom
repomix --watch -o output.md --style markdown
```

Tekan `Ctrl+C` untuk menghentikan pemantauan.

## Cara Kerjanya

- **Pengemasan awal**: Repomix mengemas basis kode sekali, lalu melaporkan berapa banyak file yang sedang dipantau.
- **Deteksi perubahan**: File yang baru, berubah, dan dihapus semuanya memicu pengemasan ulang.
- **Debouncing**: Lonjakan perubahan yang cepat (misalnya, berpindah branch atau menyimpan banyak file sekaligus) digabungkan. Repomix menunggu 300 ms setelah perubahan terakhir sebelum mengemas ulang, sehingga serangkaian penyuntingan menghasilkan satu kali pembangunan ulang saja.
- **Timestamp**: Setelah setiap pembangunan ulang, Repomix mencetak timestamp (`Rebuilt at HH:MM:SS`) sehingga Anda dapat mengetahui kapan output terakhir kali diperbarui.

## File yang Diabaikan

Mode watch mematuhi aturan ignore yang sama seperti proses normal: `.gitignore`, `.repomixignore`, pola default bawaan (seperti `node_modules` dan `.git`), serta pola `--ignore` apa pun yang Anda berikan. Direktori yang diabaikan tidak dipantau, sehingga menjaga mode watch tetap efisien pada proyek berukuran besar.

## Kompatibilitas Opsi

Mode watch hanya bekerja dengan direktori lokal, jadi tidak dapat digabungkan dengan opsi berikut (baik Anda mengaturnya di command line maupun di file konfigurasi):

- `--remote` atau URL repositori remote posisional: mode watch hanya bersifat lokal
- `--stdout` atau `--stdin`: mode streaming tidak memiliki file output persisten untuk diperbarui
- `--split-output`
- `--skill-generate`
- `--copy`: pengemasan ulang pada setiap perubahan akan menimpa clipboard berulang kali

Jika Anda menggabungkan salah satu opsi ini dengan `--watch`, Repomix akan keluar dengan pesan error yang menjelaskan konflik tersebut.

## Sumber Daya Terkait

- [Opsi Command Line](/id/guide/command-line-options) - Referensi CLI lengkap, termasuk `--watch`
- [Penggunaan Dasar](/id/guide/usage) - Cara lain untuk menjalankan Repomix
- [Konfigurasi](/id/guide/configuration) - Mengatur opsi output default di file konfigurasi Anda
