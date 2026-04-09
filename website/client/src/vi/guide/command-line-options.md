# Tùy chọn Dòng lệnh

## Tùy chọn Cơ bản
- `-v, --version`: Hiển thị phiên bản công cụ

## Tùy chọn Đầu vào/Đầu ra CLI

| Tùy chọn | Mô tả |
|-----------|-------|
| `--verbose` | Bật ghi nhật ký debug chi tiết (hiển thị xử lý tệp, số lượng token và chi tiết cấu hình) |
| `--quiet` | Ẩn tất cả đầu ra console ngoại trừ lỗi (hữu ích cho scripting) |
| `--stdout` | Ghi đầu ra đã đóng gói trực tiếp sang stdout thay vì tệp (ẩn tất cả ghi nhật ký) |
| `--stdin` | Đọc đường dẫn tệp từ stdin, mỗi dòng một đường dẫn (các tệp được chỉ định được xử lý trực tiếp) |
| `--copy` | Sao chép đầu ra đã tạo vào clipboard hệ thống sau khi xử lý |
| `--token-count-tree [threshold]` | Hiển thị cây tệp với số lượng token; ngưỡng tùy chọn để chỉ hiển thị tệp có ≥N token (ví dụ: `--token-count-tree 100`) |
| `--top-files-len <number>` | Số lượng tệp lớn nhất để hiển thị trong tóm tắt (mặc định: `5`) |

## Tùy chọn Đầu ra Repomix

| Tùy chọn | Mô tả |
|-----------|-------|
| `-o, --output <file>` | Đường dẫn tệp đầu ra (mặc định: `repomix-output.xml`, sử dụng `"-"` cho stdout) |
| `--style <style>` | Định dạng đầu ra: `xml`, `markdown`, `json`, hoặc `plain` (mặc định: `xml`) |
| `--parsable-style` | Escape các ký tự đặc biệt để đảm bảo XML/Markdown hợp lệ (cần thiết khi đầu ra chứa mã phá vỡ định dạng) |
| `--compress` | Trích xuất cấu trúc mã cần thiết (lớp, hàm, interface) sử dụng phân tích Tree-sitter |
| `--output-show-line-numbers` | Thêm số dòng trước mỗi dòng trong đầu ra |
| `--no-file-summary` | Bỏ phần tóm tắt tệp khỏi đầu ra |
| `--no-directory-structure` | Bỏ trực quan hóa cây thư mục khỏi đầu ra |
| `--no-files` | Chỉ tạo metadata mà không có nội dung tệp (hữu ích cho phân tích kho lưu trữ) |
| `--remove-comments` | Xóa tất cả bình luận mã trước khi đóng gói |
| `--remove-empty-lines` | Xóa các dòng trống khỏi tất cả tệp |
| `--truncate-base64` | Cắt ngắn chuỗi dữ liệu base64 dài để giảm kích thước đầu ra |
| `--header-text <text>` | Văn bản tùy chỉnh để bao gồm ở đầu đầu ra |
| `--instruction-file-path <path>` | Đường dẫn đến tệp chứa hướng dẫn tùy chỉnh để bao gồm trong đầu ra |
| `--split-output <size>` | Chia đầu ra thành nhiều tệp được đánh số (ví dụ: `repomix-output.1.xml`); kích thước như `500kb`, `2mb`, hoặc `1.5mb` |
| `--include-empty-directories` | Bao gồm các thư mục không có tệp trong cấu trúc thư mục |
| `--include-full-directory-structure` | Hiển thị toàn bộ cây kho lưu trữ trong phần Cấu trúc Thư mục, ngay cả khi sử dụng mẫu `--include` |
| `--no-git-sort-by-changes` | Không sắp xếp tệp theo tần suất thay đổi git (mặc định: tệp thay đổi nhiều nhất trước) |
| `--include-diffs` | Thêm phần git diff hiển thị các thay đổi cây làm việc và đã staged |
| `--include-logs` | Thêm lịch sử commit git với thông điệp và tệp đã thay đổi |
| `--include-logs-count <count>` | Số commit gần đây để bao gồm với `--include-logs` (mặc định: `50`) |

## Tùy chọn Lựa chọn Tệp

| Tùy chọn | Mô tả |
|-----------|-------|
| `--include <patterns>` | Chỉ bao gồm tệp khớp với các mẫu glob này (phân tách bằng dấu phẩy, ví dụ: `"src/**/*.js,*.md"`) |
| `-i, --ignore <patterns>` | Các mẫu bổ sung để loại trừ (phân tách bằng dấu phẩy, ví dụ: `"*.test.js,docs/**"`) |
| `--no-gitignore` | Không sử dụng quy tắc `.gitignore` để lọc tệp |
| `--no-dot-ignore` | Không sử dụng quy tắc `.ignore` để lọc tệp |
| `--no-default-patterns` | Không áp dụng các mẫu bỏ qua tích hợp (`node_modules`, `.git`, thư mục build, v.v.) |

