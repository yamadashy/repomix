# Hướng dẫn tùy chỉnh

Repomix cho phép bạn thêm hướng dẫn tùy chỉnh vào đầu ra của mình, giúp hướng dẫn AI về cách hiểu và làm việc với codebase của bạn.

## Tổng quan

Hướng dẫn tùy chỉnh là một cách mạnh mẽ để:

1. Cung cấp ngữ cảnh về dự án của bạn
2. Giải thích các quy ước mã
3. Hướng dẫn AI về các phần quan trọng của codebase
4. Chỉ định các nhiệm vụ cụ thể bạn muốn AI thực hiện

## Thêm hướng dẫn tùy chỉnh

Có hai cách chính để thêm hướng dẫn tùy chỉnh vào đầu ra Repomix:

### 1. Sử dụng tệp hướng dẫn

Cách được khuyến nghị là tạo một tệp hướng dẫn riêng biệt và tham chiếu đến nó khi chạy Repomix:

```bash
repomix --instructions path/to/instructions.md
```

Tệp hướng dẫn có thể ở bất kỳ định dạng nào (Markdown được khuyến nghị cho khả năng đọc), và nội dung của nó sẽ được thêm vào đầu ra.

### 2. Sử dụng tệp cấu hình

Bạn cũng có thể chỉ định hướng dẫn trong tệp cấu hình Repomix:

```json
{
  "output": {
    "style": "xml",
    "filePath": "repomix-output.xml"
  },
  "instructions": {
    "content": "Đây là codebase của dự án X. Vui lòng tập trung vào...",
    "filePath": "path/to/instructions.md"
  }
}
```

Nếu cả `content` và `filePath` đều được chỉ định, `filePath` sẽ được ưu tiên.

## Hướng dẫn tùy chỉnh trong thư mục

Repomix cũng hỗ trợ hướng dẫn tùy chỉnh dựa trên thư mục. Bạn có thể tạo các tệp hướng dẫn trong thư mục `.github/instructions/` của kho lưu trữ của bạn:

- `.github/instructions/base.instructions.md`: Hướng dẫn cơ bản áp dụng cho toàn bộ kho lưu trữ
- `.github/instructions/path/to/dir.instructions.md`: Hướng dẫn cụ thể cho thư mục

Mỗi tệp hướng dẫn có thể bắt đầu bằng front matter YAML để chỉ định phạm vi áp dụng:

```markdown
---
applyTo: '**/*.ts'
---

# Hướng dẫn TypeScript

Các tệp TypeScript trong dự án này tuân theo...
```

Thuộc tính `applyTo` chấp nhận các mẫu glob để chỉ định các tệp mà hướng dẫn áp dụng.

## Ví dụ hướng dẫn tùy chỉnh

Dưới đây là một ví dụ về tệp hướng dẫn tùy chỉnh hiệu quả:

```markdown
# Hướng dẫn dự án Repomix

## Tổng quan dự án
Repomix là một công cụ đóng gói kho lưu trữ mã nguồn thành các định dạng thân thiện với AI. Nó được thiết kế để giúp bạn chia sẻ codebase của mình với các mô hình ngôn ngữ lớn.

## Cấu trúc dự án
- `src/`: Mã nguồn chính
  - `core/`: Chức năng cốt lõi để xử lý kho lưu trữ
  - `formatters/`: Các trình định dạng đầu ra (XML, Markdown, Plain)
  - `utils/`: Tiện ích và trợ giúp

## Quy ước mã
- Chúng tôi sử dụng TypeScript với kiểu nghiêm ngặt
- Chúng tôi tuân theo quy ước đặt tên camelCase cho biến và PascalCase cho lớp
- Các hàm nên có một trách nhiệm duy nhất

## Nhiệm vụ
Vui lòng phân tích codebase và đề xuất cách cải thiện:
1. Xác định các vấn đề hiệu suất tiềm ẩn
2. Đề xuất cải tiến cho khả năng bảo trì
3. Đánh giá khả năng mở rộng của kiến trúc hiện tại

## Lưu ý quan trọng
- Tệp `src/core/processor.ts` chứa logic xử lý chính
- Chúng tôi đang xem xét thêm hỗ trợ cho các định dạng đầu ra mới
```

## Thực hành tốt nhất

Khi tạo hướng dẫn tùy chỉnh:

1. **Bắt đầu với tổng quan**: Cung cấp ngữ cảnh ngắn gọn về dự án
2. **Giải thích cấu trúc**: Phác thảo cấu trúc thư mục và mục đích của chúng
3. **Làm rõ quy ước**: Đề cập đến bất kỳ quy ước mã hoặc mẫu thiết kế nào
4. **Chỉ định nhiệm vụ**: Nêu rõ những gì bạn muốn AI làm
5. **Đánh dấu các khu vực quan trọng**: Hướng dẫn sự chú ý đến các tệp hoặc mô-đun quan trọng
6. **Giữ ngắn gọn**: Tập trung vào thông tin có giá trị nhất

## Tài nguyên liên quan

- [Cấu hình](/vi/guide/configuration) - Đặt `output.instructionFilePath` trong tệp cấu hình của bạn
- [Định dạng đầu ra](/vi/guide/output) - Tìm hiểu về các định dạng đầu ra khác nhau
- [Ví dụ prompt](/vi/guide/prompt-examples) - Ví dụ prompt cho phân tích AI
- [Trường hợp sử dụng](/vi/guide/use-cases) - Ví dụ thực tế về việc sử dụng Repomix với AI
