---
title: Chế độ theo dõi
description: Tự động đóng gói lại codebase của bạn khi tệp thay đổi với chế độ theo dõi của Repomix, bao gồm debounce, xử lý bỏ qua và khả năng tương thích tùy chọn.
---

# Chế độ theo dõi

Repomix có thể theo dõi codebase của bạn và tự động đóng gói lại bất cứ khi nào tệp thay đổi. Điều này giữ cho tệp đầu ra luôn cập nhật trong khi bạn làm việc, rất tiện lợi khi bạn muốn cung cấp một ảnh chụp được làm mới liên tục cho trợ lý AI.

## Cách sử dụng

Khởi động chế độ theo dõi với cờ `-w` (hoặc `--watch`):

```bash
repomix --watch
```

Repomix thực hiện đóng gói ban đầu, sau đó tiếp tục chạy và đóng gói lại mỗi khi có thay đổi. Bạn có thể kết hợp chế độ theo dõi với các tùy chọn thông thường:

```bash
# Theo dõi một tập hợp tệp cụ thể
repomix -w --include "src/**/*.ts"

# Theo dõi với tệp đầu ra và định dạng tùy chỉnh
repomix --watch -o output.md --style markdown
```

Nhấn `Ctrl+C` để dừng theo dõi.

## Cách hoạt động

- **Đóng gói ban đầu**: Repomix đóng gói codebase một lần, sau đó báo cáo số lượng tệp mà nó đang theo dõi.
- **Phát hiện thay đổi**: Tệp mới, tệp đã thay đổi và tệp đã xóa đều kích hoạt việc đóng gói lại.
- **Debounce**: Các đợt thay đổi dồn dập (ví dụ: chuyển nhánh hoặc lưu nhiều tệp cùng lúc) được gộp lại. Repomix chờ `300 ms` sau thay đổi cuối cùng trước khi đóng gói lại, vì vậy một loạt chỉnh sửa chỉ dẫn đến một lần dựng lại duy nhất.
- **Dấu thời gian**: Sau mỗi lần dựng lại, Repomix in ra một dấu thời gian (`Rebuilt at HH:MM:SS`) để bạn biết khi nào đầu ra được làm mới lần cuối.

## Tệp bị bỏ qua

Chế độ theo dõi tuân theo cùng các quy tắc bỏ qua như khi chạy bình thường: `.gitignore`, `.repomixignore`, các mẫu mặc định tích hợp sẵn (chẳng hạn như `node_modules` và `.git`), và bất kỳ mẫu `--ignore` nào bạn truyền vào. Các thư mục bị bỏ qua sẽ không được theo dõi, điều này giúp chế độ theo dõi hiệu quả trên các dự án lớn.

## Khả năng tương thích tùy chọn

Chế độ theo dõi chỉ hoạt động với các thư mục cục bộ, vì vậy nó không thể kết hợp với các tùy chọn sau (cho dù bạn đặt chúng trên dòng lệnh hay trong tệp cấu hình của mình):

- `--remote` hoặc một URL kho lưu trữ từ xa dạng vị trí: chế độ theo dõi chỉ dành cho cục bộ
- `--stdout` hoặc `--stdin`: các chế độ luồng không có tệp đầu ra cố định để làm mới
- `--split-output`
- `--skill-generate`
- `--copy`: việc đóng gói lại mỗi khi có thay đổi sẽ liên tục ghi đè lên bộ nhớ tạm (clipboard)

Nếu bạn kết hợp một trong những tùy chọn này với `--watch`, Repomix sẽ thoát ra cùng một lỗi giải thích xung đột.

## Tài nguyên liên quan

- [Tùy chọn dòng lệnh](/vi/guide/command-line-options) - Tham chiếu CLI đầy đủ, bao gồm `--watch`
- [Cách sử dụng cơ bản](/vi/guide/usage) - Các cách khác để chạy Repomix
- [Cấu hình](/vi/guide/configuration) - Đặt các tùy chọn đầu ra mặc định trong tệp cấu hình của bạn
