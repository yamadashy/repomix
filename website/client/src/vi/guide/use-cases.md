<script setup>
import YouTubeVideo from '../../../components/YouTubeVideo.vue';
</script>

# Các Trường Hợp Sử Dụng

Sức mạnh của Repomix nằm ở khả năng làm việc với bất kỳ dịch vụ đăng ký nào như ChatGPT, Claude, Gemini, Grok mà không cần lo lắng về chi phí, đồng thời cung cấp bối cảnh codebase đầy đủ giúp loại bỏ nhu cầu khám phá file—làm cho việc phân tích nhanh hơn và thường chính xác hơn.

Với toàn bộ codebase có sẵn như bối cảnh, Repomix cho phép một loạt ứng dụng rộng rãi bao gồm lập kế hoạch triển khai, điều tra lỗi, kiểm tra bảo mật thư viện bên thứ ba, tạo tài liệu và nhiều hơn nữa.


## Các Trường Hợp Sử Dụng Thực Tế

### Sử Dụng Repomix với AI Assistant (Ví dụ Grok)
Video này cho thấy cách chuyển đổi các repository GitHub thành định dạng có thể đọc được bởi AI bằng cách sử dụng giao diện web của Repomix, sau đó upload lên AI assistant như Grok để lập kế hoạch chiến lược và phân tích code.

**Trường Hợp Sử Dụng**: Chuyển đổi repository nhanh chóng cho các công cụ AI
- Đóng gói repository GitHub công khai qua giao diện web
- Chọn định dạng: XML, Markdown, hoặc văn bản thuần túy
- Upload lên AI assistant để hiểu codebase

<YouTubeVideo video-id="XTifjfeMp4M" :start="488" />

