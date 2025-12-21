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

## Nhập danh sách tệp (stdin)

Truyền đường dẫn tệp qua stdin để có tính linh hoạt tối đa:

```bash
# Sử dụng lệnh find
find src -name "*.ts" -type f | repomix --stdin

# Sử dụng git để lấy các tệp được theo dõi
git ls-files "*.ts" | repomix --stdin

# Sử dụng grep để tìm tệp chứa nội dung cụ thể
grep -l "TODO" **/*.ts | repomix --stdin

# Sử dụng ripgrep để tìm tệp với nội dung cụ thể
rg -l "TODO|FIXME" --type ts | repomix --stdin

# Sử dụng ripgrep (rg) để tìm tệp
rg --files --type ts | repomix --stdin

# Sử dụng sharkdp/fd để tìm tệp
fd -e ts | repomix --stdin

# Sử dụng fzf để chọn từ tất cả các tệp
fzf -m | repomix --stdin

# Chọn tệp tương tác với fzf
find . -name "*.ts" -type f | fzf -m | repomix --stdin

# Sử dụng ls với các mẫu glob
ls src/**/*.ts | repomix --stdin

# Từ một tệp chứa đường dẫn tệp
cat file-list.txt | repomix --stdin

# Nhập trực tiếp với echo
echo -e "src/index.ts\nsrc/utils.ts" | repomix --stdin
```

Tùy chọn `--stdin` cho phép bạn truyền danh sách đường dẫn tệp tới Repomix, mang lại tính linh hoạt tối đa trong việc chọn tệp nào để đóng gói.

Khi sử dụng `--stdin`, các tệp được chỉ định thực sự được thêm vào các mẫu bao gồm. Điều này có nghĩa là hành vi bao gồm và bỏ qua bình thường vẫn áp dụng - các tệp được chỉ định qua stdin vẫn sẽ bị loại trừ nếu chúng khớp với các mẫu bỏ qua.

> [!NOTE]
> Khi sử dụng `--stdin`, đường dẫn tệp có thể là tương đối hoặc tuyệt đối, và Repomix sẽ tự động xử lý việc phân giải đường dẫn và loại bỏ trùng lặp.

## Tùy chọn đầu ra

### Định dạng đầu ra

Repomix hỗ trợ nhiều định dạng đầu ra:

```bash
# XML (mặc định)
repomix --style xml

# Markdown
repomix --style markdown

# JSON
repomix --style json

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

### Chia Đầu Ra Thành Nhiều Tệp

Khi làm việc với các codebase lớn, đầu ra đã đóng gói có thể vượt quá giới hạn kích thước tệp được áp dụng bởi một số công cụ AI (ví dụ: giới hạn 1MB của Google AI Studio). Sử dụng `--split-output` để tự động chia đầu ra thành nhiều tệp:

```bash
repomix --split-output 1mb
```

Điều này tạo ra các tệp được đánh số như:
- `repomix-output.1.xml`
- `repomix-output.2.xml`
- `repomix-output.3.xml`

Kích thước có thể được chỉ định với đơn vị: `500kb`, `1mb`, `2mb`, `1.5mb`, v.v. Giá trị thập phân được hỗ trợ.

> [!NOTE]
> Các tệp được nhóm theo thư mục cấp cao nhất để duy trì ngữ cảnh. Một tệp hoặc thư mục đơn lẻ sẽ không bao giờ bị chia thành nhiều tệp đầu ra.

### Sử dụng .repomixignore

Bạn cũng có thể tạo một tệp `.repomixignore` trong thư mục gốc của dự án để chỉ định các mẫu bỏ qua cụ thể cho Repomix.

## Tùy chọn nâng cao

### Nén mã

```bash
repomix --compress

# Bạn cũng có thể sử dụng nó với kho lưu trữ từ xa:
repomix --remote yamadashy/repomix --compress
```

### Tích hợp Git

Bao gồm thông tin Git để cung cấp ngữ cảnh phát triển cho phân tích AI:

```bash
# Bao gồm diff git (các thay đổi chưa commit)
repomix --include-diffs

# Bao gồm nhật ký commit git (50 commit cuối cùng theo mặc định)
repomix --include-logs

# Bao gồm số lượng commit cụ thể
repomix --include-logs --include-logs-count 10

# Bao gồm cả diff và logs
repomix --include-diffs --include-logs
```

Điều này thêm ngữ cảnh có giá trị về:
- **Các thay đổi gần đây**: Git diff hiển thị các sửa đổi chưa commit
- **Các mẫu phát triển**: Git logs tiết lộ tệp nào thường được thay đổi cùng nhau
- **Lịch sử commit**: Các thông điệp commit gần đây cung cấp hiểu biết về trọng tâm phát triển
- **Mối quan hệ tệp**: Hiểu tệp nào được sửa đổi trong cùng một commit

### Tối ưu hóa số lượng token

Hiểu được phân phối token của codebase là rất quan trọng để tối ưu hóa tương tác AI. Sử dụng tùy chọn `--token-count-tree` để trực quan hóa việc sử dụng token trong toàn bộ dự án của bạn:

```bash
repomix --token-count-tree
```

Điều này hiển thị một chế độ xem phân cấp codebase của bạn với số lượng token:

```
🔢 Token Count Tree:
────────────────────
└── src/ (70,925 tokens)
    ├── cli/ (12,714 tokens)
    │   ├── actions/ (7,546 tokens)
    │   └── reporters/ (990 tokens)
    └── core/ (41,600 tokens)
        ├── file/ (10,098 tokens)
        └── output/ (5,808 tokens)
```

Bạn cũng có thể đặt ngưỡng token tối thiểu để tập trung vào các tệp lớn hơn:

```bash
repomix --token-count-tree 1000  # Chỉ hiển thị tệp/thư mục có 1000+ token
```

Điều này giúp bạn:
- **Xác định các tệp nặng token** - có thể vượt quá giới hạn ngữ cảnh AI
- **Tối ưu hóa lựa chọn tệp** - sử dụng các mẫu `--include` và `--ignore`
- **Lập kế hoạch chiến lược nén** - nhắm mục tiêu những đóng góp lớn nhất
- **Cân bằng nội dung vs ngữ cảnh** - khi chuẩn bị mã cho phân tích AI

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
