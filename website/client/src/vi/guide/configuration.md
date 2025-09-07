# Cấu hình

Repomix có thể được cấu hình bằng file cấu hình (`repomix.config.json`) hoặc các tùy chọn dòng lệnh. File cấu hình cho phép bạn tùy chỉnh các khía cạnh khác nhau về cách xử lý và xuất ra codebase của bạn.

## Bắt đầu nhanh

Tạo file cấu hình trong thư mục dự án của bạn:
```bash
repomix --init
```

Điều này sẽ tạo file `repomix.config.json` với các cài đặt mặc định. Bạn cũng có thể tạo file cấu hình toàn cục sẽ được sử dụng làm phương án dự phòng khi không tìm thấy cấu hình cục bộ:

```bash
repomix --init --global
```

## Các tùy chọn cấu hình

| Tùy chọn                         | Mô tả                                                                                                                        | Mặc định               |
|----------------------------------|------------------------------------------------------------------------------------------------------------------------------|------------------------|
| `input.maxFileSize`              | Kích thước file tối đa tính bằng byte để xử lý. Các file lớn hơn sẽ bị bỏ qua. Hữu ích để loại trừ các file binary lớn hoặc file dữ liệu | `50000000`            |
| `output.filePath`                | Tên file đầu ra. Hỗ trợ định dạng XML, Markdown và văn bản thuần túy                                                        | `"repomix-output.xml"` |
| `output.style`                   | Kiểu đầu ra (`xml`, `markdown`, `plain`). Mỗi định dạng có những ưu điểm riêng cho các công cụ AI khác nhau               | `"xml"`                |
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
| `output.topFilesLength`          | Số file hàng đầu để hiển thị trong tóm tắt. Nếu đặt thành 0, sẽ không hiển thị tóm tắt                                     | `5`                    |
| `output.includeEmptyDirectories` | Có nên bao gồm các thư mục trống trong cấu trúc repository hay không                                                       | `false`                |
| `output.git.sortByChanges`       | Có nên sắp xếp file theo số lượng thay đổi git hay không. Các file có nhiều thay đổi hơn xuất hiện ở cuối                 | `true`                 |
| `output.git.sortByChangesMaxCommits` | Số lượng commit tối đa để phân tích khi đếm các thay đổi git. Giới hạn độ sâu lịch sử để cải thiện hiệu suất         | `100`                  |
| `output.git.includeDiffs`        | Có nên bao gồm các sự khác biệt git trong đầu ra hay không. Hiển thị riêng biệt các thay đổi work tree và staged         | `false`                |
| `output.git.includeLogs`         | Có nên bao gồm nhật ký git trong đầu ra hay không. Hiển thị lịch sử commit với ngày tháng, thông điệp và đường dẫn tệp    | `false`                |
| `output.git.includeLogsCount`    | Số lượng commit git logs để bao gồm trong đầu ra                                                                          | `50`                   |
| `include`                        | Các mẫu file để bao gồm sử dụng [mẫu glob](https://github.com/mrmlnc/fast-glob?tab=readme-ov-file#pattern-syntax)         | `[]`                   |
| `ignoreContent`                  | Patterns of files whose content should be ignored (using [glob patterns](https://github.com/mrmlnc/fast-glob?tab=readme-ov-file#pattern-syntax)); prefix with `!` to keep specific paths | `[]`                   |
| `ignore.useGitignore`            | Có nên sử dụng các mẫu từ file `.gitignore` của dự án hay không                                                            | `true`                 |
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
  "ignoreContent": ["components/**", "!components/slider/**"],
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
1. File cấu hình cục bộ (`repomix.config.json`) trong thư mục hiện tại
2. File cấu hình toàn cục:
   - Windows: `%LOCALAPPDATA%\Repomix\repomix.config.json`
   - macOS/Linux: `~/.config/repomix/repomix.config.json`

Các tùy chọn dòng lệnh có ưu tiên cao hơn cài đặt file cấu hình.

## Mẫu Ignore

Repomix cung cấp nhiều cách để chỉ định file nào nên được ignore. Các mẫu được xử lý theo thứ tự ưu tiên sau:

1. Tùy chọn CLI (`--ignore`)
2. File `.repomixignore` trong thư mục dự án
3. `.gitignore` và `.git/info/exclude` (nếu `ignore.useGitignore` là true)
4. Mẫu mặc định (nếu `ignore.useDefaultPatterns` là true)

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
