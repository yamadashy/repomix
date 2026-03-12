# Sử dụng Repomix như một thư viện

Ngoài việc sử dụng Repomix như một công cụ dòng lệnh, bạn cũng có thể tích hợp nó trực tiếp vào các ứng dụng JavaScript hoặc TypeScript của mình như một thư viện.

## Cài đặt

Để sử dụng Repomix như một thư viện, trước tiên hãy cài đặt nó như một phụ thuộc:

```bash
# Sử dụng npm
npm install repomix

# Sử dụng yarn
yarn add repomix

# Sử dụng pnpm
pnpm add repomix
```

## Sử dụng cơ bản

Dưới đây là một ví dụ cơ bản về cách sử dụng Repomix trong mã của bạn:

```typescript
import { processRepository } from 'repomix';

async function packMyRepo() {
  try {
    const result = await processRepository({
      path: '/path/to/your/repository',
      output: {
        style: 'xml',
        filePath: 'output.xml',
      },
    });

    console.log('Repository packed successfully!');
    console.log(`Output saved to: ${result.outputPath}`);
    console.log(`Total files: ${result.stats.fileCount}`);
    console.log(`Total tokens: ${result.stats.totalTokens}`);
  } catch (error) {
    console.error('Error packing repository:', error);
  }
}

packMyRepo();
```

## API

### processRepository

Hàm chính để xử lý một kho lưu trữ:

```typescript
async function processRepository(options: RepositoryProcessorOptions): Promise<RepositoryProcessorResult>
```

#### Tùy chọn

Đối tượng `RepositoryProcessorOptions` chấp nhận các tùy chọn sau:

```typescript
interface RepositoryProcessorOptions {
  // Đường dẫn đến kho lưu trữ cục bộ
  path?: string;
  
  // URL của kho lưu trữ từ xa (thay thế cho path)
  remote?: string;
  
  // Cấu hình đầu ra
  output?: {
    // Định dạng đầu ra (xml, markdown, plain)
    style?: 'xml' | 'markdown' | 'plain';
    
    // Đường dẫn tệp đầu ra
    filePath?: string;
    
    // Xóa bình luận khỏi mã nguồn
    removeComments?: boolean;
    
    // Hiển thị số dòng trong đầu ra
    showLineNumbers?: boolean;
    
    // Số lượng tệp hàng đầu để hiển thị trong tóm tắt
    topFilesLength?: number;
    
    // Nội dung hướng dẫn tùy chỉnh
    instructions?: string;
    
    // Đường dẫn đến tệp hướng dẫn
    instructionsPath?: string;
  };
  
  // Cấu hình bỏ qua
  ignore?: {
    // Tôn trọng các tệp .gitignore
    respectGitignore?: boolean;
    
    // Mảng các mẫu glob để bỏ qua
    customPatterns?: string[];
  };
  
  // Cấu hình bảo mật
  security?: {
    // Bật kiểm tra bảo mật
    check?: boolean;
    
    // Đường dẫn đến tệp cấu hình Secretlint
    secretlintConfigPath?: string;
  };
  
  // Cấu hình nâng cao
  advanced?: {
    // Nén mã bằng cách chỉ bao gồm chữ ký hàm
    compressCode?: boolean;
    
    // Bật đếm token
    tokenCount?: boolean;
  };
  
  // Mẫu bao gồm (phân tách bằng dấu phẩy)
  include?: string;
}
```

#### Kết quả

Hàm `processRepository` trả về một Promise giải quyết thành một đối tượng `RepositoryProcessorResult`:

```typescript
interface RepositoryProcessorResult {
  // Đường dẫn đến tệp đầu ra
  outputPath: string;
  
  // Nội dung đầu ra
  output: string;
  
  // Thống kê về kho lưu trữ đã xử lý
  stats: {
    // Số lượng tệp đã xử lý
    fileCount: number;
    
    // Tổng số dòng
    totalLines: number;
    
    // Tổng số token
    totalTokens: number;
    
    // Thông tin về các tệp hàng đầu
    topFiles: Array<{
      path: string;
      lines: number;
      tokens: number;
    }>;
  };
}
```

## Ví dụ nâng cao

### Xử lý kho lưu trữ từ xa