### Sử Dụng Repomix với Công Cụ CLI LLM của Simon Willison
Tìm hiểu cách kết hợp Repomix với [công cụ CLI llm của Simon Willison](https://github.com/simonw/llm) để phân tích toàn bộ codebase. Video này cho thấy cách đóng gói repository thành định dạng XML và đưa chúng vào các LLM khác nhau để hỏi đáp, tạo tài liệu và lập kế hoạch triển khai.

**Trường Hợp Sử Dụng**: Phân tích codebase nâng cao với LLM CLI
- Đóng gói repository với lệnh `repomix`
- Sử dụng flag `--remote` để đóng gói trực tiếp từ GitHub
- Đính kèm output vào prompt LLM với `-f repo-output.xml`

<YouTubeVideo video-id="UZ-9U1W0e4o" :start="592" />

### Quy Trình Tạo Code LLM
Tìm hiểu cách một developer sử dụng Repomix để cung cấp bối cảnh codebase đầy đủ cho các công cụ như Claude và Aider. Điều này cho phép phát triển incremental được hỗ trợ bởi AI, review code thông minh hơn và tạo tài liệu tự động, đồng thời duy trì tính nhất quán trên toàn bộ dự án.

**Trường Hợp Sử Dụng**: Quy trình phát triển được tinh gọn với hỗ trợ AI
- Trích xuất bối cảnh codebase đầy đủ
- Cung cấp bối cảnh cho LLM để tạo code tốt hơn
- Duy trì tính nhất quán trên toàn bộ dự án

[Đọc quy trình đầy đủ →](https://harper.blog/2025/02/16/my-llm-codegen-workflow-atm/)

### Tạo Knowledge Datapack cho LLM
Các tác giả đang sử dụng Repomix để đóng gói nội dung viết của họ—blog, tài liệu và sách—thành các định dạng tương thích LLM, cho phép độc giả tương tác với chuyên môn của họ thông qua hệ thống hỏi đáp được hỗ trợ bởi AI.

**Trường Hợp Sử Dụng**: Chia sẻ kiến thức và tài liệu tương tác
- Đóng gói tài liệu thành các định dạng thân thiện với AI
- Cho phép hỏi đáp tương tác với nội dung
- Tạo cơ sở kiến thức toàn diện

[Tìm hiểu thêm về knowledge datapack →](https://lethain.com/competitive-advantage-author-llms/)


## Ví Dụ Khác

### Hiểu Biết và Chất Lượng Code

#### Điều Tra Lỗi
Chia sẻ toàn bộ codebase của bạn với AI để xác định nguyên nhân gốc rễ của các vấn đề qua nhiều file và dependency.

```
Codebase này có vấn đề rò rỉ bộ nhớ trong server. Ứng dụng bị crash sau khi chạy trong vài giờ. Vui lòng phân tích toàn bộ codebase và xác định các nguyên nhân tiềm năng.
```

#### Lập Kế Hoạch Triển Khai
Nhận lời khuyên triển khai toàn diện có xem xét đến toàn bộ kiến trúc codebase và các pattern hiện có của bạn.

```
Tôi muốn thêm xác thực người dùng vào ứng dụng này. Vui lòng xem xét cấu trúc codebase hiện tại và đề xuất cách tiếp cận tốt nhất phù hợp với kiến trúc hiện có.
```

#### Hỗ Trợ Tái Cấu Trúc
Nhận các đề xuất tái cấu trúc duy trì tính nhất quán trên toàn bộ codebase của bạn.

```
Codebase này cần tái cấu trúc để cải thiện khả năng bảo trì. Vui lòng đề xuất cải tiến trong khi giữ nguyên chức năng hiện có.
```

#### Review Code
Review code toàn diện có xem xét đến toàn bộ bối cảnh dự án.

```
Vui lòng review codebase này như thể bạn đang thực hiện một cuộc review code kỹ lưỡng. Tập trung vào chất lượng code, các vấn đề tiềm năng và đề xuất cải tiến.
```

#### Tạo Tài Liệu
Tạo tài liệu toàn diện bao phủ toàn bộ codebase của bạn.

```
Tạo tài liệu toàn diện cho codebase này, bao gồm tài liệu API, hướng dẫn thiết lập và hướng dẫn developer.
```

#### Trích Xuất Kiến Thức
Trích xuất kiến thức kỹ thuật và các pattern từ codebase của bạn.

```
Trích xuất và tài liệu hóa các pattern kiến trúc chính, quyết định thiết kế và thực tiễn tốt nhất được sử dụng trong codebase này.
```

#### Codebase Onboarding
Giúp các thành viên team mới nhanh chóng hiểu cấu trúc codebase và các khái niệm chính của bạn.

```
Bạn đang giúp một developer mới hiểu codebase này. Vui lòng cung cấp tổng quan về kiến trúc, giải thích các component chính và sự tương tác của chúng, và highlight những file quan trọng nhất để review trước tiên.
```

### Bảo Mật và Dependencies

#### Kiểm Tra Bảo Mật Dependency
Phân tích các thư viện bên thứ ba và dependency để tìm vấn đề bảo mật.

```
Vui lòng phân tích tất cả dependency bên thứ ba trong codebase này để tìm các lỗ hổng bảo mật tiềm năng và đề xuất các thay thế an toàn hơn khi cần thiết.
```

#### Phân Tích Tích Hợp Thư Viện
Hiểu cách các thư viện bên ngoài được tích hợp vào codebase của bạn.

```
Phân tích cách codebase này tích hợp với các thư viện bên ngoài và đề xuất cải tiến để có khả năng bảo trì tốt hơn.
```

#### Quét Bảo Mật Toàn Diện
Phân tích toàn bộ codebase của bạn để tìm các lỗ hổng bảo mật tiềm năng và nhận các khuyến nghị có thể thực hiện.

```
Thực hiện kiểm tra bảo mật toàn diện của codebase này. Kiểm tra các lỗ hổng phổ biến như SQL injection, XSS, vấn đề xác thực và xử lý dữ liệu không an toàn. Cung cấp khuyến nghị cụ thể cho từng phát hiện.
```

### Kiến Trúc và Hiệu Suất

#### Review Thiết Kế API
Review thiết kế API của bạn để đảm bảo tính nhất quán, best practices và các cải tiến tiềm năng.

```
Review tất cả các REST API endpoint trong codebase này. Kiểm tra tính nhất quán trong quy ước đặt tên, việc sử dụng HTTP method, định dạng response và xử lý lỗi. Đề xuất cải tiến theo REST best practices.
```

#### Lập Kế Hoạch Migration Framework
Nhận các kế hoạch migration chi tiết để cập nhật lên các framework hoặc ngôn ngữ hiện đại.

```
Tạo một kế hoạch migration từng bước để chuyển đổi codebase này từ [framework hiện tại] sang [framework đích]. Bao gồm đánh giá rủi ro, ước tính công sức và thứ tự migration được khuyến nghị.
```

#### Tối Ưu Hiệu Suất
Xác định các bottleneck hiệu suất và nhận khuyến nghị tối ưu hóa.

```
Phân tích codebase này để tìm các bottleneck hiệu suất. Tìm kiếm các thuật toán không hiệu quả, các query database không cần thiết, rò rỉ bộ nhớ và các khu vực có thể được hưởng lợi từ caching hoặc tối ưu hóa.
```

## Tài nguyên liên quan

- [Ví dụ prompt](/vi/guide/prompt-examples) - Thêm mẫu prompt cho phân tích AI
- [Định dạng đầu ra](/vi/guide/output) - Chọn định dạng tốt nhất cho mô hình AI của bạn
- [Hướng dẫn tùy chỉnh](/vi/guide/custom-instructions) - Thêm ngữ cảnh để hướng dẫn phân tích AI
- [Xử lý kho lưu trữ GitHub](/vi/guide/remote-repository-processing) - Phân tích kho lưu trữ từ xa