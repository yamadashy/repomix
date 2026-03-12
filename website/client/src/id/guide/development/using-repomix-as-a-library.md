# Menggunakan Repomix sebagai Library


Selain sebagai alat command-line, Repomix juga dapat digunakan sebagai library dalam proyek JavaScript atau TypeScript Anda. Ini memungkinkan Anda untuk mengintegrasikan fungsionalitas Repomix langsung ke dalam aplikasi Anda.

## Instalasi

Untuk menggunakan Repomix sebagai library, instal sebagai dependensi:

```bash
npm install repomix
```

## Penggunaan Dasar

Berikut adalah contoh dasar cara menggunakan Repomix sebagai library:

```typescript
import { Repomix } from 'repomix';

async function main() {
  // Inisialisasi instance Repomix
  const repomix = new Repomix();

  // Mengemas direktori saat ini
  const result = await repomix.pack({
    path: process.cwd(),
    output: {
      style: 'xml',
      filePath: 'output.xml',
    },
  });

  console.log(`Berhasil mengemas ${result.stats.files} file`);
  console.log(`Total token: ${result.stats.tokens}`);
}

main().catch(console.error);
```

## Opsi Konfigurasi

Anda dapat meneruskan berbagai opsi ke metode `pack()`:

```typescript
import { Repomix } from 'repomix';

async function main() {
  const repomix = new Repomix();

  const result = await repomix.pack({
    // Jalur ke direktori atau file untuk dikemas
    path: './src',

    // Opsi output
    output: {
      style: 'markdown',
      filePath: 'output.md',
      removeComments: true,
      showLineNumbers: true,
      topFilesLength: 10,
      copyToClipboard: false,
      compress: false,
    },

    // Opsi pengabaian
    ignore: {
      customPatterns: ['**/*.test.ts', 'node_modules/**'],
      respectGitignore: true,
    },

    // Opsi keamanan
    security: {
      enabled: true,
    },
  });

  console.log(result);
}

main().catch(console.error);
```

## Mengakses Hasil

Objek hasil berisi informasi tentang proses pengemasan:

```typescript
import { Repomix } from 'repomix';

async function main() {
  const repomix = new Repomix();
  const result = await repomix.pack({ path: './src' });

  // Mengakses statistik
  console.log(`Total file: ${result.stats.files}`);
  console.log(`Total baris: ${result.stats.lines}`);
  console.log(`Total token: ${result.stats.tokens}`);

  // Mengakses konten output
  console.log(result.content);

  // Mengakses informasi file
  result.fileInfos.forEach((fileInfo) => {
    console.log(`File: ${fileInfo.path}`);
    console.log(`Bahasa: ${fileInfo.language}`);
    console.log(`Token: ${fileInfo.tokens}`);
  });
}

main().catch(console.error);
```

## Kasus Penggunaan

Menggunakan Repomix sebagai library sangat berguna untuk:

### Integrasi dengan Alat Pengembangan

Integrasikan Repomix ke dalam alat pengembangan kustom Anda:

```typescript
import { Repomix } from 'repomix';
import { analyzeCode } from './ai-analyzer';

async function analyzeProject(projectPath) {
  const repomix = new Repomix();
  const result = await repomix.pack({ path: projectPath });
  
  // Kirim output Repomix ke layanan analisis AI
  const analysis = await analyzeCode(result.content);
  
  return analysis;
}
```

### Pemrosesan Batch

Proses beberapa repositori atau direktori secara berurutan:

```typescript
import { Repomix } from 'repomix';
import fs from 'fs/promises';
import path from 'path';

async function processProjects(projectsDir) {
  const repomix = new Repomix();
  const projects = await fs.readdir(projectsDir);
  
  for (const project of projects) {
    const projectPath = path.join(projectsDir, project);
    const stats = await fs.stat(projectPath);
    
    if (stats.isDirectory()) {
      console.log(`Processing ${project}...`);
      const result = await repomix.pack({ 
        path: projectPath,
        output: {
          filePath: `${project}-output.xml`
        }
      });
      console.log(`Completed ${project}: ${result.stats.files} files, ${result.stats.tokens} tokens`);
    }
  }
}
```

### Integrasi Web

Integrasikan Repomix ke dalam aplikasi web:

```typescript
import express from 'express';
import { Repomix } from 'repomix';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';

const app = express();
const upload = multer({ dest: 'uploads/' });

app.post('/process', upload.single('repo'), async (req, res) => {
  try {
    const repomix = new Repomix();
    const result = await repomix.pack({ 
      path: req.file.path,
      output: {
        style: req.body.style || 'xml'
      }
    });
    
    // Bersihkan file yang diunggah
    await fs.unlink(req.file.path);
    
    res.json({
      stats: result.stats,
      content: result.content
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

## API Reference

### Kelas Repomix

```typescript
class Repomix {
  constructor(options?: RepomixOptions);
  
  async pack(options: PackOptions): Promise<PackResult>;
}
```

### Tipe PackOptions

```typescript
interface PackOptions {
  path?: string;
  output?: OutputOptions;
  ignore?: IgnoreOptions;
  security?: SecurityOptions;
  remote?: RemoteOptions;
}
```

### Tipe PackResult

```typescript
interface PackResult {
  content: string;
  stats: {
    files: number;
    lines: number;
    tokens: number;
  };
  fileInfos: FileInfo[];
}
```

Untuk informasi lebih lanjut tentang API, lihat [kode sumber Repomix](https://github.com/yamadashy/repomix).

## Bundling

Saat membundle repomix dengan tools seperti Rolldown atau esbuild, beberapa dependency harus tetap external dan file WASM perlu disalin:

**Dependency external (tidak dapat dibundle):**
- `tinypool` - Memulai worker thread menggunakan path file
- `tiktoken` - Memuat file WASM secara dinamis saat runtime

**File WASM yang perlu disalin:**
- `web-tree-sitter.wasm` → Direktori yang sama dengan JS yang dibundle (diperlukan untuk fitur kompresi kode)
- File bahasa Tree-sitter → Direktori yang ditentukan oleh variabel lingkungan `REPOMIX_WASM_DIR`

Untuk contoh yang berfungsi, lihat [website/server/scripts/bundle.mjs](https://github.com/yamadashy/repomix/blob/main/website/server/scripts/bundle.mjs).
