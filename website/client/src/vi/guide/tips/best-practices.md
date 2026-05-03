---
title: Mẹo phát triển hỗ trợ AI
description: Các mẹo thực tế về phát triển có AI hỗ trợ khi dùng code hiện có, triển khai theo module, test, lập kế hoạch và chia sẻ ngữ cảnh bằng Repomix.
---

# Mẹo phát triển hỗ trợ AI

Khi phát triển phần mềm với sự hỗ trợ của AI, có một số thực hành tốt nhất có thể giúp bạn tối đa hóa hiệu quả và chất lượng của quá trình phát triển. Trang này cung cấp các mẹo và hướng dẫn để làm việc hiệu quả với AI khi sử dụng Repomix.

## Chuẩn bị codebase của bạn

### Tổ chức mã

Trước khi đóng gói codebase của bạn với Repomix, hãy xem xét tổ chức nó theo cách giúp AI dễ dàng hiểu:

- **Cấu trúc thư mục rõ ràng**: Sử dụng cấu trúc thư mục có ý nghĩa phản ánh kiến trúc của ứng dụng
- **Tệp README toàn diện**: Bao gồm tổng quan về dự án, hướng dẫn thiết lập và thông tin quan trọng khác
- **Tài liệu mã**: Thêm nhận xét và tài liệu cho các phần phức tạp của mã
- **Quy ước đặt tên nhất quán**: Sử dụng quy ước đặt tên nhất quán trong toàn bộ codebase

### Tối ưu hóa cho AI

- **Loại bỏ mã không sử dụng**: Xóa mã chết hoặc không sử dụng để giảm nhiễu
- **Tách các tệp lớn**: Chia các tệp lớn thành các mô-đun nhỏ hơn, tập trung hơn
- **Giảm thiểu phụ thuộc**: Giảm thiểu phụ thuộc không cần thiết để đơn giản hóa codebase
- **Chuẩn hóa định dạng**: Sử dụng trình định dạng mã để đảm bảo phong cách nhất quán

## Tạo prompt hiệu quả

### Cấu trúc prompt

Khi làm việc với đầu ra Repomix, hãy cấu trúc prompt của bạn để có kết quả tốt nhất:

- **Bắt đầu với bối cảnh**: Cung cấp bối cảnh về dự án và mục tiêu của bạn
- **Chia thành các bước**: Chia các nhiệm vụ phức tạp thành các bước nhỏ hơn, tuần tự
- **Chỉ định định dạng đầu ra**: Nêu rõ cách bạn muốn phản hồi được định dạng
- **Đặt câu hỏi cụ thể**: Tránh các câu hỏi mơ hồ; càng cụ thể càng tốt

### Ví dụ prompt hiệu quả

```
Tệp này chứa codebase của ứng dụng quản lý nhiệm vụ của tôi được đóng gói bởi Repomix.

Bối cảnh: Đây là một ứng dụng React với backend Node.js sử dụng MongoDB.

Tôi muốn cải thiện hiệu suất của ứng dụng, đặc biệt là thời gian tải ban đầu. Vui lòng:

1. Xác định các vấn đề hiệu suất tiềm ẩn trong mã frontend (tập trung vào các thành phần React và quản lý trạng thái)
2. Đề xuất các tối ưu hóa cụ thể với ví dụ mã
3. Đề xuất các thay đổi kiến trúc có thể cải thiện hiệu suất tổng thể

Định dạng phản hồi của bạn như sau:
- Tóm tắt các vấn đề hiệu suất được xác định
- Danh sách các tối ưu hóa được đề xuất với ví dụ trước/sau
- Đề xuất kiến trúc với lý do
```

## Làm việc với phản hồi AI

### Đánh giá phản hồi

Khi nhận phản hồi từ AI dựa trên codebase của bạn:

