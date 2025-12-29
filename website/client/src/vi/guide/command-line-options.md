# Tùy chọn Dòng lệnh

## Tùy chọn Cơ bản
- `-v, --version`: Hiển thị phiên bản công cụ

## Tùy chọn Đầu vào/Đầu ra CLI
- `--verbose`: Bật ghi nhật ký chi tiết
- `--quiet`: Tắt tất cả đầu ra sang stdout
- `--stdout`: Đầu ra sang stdout thay vì ghi vào tệp (không thể được sử dụng với tùy chọn `--output`)
- `--stdin`: Đọc đường dẫn tệp từ stdin thay vì tự động khám phá tệp
- `--copy`: Sao chép thêm đầu ra được tạo vào clipboard hệ thống
- `--token-count-tree [threshold]`: Hiển thị cây tệp với tóm tắt số lượng token (tùy chọn: ngưỡng số lượng token tối thiểu). Hữu ích để xác định các tệp lớn và tối ưu hóa việc sử dụng token cho giới hạn ngữ cảnh AI
- `--top-files-len <number>`: Số lượng tệp lớn nhất để hiển thị trong tóm tắt (mặc định: 5, ví dụ: --top-files-len 20)

## Tùy chọn Đầu ra Repomix
- `-o, --output <file>`: Đường dẫn tệp đầu ra (mặc định: repomix-output.xml, sử dụng "-" cho stdout)
- `--style <type>`: Định dạng đầu ra: xml, markdown, json hoặc plain (mặc định: xml)
- `--parsable-style`: Bật đầu ra có thể phân tích dựa trên lược đồ kiểu đã chọn. Lưu ý rằng điều này có thể làm tăng số lượng token.
- `--compress`: Thực hiện trích xuất mã thông minh, tập trung vào các chữ ký hàm và lớp cần thiết để giảm số lượng token
- `--output-show-line-numbers`: Hiển thị số dòng trong đầu ra
- `--no-file-summary`: Tắt đầu ra phần tóm tắt tệp
- `--no-directory-structure`: Tắt đầu ra phần cấu trúc thư mục
- `--no-files`: Tắt đầu ra nội dung tệp (chế độ chỉ metadata)
- `--remove-comments`: Xóa các bình luận khỏi các loại tệp được hỗ trợ
- `--remove-empty-lines`: Xóa các dòng trống khỏi đầu ra
- `--truncate-base64`: Bật cắt ngắn chuỗi dữ liệu base64
- `--header-text <text>`: Văn bản tùy chỉnh để bao gồm trong tiêu đề tệp
- `--instruction-file-path <path>`: Đường dẫn đến tệp chứa hướng dẫn tùy chỉnh chi tiết
- `--split-output <size>`: Chia đầu ra thành nhiều tệp được đánh số (ví dụ: repomix-output.1.xml, repomix-output.2.xml); ví dụ: 500kb, 2mb hoặc 1.5mb
- `--include-empty-directories`: Bao gồm các thư mục trống trong đầu ra
- `--include-full-directory-structure`: Hiển thị cây kho lưu trữ đầy đủ trong phần Cấu trúc Thư mục, ngay cả khi sử dụng các mẫu --include
- `--include-diffs`: Bao gồm các diff git trong đầu ra (bao gồm các thay đổi cây làm việc và các thay đổi đã staged riêng biệt)
- `--include-logs`: Bao gồm nhật ký git trong đầu ra (bao gồm lịch sử commit với ngày tháng, thông điệp và đường dẫn tệp)
- `--include-logs-count <count>`: Số lượng commit git logs để bao gồm (mặc định: 50)
- `--no-git-sort-by-changes`: Tắt sắp xếp tệp theo số lượng thay đổi git (được bật mặc định)

## Tùy chọn Lựa chọn Tệp
- `--include <patterns>`: Danh sách các mẫu bao gồm (phân tách bằng dấu phẩy)
- `-i, --ignore <patterns>`: Các mẫu bỏ qua bổ sung (phân tách bằng dấu phẩy)
- `--no-gitignore`: Tắt việc sử dụng tệp .gitignore
- `--no-dot-ignore`: Tắt việc sử dụng tệp .ignore
- `--no-default-patterns`: Tắt các mẫu mặc định

## Tùy chọn Kho lưu trữ Từ xa
- `--remote <url>`: Xử lý kho lưu trữ từ xa
- `--remote-branch <name>`: Chỉ định tên nhánh từ xa, tag hoặc hash commit (mặc định là nhánh mặc định của kho lưu trữ)

## Tùy chọn Cấu hình
- `-c, --config <path>`: Đường dẫn tệp cấu hình tùy chỉnh
- `--init`: Tạo tệp cấu hình
- `--global`: Sử dụng cấu hình toàn cục

## Tùy chọn Bảo mật
- `--no-security-check`: Bỏ qua quét dữ liệu nhạy cảm như khóa API và mật khẩu

## Tùy chọn Số lượng Token
- `--token-count-encoding <encoding>`: Mô hình tokenizer để đếm: o200k_base (GPT-4o), cl100k_base (GPT-3.5/4), v.v. (mặc định: o200k_base)

## Tùy chọn MCP
- `--mcp`: Chạy như máy chủ Model Context Protocol để tích hợp công cụ AI

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

