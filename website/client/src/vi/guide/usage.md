---
title: Cách sử dụng cơ bản
description: Sử dụng Repomix CLI để đóng gói thư mục, kho lưu trữ từ xa, các tệp được chọn, git diff, nhật ký commit, đầu ra được chia nhỏ, số lượng token và mã được nén.
---

# Cách sử dụng cơ bản

## Bắt đầu nhanh

Đóng gói toàn bộ kho lưu trữ của bạn:
```bash
repomix
```

## Các trường hợp sử dụng phổ biến

### Đóng gói các thư mục cụ thể
```bash
repomix path/to/directory
```

### Bao gồm các tệp cụ thể
Sử dụng [các mẫu glob](https://github.com/mrmlnc/fast-glob?tab=readme-ov-file#pattern-syntax):
```bash
repomix --include "src/**/*.ts,**/*.md"
```

### Loại trừ các tệp
```bash
repomix --ignore "**/*.log,tmp/"
```

### Chia đầu ra thành nhiều tệp

Khi làm việc với các cơ sở mã lớn, đầu ra đã đóng gói có thể vượt quá giới hạn kích thước tệp do một số công cụ AI áp đặt (ví dụ, giới hạn 1MB của Google AI Studio). Sử dụng `--split-output` để tự động chia đầu ra thành nhiều tệp:

```bash
repomix --split-output 1mb
```

Lệnh này tạo ra các tệp được đánh số như:
- `repomix-output.1.xml`
- `repomix-output.2.xml`
- `repomix-output.3.xml`

Kích thước có thể được chỉ định kèm đơn vị: `500kb`, `1mb`, `2mb`, `1.5mb`, v.v. Các giá trị thập phân được hỗ trợ.

> [!NOTE]
> Các tệp được nhóm theo thư mục cấp cao nhất để duy trì ngữ cảnh. Một tệp hoặc thư mục đơn lẻ sẽ không bao giờ bị chia tách qua nhiều tệp đầu ra.

### Kho lưu trữ từ xa
```bash
# Sử dụng URL GitHub
repomix --remote https://github.com/user/repo

# Sử dụng dạng viết tắt
repomix --remote user/repo

# Sử dụng dạng viết tắt mà không cần --remote (tự động phát hiện)
repomix user/repo

# Nhánh/tag/commit cụ thể
repomix --remote user/repo --remote-branch main
repomix --remote user/repo --remote-branch 935b695
```

### Đầu vào danh sách tệp (stdin)

Truyền các đường dẫn tệp qua stdin để có sự linh hoạt tối đa:

```bash
# Sử dụng lệnh find
find src -name "*.ts" -type f | repomix --stdin

# Sử dụng git để lấy các tệp được theo dõi
git ls-files "*.ts" | repomix --stdin

# Sử dụng ripgrep (rg) để tìm các tệp
rg --files --type ts | repomix --stdin

# Sử dụng grep để tìm các tệp chứa nội dung cụ thể
grep -l "TODO" **/*.ts | repomix --stdin

# Sử dụng ripgrep để tìm các tệp với nội dung cụ thể
rg -l "TODO|FIXME" --type ts | repomix --stdin

# Sử dụng sharkdp/fd để tìm các tệp
fd -e ts | repomix --stdin

# Sử dụng fzf để chọn từ tất cả các tệp
fzf -m | repomix --stdin

# Lựa chọn tệp tương tác với fzf
find . -name "*.ts" -type f | fzf -m | repomix --stdin

# Sử dụng ls với các mẫu glob
ls src/**/*.ts | repomix --stdin

# Từ một tệp chứa các đường dẫn tệp
cat file-list.txt | repomix --stdin

# Đầu vào trực tiếp với echo
echo -e "src/index.ts\nsrc/utils.ts" | repomix --stdin
```

Tùy chọn `--stdin` cho phép bạn truyền (pipe) một danh sách các đường dẫn tệp tới Repomix, mang lại sự linh hoạt tối đa trong việc lựa chọn tệp nào để đóng gói.

Khi sử dụng `--stdin`, các tệp được chỉ định thực chất được thêm vào các mẫu bao gồm (include). Điều này có nghĩa là hành vi bao gồm và loại trừ thông thường vẫn được áp dụng: các tệp được chỉ định qua stdin vẫn sẽ bị loại trừ nếu chúng khớp với các mẫu loại trừ (ignore).

> [!NOTE]
> Khi sử dụng `--stdin`, các đường dẫn tệp có thể là tương đối hoặc tuyệt đối, và Repomix sẽ tự động xử lý việc phân giải đường dẫn và loại bỏ trùng lặp.

### Nén mã {#code-compression}

Giảm số lượng token trong khi vẫn giữ nguyên cấu trúc mã. Xem [hướng dẫn Nén mã](/vi/guide/code-compress) để biết chi tiết.

```bash
repomix --compress

# Bạn cũng có thể sử dụng nó với các kho lưu trữ từ xa:
repomix --remote yamadashy/repomix --compress
```

### Tích hợp Git

Bao gồm thông tin Git để cung cấp ngữ cảnh phát triển cho việc phân tích bằng AI:

```bash
# Bao gồm git diff (các thay đổi chưa commit)
repomix --include-diffs

# Bao gồm nhật ký commit của git (mặc định là 50 commit gần nhất)
repomix --include-logs

# Bao gồm số lượng commit cụ thể
repomix --include-logs --include-logs-count 10

# Bao gồm cả diff và nhật ký
repomix --include-diffs --include-logs
```

Điều này bổ sung ngữ cảnh có giá trị về:
- **Các thay đổi gần đây**: Git diff hiển thị các sửa đổi chưa được commit
- **Các mẫu phát triển**: Nhật ký git tiết lộ những tệp nào thường được thay đổi cùng nhau
- **Lịch sử commit**: Các thông điệp commit gần đây cung cấp cái nhìn sâu sắc về trọng tâm phát triển
- **Mối quan hệ giữa các tệp**: Hiểu rõ những tệp nào được sửa đổi trong cùng các commit

### Tối ưu hóa số lượng token

Việc hiểu rõ phân bố token trong cơ sở mã của bạn là rất quan trọng để tối ưu hóa các tương tác với AI. Sử dụng tùy chọn `--token-count-tree` để trực quan hóa việc sử dụng token trong toàn bộ dự án của bạn:

```bash
repomix --token-count-tree
```

Lệnh này hiển thị một dạng xem phân cấp của cơ sở mã cùng với số lượng token:

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
repomix --token-count-tree 1000  # Chỉ hiển thị các tệp/thư mục có từ 1000 token trở lên
```

Điều này giúp bạn:
- **Xác định các tệp nặng về token** có thể vượt quá giới hạn ngữ cảnh của AI
- **Tối ưu hóa việc lựa chọn tệp** bằng cách sử dụng các mẫu `--include` và `--ignore`
- **Lập kế hoạch chiến lược nén** bằng cách nhắm vào các yếu tố đóng góp lớn nhất
- **Cân bằng giữa nội dung và ngữ cảnh** khi chuẩn bị mã cho việc phân tích bằng AI

## Định dạng đầu ra

### XML (Mặc định)
```bash
repomix --style xml
```

### Markdown
```bash
repomix --style markdown
```

### JSON
```bash
repomix --style json
```

### Văn bản thuần
```bash
repomix --style plain
```

## Tùy chọn bổ sung

### Xóa các comment

Xem [Xóa comment](/vi/guide/comment-removal) để biết các ngôn ngữ được hỗ trợ và chi tiết.

```bash
repomix --remove-comments
```

### Hiển thị số dòng
```bash
repomix --output-show-line-numbers
```

### Sao chép vào clipboard
```bash
repomix --copy
```

### Tắt kiểm tra bảo mật

Xem [Bảo mật](/vi/guide/security) để biết chi tiết về những gì Repomix phát hiện.

```bash
repomix --no-security-check
```

## Cấu hình

Khởi tạo tệp cấu hình:
```bash
repomix --init
```

Xem [Hướng dẫn cấu hình](/vi/guide/configuration) để biết các tùy chọn chi tiết.

## Tài nguyên liên quan

- [Định dạng đầu ra](/vi/guide/output) - Tìm hiểu về các định dạng XML, Markdown, JSON và văn bản thuần
- [Tùy chọn dòng lệnh](/vi/guide/command-line-options) - Tài liệu tham khảo CLI đầy đủ
- [Ví dụ về prompt](/vi/guide/prompt-examples) - Các prompt mẫu để phân tích bằng AI
- [Các trường hợp sử dụng](/vi/guide/use-cases) - Các ví dụ và quy trình làm việc thực tế
