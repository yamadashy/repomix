# Cấu hình

Repomix có thể được cấu hình bằng file cấu hình hoặc các tùy chọn dòng lệnh. File cấu hình cho phép bạn tùy chỉnh các khía cạnh khác nhau về cách xử lý và xuất ra codebase của bạn.

## Các định dạng file cấu hình

Repomix hỗ trợ nhiều định dạng file cấu hình để mang lại sự linh hoạt và dễ sử dụng.

Repomix sẽ tự động tìm kiếm các file cấu hình theo thứ tự ưu tiên sau:

1. **TypeScript** (`repomix.config.ts`, `repomix.config.mts`, `repomix.config.cts`)
2. **JavaScript/ES Module** (`repomix.config.js`, `repomix.config.mjs`, `repomix.config.cjs`)
3. **JSON** (`repomix.config.json5`, `repomix.config.jsonc`, `repomix.config.json`)

### Cấu hình JSON

Tạo file cấu hình trong thư mục dự án của bạn:
```bash
repomix --init
```

Điều này sẽ tạo file `repomix.config.json` với các cài đặt mặc định. Bạn cũng có thể tạo file cấu hình toàn cục sẽ được sử dụng làm phương án dự phòng khi không tìm thấy cấu hình cục bộ:

```bash
repomix --init --global
```

### Cấu hình TypeScript

File cấu hình TypeScript cung cấp trải nghiệm developer tốt nhất với kiểm tra kiểu đầy đủ và hỗ trợ IDE.

**Cài đặt:**

Để sử dụng cấu hình TypeScript hoặc JavaScript với `defineConfig`, bạn cần cài đặt Repomix như một dev dependency:

```bash
npm install -D repomix
```

**Ví dụ:**

```typescript
// repomix.config.ts
import { defineConfig } from 'repomix';

export default defineConfig({
  output: {
    filePath: 'output.xml',
    style: 'xml',
    removeComments: true,
  },
  ignore: {
    customPatterns: ['**/node_modules/**', '**/dist/**'],
  },
});
```

**Lợi ích:**
- ✅ Kiểm tra kiểu TypeScript đầy đủ trong IDE của bạn
- ✅ Autocomplete và IntelliSense tuyệt vời trong IDE
- ✅ Sử dụng các giá trị động (timestamps, biến môi trường, v.v.)

**Ví dụ về giá trị động:**

```typescript
// repomix.config.ts
import { defineConfig } from 'repomix';

// Tạo tên file dựa trên timestamp
const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');

export default defineConfig({
  output: {
    filePath: `output-${timestamp}.xml`,
    style: 'xml',
  },
});
```

### Cấu hình JavaScript

File cấu hình JavaScript hoạt động tương tự như TypeScript, hỗ trợ `defineConfig` và các giá trị động.

## Các tùy chọn cấu hình

