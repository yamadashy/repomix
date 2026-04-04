# Instruksi Khusus


Repomix memungkinkan Anda menambahkan instruksi khusus ke output yang dihasilkan. Ini berguna untuk memberikan konteks tambahan atau petunjuk kepada model AI tentang cara memahami atau menggunakan basis kode Anda.

## Penggunaan Dasar

Untuk menambahkan instruksi khusus, gunakan flag `--instructions`:

```bash
repomix --instructions "Ini adalah proyek React yang menggunakan TypeScript. Perhatikan pola komponen yang digunakan."
```

## Menggunakan File Instruksi

Untuk instruksi yang lebih panjang atau kompleks, Anda dapat menyimpannya dalam file dan mereferensikannya:

```bash
repomix --instructions-file path/to/instructions.txt
```

## Konfigurasi

Anda juga dapat menentukan instruksi dalam file konfigurasi Anda:

```json
{
  "output": {
    "instructions": "Ini adalah proyek React yang menggunakan TypeScript. Perhatikan pola komponen yang digunakan."
  }
}
```

Atau menggunakan file instruksi:

```json
{
  "output": {
    "instructionsFile": "path/to/instructions.txt"
  }
}
```

## Praktik Terbaik

Saat menulis instruksi khusus, pertimbangkan hal berikut:

1. **Berikan konteks proyek**: Jelaskan tujuan, arsitektur, dan teknologi utama yang digunakan.
2. **Sorot area penting**: Arahkan perhatian ke bagian kode yang paling relevan.
3. **Jelaskan konvensi**: Jelaskan pola penamaan, struktur, atau konvensi khusus yang digunakan.
4. **Tentukan tujuan**: Jelaskan apa yang Anda harapkan dari model AI (misalnya, refaktor, analisis, dokumentasi).
5. **Berikan contoh**: Jika memungkinkan, berikan contoh jenis respons yang Anda harapkan.

Instruksi yang jelas dan spesifik akan membantu model AI memberikan respons yang lebih berguna dan relevan.

## Sumber Daya Terkait

- [Konfigurasi](/id/guide/configuration) - Atur `output.instructionFilePath` di file konfigurasi Anda
- [Format Output](/id/guide/output) - Pelajari tentang format output yang berbeda
- [Contoh Prompt](/id/guide/prompt-examples) - Contoh prompt untuk analisis AI
- [Kasus Penggunaan](/id/guide/use-cases) - Contoh nyata penggunaan Repomix dengan AI
