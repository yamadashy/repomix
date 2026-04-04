# Bắt đầu với Repomix

<script setup>
import HomeBadges from '../../../components/HomeBadges.vue'
import YouTubeVideo from '../../../components/YouTubeVideo.vue'
import { VIDEO_IDS } from '../../../utils/videos'
</script>

Repomix là một công cụ đóng gói toàn bộ kho lưu trữ của bạn thành một tệp duy nhất, thân thiện với AI. Nó được thiết kế để giúp bạn cung cấp codebase cho các Mô hình Ngôn ngữ Lớn (LLMs) như ChatGPT, Claude, Gemini, Grok, DeepSeek, Perplexity, Gemma, Llama, và nhiều mô hình khác.

<YouTubeVideo :videoId="VIDEO_IDS.REPOMIX_DEMO" />

<HomeBadges />

<br>
<!--@include: ../../shared/sponsors-section.md-->

## Bắt đầu nhanh

Chạy lệnh này trong thư mục dự án của bạn:

```bash
npx repomix@latest
```

Vậy là xong! Bạn sẽ tìm thấy một tệp `repomix-output.xml` chứa toàn bộ kho lưu trữ của bạn ở định dạng thân thiện với AI.

Sau đó, bạn có thể gửi tệp này đến trợ lý AI với một prompt như:

```
Tệp này chứa tất cả các tệp trong kho lưu trữ được kết hợp thành một.
Tôi muốn tái cấu trúc mã, vì vậy hãy xem xét nó trước.
```

AI sẽ phân tích toàn bộ codebase của bạn và cung cấp những hiểu biết toàn diện:

![Repomix File Usage 1](/images/docs/repomix-file-usage-1.png)

Khi thảo luận về các thay đổi cụ thể, AI có thể giúp tạo mã. Với các tính năng như Artifacts của Claude, bạn thậm chí có thể nhận được nhiều tệp phụ thuộc lẫn nhau:

![Repomix File Usage 2](/images/docs/repomix-file-usage-2.png)

Chúc bạn code vui vẻ! 🚀

## Tại sao chọn Repomix?

Sức mạnh của Repomix nằm ở khả năng làm việc với các dịch vụ đăng ký như ChatGPT, Claude, Gemini, Grok mà không lo lắng về chi phí, đồng thời cung cấp ngữ cảnh codebase hoàn chỉnh giúp loại bỏ nhu cầu khám phá tệp—làm cho việc phân tích nhanh hơn và thường chính xác hơn.

Với toàn bộ codebase có sẵn làm ngữ cảnh, Repomix cho phép một loạt các ứng dụng bao gồm lập kế hoạch triển khai, điều tra lỗi, kiểm tra bảo mật thư viện bên thứ ba, tạo tài liệu và nhiều hơn nữa.

## Tính năng chính

- **Đầu ra được tối ưu hóa cho AI**: Định dạng codebase của bạn để AI dễ dàng xử lý
- **Đếm token**: Theo dõi việc sử dụng token cho giới hạn ngữ cảnh LLM
- **Nhận biết Git**: Tôn trọng các tệp `.gitignore` và `.git/info/exclude` của bạn
- **Tập trung vào bảo mật**: Phát hiện thông tin nhạy cảm
- **Nhiều định dạng đầu ra**: Lựa chọn giữa văn bản thuần túy, XML hoặc Markdown

## Tiếp theo là gì?

- [Hướng dẫn cài đặt](installation.md): Các cách khác nhau để cài đặt Repomix
- [Hướng dẫn sử dụng](usage.md): Tìm hiểu về các tính năng cơ bản và nâng cao
- [Cấu hình](configuration.md): Tùy chỉnh Repomix cho nhu cầu của bạn
- [Tính năng bảo mật](security.md): Tìm hiểu về kiểm tra bảo mật
- [Định dạng đầu ra](output.md): Chọn định dạng tốt nhất cho mô hình AI của bạn
- [Máy chủ MCP](mcp-server.md): Tích hợp Repomix trực tiếp với trợ lý AI

## Cộng đồng

Tham gia [cộng đồng Discord](https://discord.gg/wNYzTwZFku) của chúng tôi để:
- Nhận trợ giúp với Repomix
- Chia sẻ trải nghiệm của bạn
- Đề xuất tính năng mới
- Kết nối với những người dùng khác

## Hỗ trợ

Tìm thấy lỗi hoặc cần trợ giúp?
- [Mở một vấn đề trên GitHub](https://github.com/yamadashy/repomix/issues)
- Tham gia máy chủ Discord của chúng tôi
- Kiểm tra [tài liệu](https://repomix.com)
