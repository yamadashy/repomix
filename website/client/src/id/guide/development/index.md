# Berkontribusi ke Repomix


Kami sangat menghargai kontribusi dari komunitas! Halaman ini memberikan panduan tentang cara berkontribusi ke proyek Repomix.

## Memulai

### Prasyarat

Untuk berkontribusi ke Repomix, Anda akan memerlukan:

- [Node.js](https://nodejs.org/) (versi 20 atau lebih baru)
- [Git](https://git-scm.com/)
- Editor kode (kami merekomendasikan [Visual Studio Code](https://code.visualstudio.com/))

### Mengkloning Repositori

```bash
# Kloning repositori
git clone https://github.com/yamadashy/repomix.git

# Masuk ke direktori
cd repomix

# Instal dependensi
npm install
```

### Pengembangan dengan Nix

Jika Anda memiliki [Nix](https://nixos.org/download) dengan flakes diaktifkan, Anda dapat memasuki shell pengembangan yang dapat direproduksi dengan Node.js 24 dan Git terinstal sebelumnya:

```bash
nix develop
```

Di dalam shell, alur kerja `npm` standar berfungsi seperti yang diharapkan:

```bash
npm ci
npm run build
npm run test
npm run lint
```

Catatan: shell ini untuk mengerjakan Repomix itu sendiri, bukan untuk menginstalnya sebagai CLI.

## Struktur Proyek

Repositori Repomix diorganisir sebagai berikut:

```
repomix/
├── src/              # Kode sumber utama
├── test/             # File pengujian
├── website/          # Situs web dokumentasi
├── .github/          # Alur kerja GitHub Actions
├── package.json      # Konfigurasi proyek
└── README.md         # Dokumentasi utama
```

## Alur Kerja Pengembangan

1. **Buat Cabang**: Selalu buat cabang baru untuk pekerjaan Anda
   ```bash
   git checkout -b fitur/nama-fitur-anda
   ```

2. **Buat Perubahan**: Implementasikan perubahan Anda

3. **Jalankan Pengujian**: Pastikan semua pengujian lulus
   ```bash
   npm test
   ```

4. **Lint Kode Anda**: Pastikan kode Anda mengikuti pedoman gaya
   ```bash
   npm run lint
   ```

5. **Commit Perubahan Anda**: Gunakan pesan commit yang deskriptif
   ```bash
   git commit -m "feat: Tambahkan fitur baru X"
   ```

6. **Push ke GitHub**: Push cabang Anda ke GitHub
   ```bash
   git push origin fitur/nama-fitur-anda
   ```

7. **Buat Pull Request**: Buka pull request di GitHub

## Konvensi Commit

Kami mengikuti [Conventional Commits](https://www.conventionalcommits.org/) untuk pesan commit:

- `feat`: Fitur baru
- `fix`: Perbaikan bug
- `docs`: Perubahan dokumentasi
- `style`: Perubahan format (tidak memengaruhi kode)
- `refactor`: Refaktor kode
- `test`: Menambahkan atau memperbaiki pengujian
- `chore`: Perubahan pada proses build atau alat

## Pengujian

Kami menggunakan [Jest](https://jestjs.io/) untuk pengujian. Untuk menjalankan pengujian:

```bash
# Jalankan semua pengujian
npm test

# Jalankan pengujian dengan cakupan
npm run test:coverage

# Jalankan pengujian dalam mode watch
npm run test:watch
```

## Dokumentasi

Dokumentasi adalah bagian penting dari proyek. Jika Anda menambahkan fitur baru atau mengubah perilaku yang ada, pastikan untuk memperbarui dokumentasi yang relevan.

Situs web dokumentasi terletak di direktori `website/` dan dibangun menggunakan [VitePress](https://vitepress.dev/).

```bash
# Jalankan server pengembangan dokumentasi
cd website/client
npm run docs:dev
```

## Pedoman Kontribusi

- **Kode Berkualitas Tinggi**: Tulis kode yang bersih, terdokumentasi dengan baik, dan dapat diuji
- **Pengujian**: Tambahkan pengujian untuk kode baru
- **Dokumentasi**: Perbarui dokumentasi untuk mencerminkan perubahan Anda
- **Kompatibilitas**: Pastikan perubahan Anda kompatibel dengan semua platform yang didukung
- **Ukuran PR**: Buat pull request yang kecil dan terfokus

## Mendapatkan Bantuan

Jika Anda memiliki pertanyaan atau memerlukan bantuan:

- [Buka masalah](https://github.com/yamadashy/repomix/issues) di GitHub
- Bergabunglah dengan [server Discord](https://discord.gg/wNYzTwZFku) kami
- Tanyakan di [Diskusi GitHub](https://github.com/yamadashy/repomix/discussions)

Terima kasih atas kontribusi Anda ke Repomix!