| Tùy chọn                         | Mô tả                                                                                                                        | Mặc định               |
|----------------------------------|------------------------------------------------------------------------------------------------------------------------------|------------------------|
| `input.maxFileSize`              | Kích thước file tối đa tính bằng byte để xử lý. Các file lớn hơn sẽ bị bỏ qua. Hữu ích để loại trừ các file binary lớn hoặc file dữ liệu | `50000000`            |
| `output.filePath`                | Tên file đầu ra. Hỗ trợ định dạng XML, Markdown và văn bản thuần túy                                                        | `"repomix-output.xml"` |
| `output.style`                   | Kiểu đầu ra (`xml`, `markdown`, `json`, `plain`). Mỗi định dạng có những ưu điểm riêng cho các công cụ AI khác nhau               | `"xml"`                |
| `output.parsableStyle`           | Có nên escape đầu ra dựa trên schema kiểu đã chọn hay không. Cho phép phân tích tốt hơn nhưng có thể tăng số lượng token | `false`                |
| `output.compress`                | Có nên thực hiện trích xuất mã thông minh bằng Tree-sitter để giảm số lượng token trong khi bảo toàn cấu trúc hay không    | `false`                |
| `output.headerText`              | Văn bản tùy chỉnh để đưa vào header file. Hữu ích để cung cấp ngữ cảnh hoặc hướng dẫn cho các công cụ AI                  | `null`                 |
| `output.instructionFilePath`     | Đường dẫn đến file chứa hướng dẫn tùy chỉnh chi tiết cho xử lý AI                                                          | `null`                 |
| `output.fileSummary`             | Có nên bao gồm phần tóm tắt ở đầu hiển thị số lượng file, kích thước và các chỉ số khác hay không                          | `true`                 |
| `output.directoryStructure`      | Có nên bao gồm cấu trúc thư mục trong đầu ra hay không. Giúp AI hiểu tổ chức dự án                                        | `true`                 |
| `output.files`                   | Có nên bao gồm nội dung file trong đầu ra hay không. Đặt thành false để chỉ bao gồm cấu trúc và metadata                  | `true`                 |
| `output.removeComments`          | Có nên xóa bình luận khỏi các loại file được hỗ trợ hay không. Có thể giảm nhiễu và số lượng token                        | `false`                |
| `output.removeEmptyLines`        | Có nên xóa các dòng trống khỏi đầu ra để giảm số lượng token hay không                                                      | `false`                |
| `output.showLineNumbers`         | Có nên thêm số dòng vào mỗi dòng hay không. Hữu ích để tham chiếu các phần cụ thể của mã                                   | `false`                |
| `output.truncateBase64`          | Có nên cắt bớt các chuỗi dữ liệu base64 dài (ví dụ: hình ảnh) để giảm số lượng token hay không                            | `false`                |
| `output.copyToClipboard`         | Có nên sao chép đầu ra vào clipboard hệ thống ngoài việc lưu file hay không                                                | `false`                |
| `output.splitOutput`             | Chia đầu ra thành nhiều tệp được đánh số theo kích thước tối đa mỗi phần (ví dụ: `1000000` cho ~1MB). CLI chấp nhận kích thước dễ đọc như `500kb` hoặc `2mb`. Giữ mỗi tệp dưới giới hạn và tránh chia các tệp nguồn giữa các phần | Không đặt |
| `output.topFilesLength`          | Số file hàng đầu để hiển thị trong tóm tắt. Nếu đặt thành 0, sẽ không hiển thị tóm tắt                                     | `5`                    |
| `output.includeEmptyDirectories` | Có nên bao gồm các thư mục trống trong cấu trúc repository hay không                                                       | `false`                |
| `output.includeFullDirectoryStructure` | Khi sử dụng mẫu `include`, có nên hiển thị cây thư mục hoàn chỉnh (tuân theo mẫu ignore) trong khi vẫn chỉ xử lý các file được bao gồm hay không. Cung cấp ngữ cảnh repository đầy đủ cho phân tích AI | `false`                |
| `output.git.sortByChanges`       | Có nên sắp xếp file theo số lượng thay đổi git hay không. Các file có nhiều thay đổi hơn xuất hiện ở cuối                 | `true`                 |
| `output.git.sortByChangesMaxCommits` | Số lượng commit tối đa để phân tích khi đếm các thay đổi git. Giới hạn độ sâu lịch sử để cải thiện hiệu suất         | `100`                  |
| `output.git.includeDiffs`        | Có nên bao gồm các sự khác biệt git trong đầu ra hay không. Hiển thị riêng biệt các thay đổi work tree và staged         | `false`                |
| `output.git.includeLogs`         | Có nên bao gồm nhật ký git trong đầu ra hay không. Hiển thị lịch sử commit với ngày tháng, thông điệp và đường dẫn tệp    | `false`                |
| `output.git.includeLogsCount`    | Số lượng commit git logs để bao gồm trong đầu ra                                                                          | `50`                   |
| `include`                        | Các mẫu file để bao gồm sử dụng [mẫu glob](https://github.com/mrmlnc/fast-glob?tab=readme-ov-file#pattern-syntax)         | `[]`                   |
| `ignore.useGitignore`            | Có nên sử dụng các mẫu từ file `.gitignore` của dự án hay không                                                            | `true`                 |
| `ignore.useDotIgnore`            | Có nên sử dụng các mẫu từ file `.ignore` của dự án hay không                                                               | `true`                 |
| `ignore.useDefaultPatterns`      | Có nên sử dụng các mẫu ignore mặc định (node_modules, .git, v.v.) hay không                                               | `true`                 |
| `ignore.customPatterns`          | Các mẫu bổ sung để ignore sử dụng [mẫu glob](https://github.com/mrmlnc/fast-glob?tab=readme-ov-file#pattern-syntax)       | `[]`                   |
| `security.enableSecurityCheck`   | Có nên thực hiện kiểm tra bảo mật bằng Secretlint để phát hiện thông tin nhạy cảm hay không                                | `true`                 |
| `tokenCount.encoding`            | Mã hóa đếm token được sử dụng bởi tokenizer [tiktoken](https://github.com/openai/tiktoken) của OpenAI. Sử dụng `o200k_base` cho GPT-4o, `cl100k_base` cho GPT-4/3.5. Xem [tiktoken model.py](https://github.com/openai/tiktoken/blob/main/tiktoken/model.py#L24) để biết chi tiết | `"o200k_base"`         |

File cấu hình hỗ trợ cú pháp [JSON5](https://json5.org/), cho phép:
- Bình luận (cả single-line và multi-line)
- Dấu phẩy ở cuối trong objects và arrays
- Tên thuộc tính không có dấu ngoặc kép
- Cú pháp chuỗi linh hoạt hơn

## Xác thực Schema

Bạn có thể bật xác thực schema cho file cấu hình của mình bằng cách thêm thuộc tính `$schema`:

```json
{
  "$schema": "https://repomix.com/schemas/latest/schema.json",
  "output": {
    "filePath": "repomix-output.md",
    "style": "markdown"
  }
}
```

Điều này cung cấp auto-completion và validation trong các editor hỗ trợ JSON schema.

## Ví dụ File Cấu hình

Đây là ví dụ về file cấu hình hoàn chỉnh (`repomix.config.json`):

```json
{
  "$schema": "https://repomix.com/schemas/latest/schema.json",
  "input": {
    "maxFileSize": 50000000
  },
  "output": {
    "filePath": "repomix-output.xml",
    "style": "xml",
    "parsableStyle": false,
    "compress": false,
    "headerText": "Thông tin header tùy chỉnh cho file đã đóng gói.",
    "fileSummary": true,
    "directoryStructure": true,
    "files": true,
    "removeComments": false,
    "removeEmptyLines": false,
    "topFilesLength": 5,
    "showLineNumbers": false,
    "truncateBase64": false,
    "copyToClipboard": false,
    "includeEmptyDirectories": false,
    "git": {
      "sortByChanges": true,
      "sortByChangesMaxCommits": 100,
      "includeDiffs": false,
      "includeLogs": false,
      "includeLogsCount": 50
    }
  },
  "include": ["**/*"],
  "ignore": {
    "useGitignore": true,
    "useDefaultPatterns": true,
    // Các mẫu cũng có thể được chỉ định trong .repomixignore
    "customPatterns": [
      "additional-folder",
      "**/*.log"
    ],
  },
  "security": {
    "enableSecurityCheck": true
  },
  "tokenCount": {
    "encoding": "o200k_base"
  }
}
```

## Vị trí File Cấu hình

Repomix tìm kiếm file cấu hình theo thứ tự sau:
1. File cấu hình cục bộ trong thư mục hiện tại (thứ tự ưu tiên: TS > JS > JSON)
   - TypeScript: `repomix.config.ts`, `repomix.config.mts`, `repomix.config.cts`
   - JavaScript: `repomix.config.js`, `repomix.config.mjs`, `repomix.config.cjs`
   - JSON: `repomix.config.json5`, `repomix.config.jsonc`, `repomix.config.json`
2. File cấu hình toàn cục (thứ tự ưu tiên: TS > JS > JSON)
   - Windows:
     - TypeScript: `%LOCALAPPDATA%\Repomix\repomix.config.ts`, `.mts`, `.cts`
     - JavaScript: `%LOCALAPPDATA%\Repomix\repomix.config.js`, `.mjs`, `.cjs`
     - JSON: `%LOCALAPPDATA%\Repomix\repomix.config.json5`, `.jsonc`, `.json`
   - macOS/Linux:
     - TypeScript: `~/.config/repomix/repomix.config.ts`, `.mts`, `.cts`
     - JavaScript: `~/.config/repomix/repomix.config.js`, `.mjs`, `.cjs`
     - JSON: `~/.config/repomix/repomix.config.json5`, `.jsonc`, `.json`

Các tùy chọn dòng lệnh có ưu tiên cao hơn cài đặt file cấu hình.

## Mẫu Ignore

Repomix cung cấp nhiều cách để chỉ định file nào nên được ignore:

- **.gitignore**: Theo mặc định, các mẫu được liệt kê trong file `.gitignore` và `.git/info/exclude` của dự án được sử dụng. Hành vi này có thể được kiểm soát bằng cài đặt `ignore.useGitignore` hoặc tùy chọn CLI `--no-gitignore`.
- **.ignore**: Bạn có thể sử dụng file `.ignore` trong thư mục gốc dự án, theo cùng định dạng với `.gitignore`. File này được các công cụ như ripgrep và the silver searcher sử dụng, giảm nhu cầu duy trì nhiều file ignore. Hành vi này có thể được kiểm soát bằng cài đặt `ignore.useDotIgnore` hoặc tùy chọn CLI `--no-dot-ignore`.
- **Mẫu mặc định**: Repomix bao gồm danh sách mặc định các file và thư mục thường được loại trừ (ví dụ: node_modules, .git, file nhị phân). Tính năng này có thể được kiểm soát bằng cài đặt `ignore.useDefaultPatterns` hoặc tùy chọn CLI `--no-default-patterns`. Vui lòng xem [defaultIgnore.ts](https://github.com/yamadashy/repomix/blob/main/src/config/defaultIgnore.ts) để biết thêm chi tiết.
- **.repomixignore**: Bạn có thể tạo file `.repomixignore` trong thư mục gốc dự án để định nghĩa các mẫu ignore cụ thể cho Repomix. File này tuân theo cùng định dạng với `.gitignore`.
- **Mẫu tùy chỉnh**: Các mẫu ignore bổ sung có thể được chỉ định bằng tùy chọn `ignore.customPatterns` trong file cấu hình. Bạn có thể ghi đè cài đặt này bằng tùy chọn dòng lệnh `-i, --ignore`.

**Thứ tự ưu tiên** (từ cao đến thấp):

1. Mẫu tùy chỉnh (`ignore.customPatterns`)
2. File ignore (`.repomixignore`, `.ignore`, `.gitignore`, và `.git/info/exclude`):
   - Khi trong các thư mục lồng nhau, file ở thư mục sâu hơn có ưu tiên cao hơn
   - Khi trong cùng thư mục, các file này được hợp nhất không theo thứ tự cụ thể
3. Mẫu mặc định (nếu `ignore.useDefaultPatterns` là true và không sử dụng `--no-default-patterns`)

Ví dụ về `.repomixignore`:
```text
# Thư mục cache
.cache/
tmp/

# Đầu ra build
dist/
build/

# Logs
*.log
```

## Mẫu Ignore Mặc định

Khi `ignore.useDefaultPatterns` là true, Repomix tự động ignore các mẫu phổ biến:
```text
node_modules/**
.git/**
coverage/**
dist/**
```

Để xem danh sách đầy đủ, hãy xem [defaultIgnore.ts](https://github.com/yamadashy/repomix/blob/main/src/config/defaultIgnore.ts)

## Tính năng Nâng cao

### Nén Mã

Tính năng nén mã, được bật với `output.compress: true`, sử dụng [Tree-sitter](https://github.com/tree-sitter/tree-sitter) để trích xuất thông minh các cấu trúc mã cần thiết trong khi loại bỏ các chi tiết triển khai. Điều này giúp giảm số lượng token trong khi duy trì thông tin cấu trúc quan trọng.

Lợi ích chính:
- Giảm đáng kể số lượng token
- Bảo toàn signature của class và function
- Duy trì import và export
- Giữ lại định nghĩa type và interface
- Loại bỏ function body và chi tiết triển khai

Để biết thêm chi tiết và ví dụ, hãy xem [Hướng dẫn Nén Mã](code-compress).

### Tích hợp Git

Cấu hình `output.git` cung cấp các tính năng Git-aware mạnh mẽ:

- `sortByChanges`: Khi là true, các file được sắp xếp theo số lượng thay đổi Git (các commit đã sửa đổi file). Các file có nhiều thay đổi hơn xuất hiện ở cuối đầu ra. Điều này giúp ưu tiên các file được phát triển tích cực hơn. Mặc định: `true`
- `sortByChangesMaxCommits`: Số lượng commit tối đa để phân tích khi đếm các thay đổi file. Mặc định: `100`
- `includeDiffs`: Khi là true, bao gồm các sự khác biệt Git trong đầu ra (bao gồm riêng biệt các thay đổi work tree và staged). Điều này cho phép người đọc xem các thay đổi đang chờ trong repository. Mặc định: `false`
- `includeLogs`: Khi là true, bao gồm nhật ký Git trong đầu ra. Hiển thị lịch sử commit với ngày tháng, thông điệp và đường dẫn tệp. Điều này giúp AI hiểu các mẫu phát triển và mối quan hệ tệp. Mặc định: `false`
- `includeLogsCount`: Số lượng commit gần đây để bao gồm trong nhật ký git. Mặc định: `50`

Ví dụ cấu hình:
```json
{
  "output": {
    "git": {
      "sortByChanges": true,
      "sortByChangesMaxCommits": 100,
      "includeDiffs": true,
      "includeLogs": true,
      "includeLogsCount": 25
    }
  }
}
```

### Kiểm tra Bảo mật

Khi `security.enableSecurityCheck` được bật, Repomix sử dụng [Secretlint](https://github.com/secretlint/secretlint) để phát hiện thông tin nhạy cảm trong codebase của bạn trước khi đưa vào đầu ra. Điều này giúp ngăn chặn việc tiết lộ vô tình:

- API keys
- Access tokens
- Private keys
- Passwords
- Các thông tin đăng nhập nhạy cảm khác

### Xóa Bình luận

Khi `output.removeComments` được đặt thành `true`, các bình luận sẽ được xóa khỏi các loại file được hỗ trợ để giảm kích thước đầu ra và tập trung vào nội dung mã cốt lõi. Điều này có thể đặc biệt hữu ích khi:

- Làm việc với mã được ghi chú nhiều
- Cố gắng giảm số lượng token
- Tập trung vào cấu trúc và logic mã

Để biết các ngôn ngữ được hỗ trợ và ví dụ chi tiết, hãy xem [Hướng dẫn Xóa Bình luận](comment-removal).