```typescript
import { processRepository } from 'repomix';

async function packRemoteRepo() {
  const result = await processRepository({
    remote: 'https://github.com/yamadashy/repomix',
    output: {
      style: 'markdown',
      filePath: 'repomix-source.md',
    },
  });

  console.log(`Repository packed to: ${result.outputPath}`);
}

packRemoteRepo();
```

### Tùy chọn đầu ra tùy chỉnh

```typescript
import { processRepository } from 'repomix';

async function packWithCustomOptions() {
  const result = await processRepository({
    path: './my-project',
    output: {
      style: 'xml',
      filePath: 'output.xml',
      removeComments: true,
      showLineNumbers: true,
      topFilesLength: 20,
      instructions: 'Đây là codebase của dự án X. Vui lòng tập trung vào...',
    },
    ignore: {
      respectGitignore: true,
      customPatterns: ['*.test.ts', 'docs/**'],
    },
    advanced: {
      compressCode: true,
      tokenCount: true,
    },
  });

  console.log(`Packed ${result.stats.fileCount} files with ${result.stats.totalTokens} tokens`);
}

packWithCustomOptions();
```

### Xử lý đầu ra trong bộ nhớ

```typescript
import { processRepository } from 'repomix';
import * as fs from 'fs';

async function processAndModifyOutput() {
  // Xử lý kho lưu trữ
  const result = await processRepository({
    path: './my-project',
    output: {
      style: 'markdown',
      // Không chỉ định filePath để không ghi vào tệp
    },
  });

  // Sửa đổi đầu ra
  const modifiedOutput = `# Codebase được xử lý bởi ứng dụng tùy chỉnh\n\n${result.output}`;

  // Ghi đầu ra đã sửa đổi vào tệp
  fs.writeFileSync('custom-output.md', modifiedOutput);

  console.log('Custom processing complete!');
}

processAndModifyOutput();
```

### Tích hợp với Express

```typescript
import express from 'express';
import { processRepository } from 'repomix';

const app = express();
app.use(express.json());

app.post('/process', async (req, res) => {
  try {
    const { repoPath, options } = req.body;
    
    const result = await processRepository({
      path: repoPath,
      ...options,
    });
    
    res.json({
      success: true,
      stats: result.stats,
      output: result.output,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

app.listen(3000, () => {
  console.log('Repomix API server running on port 3000');
});
```

## Xử lý lỗi

Khi sử dụng Repomix như một thư viện, hãy đảm bảo xử lý lỗi đúng cách:

```typescript
import { processRepository } from 'repomix';

async function safelyPackRepo() {
  try {
    const result = await processRepository({
      path: './my-project',
    });
    return result;
  } catch (error) {
    if (error.code === 'SECURITY_ISSUE') {
      console.error('Security issue detected:', error.message);
      // Xử lý vấn đề bảo mật
    } else if (error.code === 'INVALID_PATH') {
      console.error('Invalid repository path:', error.message);
      // Xử lý đường dẫn không hợp lệ
    } else {
      console.error('Unexpected error:', error);
      // Xử lý lỗi khác
    }
    throw error; // Hoặc xử lý lỗi và trả về giá trị mặc định
  }
}
```

## Bundling

Khi đóng gói repomix bằng các công cụ như Rolldown hoặc esbuild, một số dependency phải giữ là external và các tệp WASM cần được sao chép:

**Dependency external (không thể đóng gói):**
- `tinypool` - Sinh worker thread sử dụng đường dẫn tệp
- `tiktoken` - Tải tệp WASM động trong runtime

**Tệp WASM cần sao chép:**
- `web-tree-sitter.wasm` → Cùng thư mục với JS đã đóng gói (cần thiết cho tính năng nén mã)
- Tệp ngôn ngữ Tree-sitter → Thư mục được chỉ định bởi biến môi trường `REPOMIX_WASM_DIR`

Để xem ví dụ thực tế, tham khảo [website/server/scripts/bundle.mjs](https://github.com/yamadashy/repomix/blob/main/website/server/scripts/bundle.mjs).

## Tiếp theo là gì?

- [Đóng góp cho Repomix](./index.md): Tìm hiểu cách đóng góp cho dự án
- [Mẹo phát triển hỗ trợ AI](../tips/best-practices.md): Tìm hiểu về các thực hành tốt nhất cho phát triển hỗ trợ AI
- [Cấu hình](../configuration.md): Tìm hiểu thêm về các tùy chọn cấu hình
