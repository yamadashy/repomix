# Sử dụng cơ bản

Repomix được thiết kế để dễ sử dụng với các tùy chọn mặc định hợp lý, đồng thời cung cấp khả năng tùy chỉnh mạnh mẽ cho các trường hợp sử dụng nâng cao.

## Đóng gói kho lưu trữ cục bộ

### Đóng gói toàn bộ kho lưu trữ

Để đóng gói toàn bộ kho lưu trữ hiện tại của bạn, chỉ cần chạy Repomix trong thư mục gốc của dự án:

```bash
repomix
```

Lệnh này sẽ tạo một tệp `repomix-output.xml` trong thư mục hiện tại, chứa toàn bộ codebase của bạn ở định dạng XML.

### Đóng gói một thư mục cụ thể

Để đóng gói một thư mục cụ thể thay vì toàn bộ kho lưu trữ:

```bash
repomix path/to/directory
```

### Đóng gói các tệp cụ thể

Bạn có thể chỉ định các tệp hoặc mẫu cụ thể để đóng gói bằng cách sử dụng tùy chọn `--include`:

```bash
repomix --include "src/**/*.ts,**/*.md"
```

Điều này sẽ đóng gói tất cả các tệp TypeScript trong thư mục `src` và tất cả các tệp Markdown trong toàn bộ dự án.

## Đóng gói kho lưu trữ từ xa

Repomix có thể đóng gói các kho lưu trữ từ xa mà không cần clone chúng cục bộ:

```bash
# Sử dụng định dạng rút gọn
repomix --remote yamadashy/repomix

# Sử dụng URL đầy đủ
repomix --remote https://github.com/yamadashy/repomix

# Chỉ định nhánh
repomix --remote https://github.com/yamadashy/repomix/tree/main

# Sử dụng URL của commit
repomix --remote https://github.com/yamadashy/repomix/commit/836abcd7335137228ad77feb28655d85712680f1
```

## Nhập danh sách tệp (pipe via stdin)

Truyền đường dẫn tệp qua stdin để có tính linh hoạt tối đa:

```bash
# Sử dụng lệnh find
find src -name "*.ts" -type f | repomix

# Sử dụng git để lấy các tệp được theo dõi
git ls-files "*.ts" | repomix

# Sử dụng ls với các mẫu glob
ls src/**/*.ts | repomix

# Từ một tệp chứa đường dẫn tệp
cat file-list.txt | repomix

# Nhập trực tiếp với echo
echo -e "src/index.ts\nsrc/utils.ts" | repomix
```

Repomix tự động phát hiện khi đường dẫn tệp được truyền qua stdin, mang lại tính linh hoạt tối đa trong việc chọn tệp nào để đóng gói.

> [!NOTE]
> Khi sử dụng stdin input, đường dẫn tệp có thể là tương đối hoặc tuyệt đối, và Repomix sẽ tự động xử lý việc phân giải đường dẫn và loại bỏ trùng lặp.

## Tùy chọn đầu ra

### Định dạng đầu ra

Repomix hỗ trợ nhiều định dạng đầu ra:

```bash
# XML (mặc định)
repomix --style xml

# Markdown
repomix --style markdown

# Văn bản thuần túy
repomix --style plain
```

### Tên tệp đầu ra tùy chỉnh

Để chỉ định tên tệp đầu ra:

```bash
repomix --output-file my-codebase.xml
```

### Xóa bình luận

Để xóa bình luận khỏi mã nguồn trong đầu ra:

```bash
repomix --remove-comments
```

### Hiển thị số dòng

Để bao gồm số dòng trong đầu ra:

```bash
repomix --show-line-numbers
```

## Bỏ qua tệp và thư mục

### Sử dụng .gitignore

Theo mặc định, Repomix tôn trọng các tệp `.gitignore` của bạn. Để ghi đè hành vi này:

```bash
repomix --no-respect-gitignore
```

### Mẫu bỏ qua tùy chỉnh

Để chỉ định các mẫu bỏ qua bổ sung:

```bash
repomix --ignore "**/*.log,tmp/,**/*.min.js"
```

### Sử dụng .repomixignore

Bạn cũng có thể tạo một tệp `.repomixignore` trong thư mục gốc của dự án để chỉ định các mẫu bỏ qua cụ thể cho Repomix.

## Tùy chọn nâng cao

### Nén mã

Để nén mã bằng cách chỉ bao gồm chữ ký hàm và loại bỏ phần thân:

```bash
repomix --compress-code
```

### Kiểm tra bảo mật

Để tắt kiểm tra bảo mật:

```bash
repomix --no-security-check
```

### Đếm token

Để tắt đếm token:

```bash
repomix --no-token-count
```

## Sử dụng tệp cấu hình

Để tạo một tệp cấu hình mẫu:

```bash
repomix --init
```

Điều này sẽ tạo một tệp `repomix.config.json` mà bạn có thể chỉnh sửa để tùy chỉnh hành vi của Repomix.

Ví dụ về tệp cấu hình:

```json
{
  "output": {
    "style": "markdown",
    "filePath": "custom-output.md",
    "removeComments": true,
    "showLineNumbers": true,
    "topFilesLength": 10
  },
  "ignore": {
    "customPatterns": ["*.test.ts", "docs/**"]
  }
}
```

## Sử dụng với AI

Sau khi tạo tệp đầu ra, bạn có thể tải nó lên các công cụ AI như:

- ChatGPT
- Claude
- Gemini
- Perplexity
- Phind
- Và các LLM khác

Khi tải lên tệp, bạn có thể sử dụng một prompt như:

```
Tệp này chứa toàn bộ codebase của tôi. Tôi muốn bạn:
1. Phân tích cấu trúc tổng thể
2. Xác định các mẫu thiết kế được sử dụng
3. Đề xuất cải tiến
```

## Tiếp theo là gì?

- [Tùy chọn dòng lệnh](command-line-options.md): Danh sách đầy đủ các tùy chọn dòng lệnh
- [Cấu hình](configuration.md): Tùy chỉnh Repomix thông qua tệp cấu hình
- [Xử lý kho lưu trữ từ xa](remote-repository-processing.md): Thông tin chi tiết về xử lý kho lưu trữ từ xa