## Tùy chọn Kho lưu trữ Từ xa

| Tùy chọn | Mô tả |
|-----------|-------|
| `--remote <url>` | Clone và đóng gói kho lưu trữ từ xa (URL GitHub hoặc định dạng `user/repo`) |
| `--remote-branch <name>` | Nhánh, tag, hoặc commit cụ thể để sử dụng (mặc định: nhánh mặc định của kho lưu trữ) |
| `--remote-trust-config` | Tin tưởng và tải tệp cấu hình từ kho lưu trữ từ xa (mặc định bị tắt vì lý do bảo mật) |

## Tùy chọn Cấu hình

| Tùy chọn | Mô tả |
|-----------|-------|
| `-c, --config <path>` | Sử dụng tệp cấu hình tùy chỉnh thay vì `repomix.config.json` |
| `--init` | Tạo tệp `repomix.config.json` mới với cài đặt mặc định |
| `--global` | Với `--init`, tạo cấu hình ở thư mục home thay vì thư mục hiện tại |

## Tùy chọn Bảo mật
- `--no-security-check`: Bỏ qua quét dữ liệu nhạy cảm như khóa API và mật khẩu

## Tùy chọn Số lượng Token
- `--token-count-encoding <encoding>`: Mô hình tokenizer để đếm: o200k_base (GPT-4o), cl100k_base (GPT-3.5/4), v.v. (mặc định: o200k_base)

## Tùy chọn MCP
- `--mcp`: Chạy như máy chủ Model Context Protocol để tích hợp công cụ AI

## Tùy chọn Tạo Agent Skills

| Tùy chọn | Mô tả |
|-----------|-------|
| `--skill-generate [name]` | Tạo đầu ra định dạng Claude Agent Skills vào thư mục `.claude/skills/<name>/` (tên tự động tạo nếu bỏ qua) |
| `--skill-output <path>` | Chỉ định trực tiếp đường dẫn thư mục đầu ra skill (bỏ qua lời nhắc vị trí) |
| `-f, --force` | Bỏ qua tất cả lời nhắc xác nhận (ví dụ: ghi đè thư mục skill) |

## Tài nguyên liên quan

- [Cấu hình](/vi/guide/configuration) - Đặt các tùy chọn trong tệp cấu hình thay vì cờ CLI
- [Định dạng đầu ra](/vi/guide/output) - Chi tiết về các định dạng XML, Markdown, JSON và văn bản thuần túy
- [Nén mã](/vi/guide/code-compress) - Cách `--compress` hoạt động với Tree-sitter
- [Bảo mật](/vi/guide/security) - `--no-security-check` vô hiệu hóa những gì

## Ví dụ

```bash
# Sử dụng cơ bản
repomix

# Tệp đầu ra và định dạng tùy chỉnh
repomix -o my-output.xml --style xml

# Đầu ra sang stdout
repomix --stdout > custom-output.txt

# Đầu ra sang stdout, sau đó pipe sang lệnh khác (ví dụ, simonw/llm)
repomix --stdout | llm "Vui lòng giải thích mã này làm gì."

# Đầu ra tùy chỉnh với nén
repomix --compress

# Xử lý tệp cụ thể với các mẫu
repomix --include "src/**/*.ts,*.md" --ignore "*.test.js,docs/**"

# Kho lưu trữ từ xa với nhánh
repomix --remote https://github.com/user/repo/tree/main

# Kho lưu trữ từ xa với commit
repomix --remote https://github.com/user/repo/commit/836abcd7335137228ad77feb28655d85712680f1

# Kho lưu trữ từ xa với dạng viết tắt
repomix --remote user/repo

# Danh sách tệp sử dụng stdin
find src -name "*.ts" -type f | repomix --stdin
git ls-files "*.js" | repomix --stdin
echo -e "src/index.ts\nsrc/utils.ts" | repomix --stdin

# Tích hợp Git
repomix --include-diffs  # Bao gồm diff git cho các thay đổi chưa commit
repomix --include-logs   # Bao gồm nhật ký git (50 commit cuối cùng theo mặc định)
repomix --include-logs --include-logs-count 10  # Bao gồm 10 commit cuối cùng
repomix --include-diffs --include-logs  # Bao gồm cả diff và logs

# Phân tích số lượng token
repomix --token-count-tree
repomix --token-count-tree 1000  # Chỉ hiển thị tệp/thư mục với 1000+ token
```