- **Xác minh tính chính xác**: Kiểm tra phản hồi để đảm bảo nó chính xác và phù hợp với codebase của bạn
- **Hiểu lý do**: Đảm bảo bạn hiểu lý do đằng sau các đề xuất
- **Đánh giá tính khả thi**: Xem xét liệu các đề xuất có thực tế và phù hợp với dự án của bạn không
- **Tìm kiếm các giả định**: Xác định bất kỳ giả định nào mà AI có thể đã đưa ra

### Lặp lại và cải thiện

- **Làm rõ khi cần thiết**: Nếu phản hồi không rõ ràng, hãy yêu cầu làm rõ
- **Cung cấp phản hồi**: Cho AI biết những gì hữu ích và những gì không hữu ích
- **Tinh chỉnh prompt**: Điều chỉnh prompt của bạn dựa trên phản hồi bạn nhận được
- **Chia nhỏ vấn đề**: Nếu phản hồi quá rộng, hãy chia vấn đề thành các phần nhỏ hơn

## Các trường hợp sử dụng phổ biến

### Phân tích mã

Khi sử dụng AI để phân tích codebase:

- Yêu cầu tổng quan cấp cao trước khi đi vào chi tiết
- Tập trung vào các khu vực cụ thể của mối quan tâm
- Yêu cầu xác định các mẫu và chống mẫu
- Yêu cầu đánh giá về khả năng bảo trì và mở rộng

### Tái cấu trúc mã

Khi sử dụng AI để tái cấu trúc mã:

- Giải thích vấn đề với mã hiện tại
- Chỉ định các mục tiêu của tái cấu trúc
- Yêu cầu các bước từng bước để thực hiện tái cấu trúc
- Yêu cầu giải thích về cách tái cấu trúc cải thiện mã

### Gỡ lỗi

Khi sử dụng AI để gỡ lỗi:

- Cung cấp thông báo lỗi đầy đủ
- Mô tả hành vi mong đợi và thực tế
- Bao gồm bối cảnh liên quan (phiên bản, môi trường)
- Yêu cầu các nguyên nhân tiềm ẩn và giải pháp

### Tạo tính năng mới

Khi sử dụng AI để phát triển tính năng mới:

- Mô tả tính năng và mục đích của nó
- Chỉ định cách nó nên tích hợp với mã hiện có
- Yêu cầu thiết kế cấp cao trước khi triển khai
- Yêu cầu các trường hợp kiểm tra để xác minh tính năng

## Tối ưu hóa quy trình phát triển

### Tích hợp AI vào quy trình phát triển

- **Sử dụng AI cho các nhiệm vụ lặp đi lặp lại**: Tự động hóa các nhiệm vụ lặp đi lặp lại như tạo mã soạn sẵn
- **Sử dụng AI cho đánh giá mã**: Yêu cầu AI xem xét mã của bạn để tìm lỗi và cải tiến
- **Sử dụng AI cho tài liệu**: Tạo và duy trì tài liệu với sự trợ giúp của AI
- **Sử dụng AI cho kiểm tra**: Tạo các trường hợp kiểm tra và kịch bản kiểm tra với sự trợ giúp của AI

### Cân bằng đầu vào của AI và con người

- **Xác minh đầu ra của AI**: Luôn xem xét và xác minh đầu ra của AI trước khi tích hợp nó
- **Duy trì kiểm soát sáng tạo**: Sử dụng AI như một công cụ, không phải là người thay thế cho sự sáng tạo của con người
- **Kết hợp chuyên môn của con người**: Kết hợp kiến thức miền và chuyên môn kỹ thuật của bạn với khả năng của AI
- **Lặp lại và cải thiện**: Sử dụng phản hồi từ AI để cải thiện quy trình phát triển của bạn

## Tiếp theo là gì?

- [Đóng góp cho Repomix](../development/index.md): Tìm hiểu cách đóng góp cho dự án
- [Sử dụng Repomix như một thư viện](../development/using-repomix-as-a-library.md): Tìm hiểu cách sử dụng Repomix như một thư viện
- [Sử dụng cơ bản](../usage.md): Quay lại hướng dẫn sử dụng cơ bản
