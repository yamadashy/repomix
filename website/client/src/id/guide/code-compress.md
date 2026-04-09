# Kompresi Kode


Kompresi kode adalah fitur yang kuat yang secara cerdas mengekstrak struktur kode esensial sambil menghapus detail implementasi. Ini sangat berguna untuk mengurangi jumlah token sambil mempertahankan informasi struktural penting tentang basis kode Anda.

> [!NOTE]  
> Ini adalah fitur eksperimental yang akan kami tingkatkan secara aktif berdasarkan umpan balik pengguna dan penggunaan dunia nyata

## Penggunaan Dasar

Aktifkan kompresi kode menggunakan flag `--compress`:

```bash
repomix --compress
```

Anda juga dapat menggunakannya dengan repositori jarak jauh:

```bash
repomix --remote user/repo --compress
```

## Cara Kerjanya

Algoritma kompresi memproses kode menggunakan parsing tree-sitter untuk mengekstrak dan mempertahankan elemen struktural esensial sambil menghapus detail implementasi.

Kompresi mempertahankan:
- Tanda tangan fungsi dan metode
- Definisi antarmuka dan tipe
- Struktur dan properti kelas
- Elemen struktural penting

Sambil menghapus:
- Implementasi fungsi dan metode
- Detail logika perulangan dan kondisional
- Deklarasi variabel internal
- Kode spesifik implementasi

### Contoh

Kode TypeScript asli:

```typescript
import { ShoppingItem } from './shopping-item';

/**
 * Calculate the total price of shopping items
 */
const calculateTotal = (
  items: ShoppingItem[]
) => {
  let total = 0;
  for (const item of items) {
    total += item.price * item.quantity;
  }
  return total;
}

// Shopping item interface
interface Item {
  name: string;
  price: number;
  quantity: number;
}
```

Setelah kompresi:

```typescript
import { ShoppingItem } from './shopping-item';
⋮----
/**
 * Calculate the total price of shopping items
 */
const calculateTotal = (
  items: ShoppingItem[]
) => {
⋮----
// Shopping item interface
interface Item {
  name: string;
  price: number;
  quantity: number;
}
```

## Konfigurasi

Anda dapat mengaktifkan kompresi dalam file konfigurasi Anda:

```json
{
  "output": {
    "compress": true
  }
}
```

## Kasus Penggunaan

Kompresi kode sangat berguna ketika:
- Menganalisis struktur dan arsitektur kode
- Mengurangi jumlah token untuk pemrosesan LLM
- Membuat dokumentasi tingkat tinggi
- Memahami pola dan tanda tangan kode
- Berbagi desain API dan antarmuka

## Opsi Terkait

Anda dapat menggabungkan kompresi dengan opsi lain:
- `--remove-comments`: Menghapus komentar kode (lihat [Penghapusan Komentar](/id/guide/comment-removal))
- `--remove-empty-lines`: Menghapus baris kosong
- `--output-show-line-numbers`: Menambahkan nomor baris ke output

## Sumber Daya Terkait

- [Penghapusan Komentar](/id/guide/comment-removal) - Hapus komentar untuk mengurangi jumlah token lebih lanjut
- [Konfigurasi](/id/guide/configuration) - Atur `output.compress` di file konfigurasi Anda
- [Opsi Baris Perintah](/id/guide/command-line-options) - Referensi CLI lengkap
