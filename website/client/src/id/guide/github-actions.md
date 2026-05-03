---
title: GitHub Actions
description: Otomatiskan Repomix di GitHub Actions untuk mengemas repositori bagi analisis AI, workflow CI, artifact, code review, dan output terkompresi.
---

# GitHub Actions


Repomix menyediakan GitHub Action yang memungkinkan Anda mengintegrasikan pembuatan file Repomix ke dalam alur kerja CI/CD Anda. Ini berguna untuk memastikan bahwa file Repomix selalu diperbarui dengan perubahan terbaru pada basis kode Anda.

## Penggunaan Dasar

Untuk menggunakan GitHub Action Repomix, tambahkan file alur kerja berikut ke repositori Anda di `.github/workflows/repomix.yml`:

```yaml
name: Generate Repomix File

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]
  workflow_dispatch:

jobs:
  generate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0

      - name: Generate Repomix File
        uses: yamadashy/repomix-action@v1
        with:
          output-path: './repomix-output.xml'
          
      - name: Upload Repomix File
        uses: actions/upload-artifact@v3
        with:
          name: repomix-output
          path: ./repomix-output.xml
```

## Opsi Konfigurasi

GitHub Action Repomix mendukung semua opsi yang tersedia di CLI. Berikut adalah beberapa opsi yang paling umum:

| Opsi | Deskripsi | Default |
|------|-----------|---------|
| `output-path` | Jalur file output | `./repomix-output.xml` |
| `style` | Format output (`xml`, `markdown`, `json`, `plain`) | `xml` |
| `ignore` | Pola glob untuk mengabaikan file | - |
| `include` | Pola glob untuk menyertakan file | - |
| `remove-comments` | Menghapus komentar dari kode sumber | `false` |
| `compress` | Mengaktifkan kompresi kode | `false` |

## Contoh Lanjutan

Berikut adalah contoh alur kerja yang lebih lanjutan dengan beberapa opsi konfigurasi:

```yaml
name: Generate Repomix File

on:
  push:
    branches: [ main ]
  schedule:
    - cron: '0 0 * * 1'  # Setiap hari Senin pukul 00:00 UTC
  workflow_dispatch:

jobs:
  generate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0

      - name: Generate Repomix File
        uses: yamadashy/repomix-action@v1
        with:
          output-path: './docs/repomix-output.md'
          style: 'markdown'
          ignore: 'node_modules/**,*.log,tmp/**'
          remove-comments: 'true'
          compress: 'true'
          
      - name: Generate JSON Repomix File
        uses: yamadashy/repomix-action@v1
        with:
          output-path: './docs/repomix-output.json'
          style: 'json'
          ignore: 'node_modules/**,*.log,tmp/**'
          
      - name: Commit and Push
        run: |
          git config --local user.email "action@github.com"
          git config --local user.name "GitHub Action"
          git add ./docs/repomix-output.md
          git commit -m "Update Repomix output" || echo "No changes to commit"
          git push
```

## Kasus Penggunaan

GitHub Action Repomix sangat berguna untuk:

- Mempertahankan dokumentasi basis kode yang selalu diperbarui
- Menyediakan snapshot basis kode terbaru untuk tim AI
- Mengotomatiskan pembuatan file Repomix untuk proyek yang sering berubah
- Mengintegrasikan Repomix ke dalam alur kerja pengembangan yang ada
