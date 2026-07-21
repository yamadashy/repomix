---
title: Bảo mật
description: Tìm hiểu cách Repomix dùng Secretlint và safety check để phát hiện secret, API key, token, credential và nội dung repository nhạy cảm trước khi đóng gói.
---

# Bảo mật

Repomix tích hợp các tính năng bảo mật mạnh mẽ để giúp ngăn chặn việc vô tình tiết lộ thông tin nhạy cảm khi chia sẻ codebase của bạn với các mô hình ngôn ngữ lớn (LLMs).

## Tổng quan

Khi đóng gói codebase để chia sẻ với AI, có nguy cơ vô tình bao gồm thông tin nhạy cảm như:

- Khóa API
- Mật khẩu
- Khóa bí mật
- Token truy cập
- Thông tin xác thực cơ sở dữ liệu
- Thông tin cá nhân

Repomix giúp giảm thiểu rủi ro này bằng cách tích hợp [Secretlint](https://github.com/secretlint/secretlint), một công cụ phát hiện bí mật trong mã.

## Kiểm tra bảo mật tự động

Theo mặc định, Repomix thực hiện kiểm tra bảo mật trên tất cả các tệp trước khi đưa chúng vào đầu ra. Nếu phát hiện thông tin nhạy cảm, Repomix sẽ:

1. Hiển thị cảnh báo
2. Cung cấp thông tin về vị trí của thông tin nhạy cảm
3. Cho bạn tùy chọn để tiếp tục hoặc hủy bỏ quá trình

## Sử dụng kiểm tra bảo mật

### Bật kiểm tra bảo mật (mặc định)

Kiểm tra bảo mật được bật theo mặc định. Không cần thực hiện bất kỳ hành động nào để sử dụng tính năng này.

### Tắt kiểm tra bảo mật

Nếu bạn muốn tắt kiểm tra bảo mật (không được khuyến nghị), bạn có thể sử dụng tùy chọn `--no-security-check`:

```bash
repomix --no-security-check
```

Hoặc trong tệp cấu hình:

```json
{
  "security": {
    "check": false
  }
}
```

### Cấu hình Secretlint tùy chỉnh

Bạn có thể cung cấp cấu hình Secretlint tùy chỉnh để điều chỉnh các quy tắc phát hiện:

```bash
repomix --secretlint-config path/to/secretlint.config.js
```

Hoặc trong tệp cấu hình:

```json
{
  "security": {
    "secretlintConfigPath": "./secretlint.config.js"
  }
}
```

## Các loại bí mật được phát hiện

Repomix có thể phát hiện nhiều loại thông tin nhạy cảm, bao gồm:

- **Khóa API**: AWS, Google Cloud, Azure, GitHub, Stripe, v.v.
- **Mật khẩu**: Mật khẩu được mã hóa cứng trong mã
- **Khóa bí mật**: Khóa SSH, khóa JWT, v.v.
- **Token truy cập**: OAuth, token truy cập cá nhân, v.v.
- **Thông tin xác thực cơ sở dữ liệu**: Chuỗi kết nối, thông tin đăng nhập, v.v.
- **Thông tin cá nhân**: Số điện thoại, địa chỉ email, v.v.

## Thực hành tốt nhất về bảo mật

Ngoài việc sử dụng kiểm tra bảo mật của Repomix, hãy xem xét các thực hành tốt nhất sau:

### 1. Sử dụng biến môi trường

Lưu trữ thông tin nhạy cảm trong biến môi trường thay vì mã hóa cứng chúng trong mã:

```javascript
// Không tốt
const apiKey = "sk_live_1234567890abcdef";

// Tốt
const apiKey = process.env.API_KEY;
```

### 2. Sử dụng tệp .env

Lưu trữ biến môi trường trong tệp `.env` và đảm bảo tệp này được thêm vào `.gitignore`:

```
# .env
API_KEY=sk_live_1234567890abcdef
DATABASE_URL=postgres://user:password@localhost/db
```

### 3. Sử dụng quản lý bí mật

Xem xét sử dụng dịch vụ quản lý bí mật như:
- AWS Secrets Manager
- Google Secret Manager
- HashiCorp Vault
- Azure Key Vault

### 4. Xem lại đầu ra

Luôn xem lại đầu ra của Repomix trước khi chia sẻ nó với AI để đảm bảo không có thông tin nhạy cảm nào bị lọt qua.

### 5. Sử dụng tệp .repomixignore

Thêm các tệp có thể chứa thông tin nhạy cảm vào tệp `.repomixignore`:

```
# .repomixignore
.env
config/secrets.yml
credentials/
```

## Độ tin cậy cấu hình kho lưu trữ từ xa {#remote-repository-config-trust}

Khi bạn đóng gói một kho lưu trữ từ xa bằng `--remote`, Repomix coi cấu hình của kho lưu trữ đó là mã không đáng tin cậy.

### Vì sao tệp cấu hình là mã (code)

Một tệp `repomix.config.*` không chỉ là dữ liệu:

- `repomix.config.ts` / `.js` / `.mjs` được **thực thi** khi được tải.
- `input.processors` chạy các lệnh bên ngoài trên các tệp phù hợp.
- `output.instructionFilePath` và các mẫu include sử dụng `../` đọc các tệp nằm ngoài kho lưu trữ.

Vì vậy, việc tải một cấu hình chưa được xem xét từ một kho lưu trữ không quen thuộc cũng tương đương với việc chạy `Makefile` của kho lưu trữ đó, hoặc chạy `npm install` trên một package có lifecycle script.

### Mặc định: cấu hình từ xa không bao giờ được tải

Repomix bỏ qua cấu hình của kho lưu trữ đã được clone trừ khi bạn yêu cầu rõ ràng. Cấu hình toàn cục và các tùy chọn CLI của bạn vẫn được áp dụng. Nếu bạn không bao giờ truyền cờ dưới đây, không có gì trong phần này có thể ảnh hưởng đến bạn.

### Bật tin cậy

```bash
# Sử dụng cờ CLI
repomix --remote user/repo --remote-trust-config

# Sử dụng biến môi trường
REPOMIX_REMOTE_TRUST_CONFIG=true repomix --remote user/repo
```

Điều này cấp cho cấu hình từ xa mức độ tin cậy tương tự như một cấu hình do chính bạn viết. Chỉ sử dụng tùy chọn này cho các kho lưu trữ mà bạn tin tưởng và đã xem xét.

### Lời nhắc xác nhận

Trên terminal tương tác, Repomix hiển thị cấu hình sắp được chạy và yêu cầu xác nhận trước khi tải nó:

| Lựa chọn | Hiệu ứng |
| --- | --- |
| **Có, chỉ lần này** | Chỉ tin tưởng lần chạy này. |
| **Có, và không hỏi lại cho kho lưu trữ này** | Ghi nhớ quyết định (xem bên dưới). |
| **Không** (lựa chọn mặc định) | Hủy bỏ mà không tải cấu hình. |

Cấu hình được hiển thị cho bạn do tác giả của kho lưu trữ viết ra, vì vậy Repomix đảm bảo rằng phần hiển thị không thể bị thao túng:

- **Các ký tự điều khiển và chuỗi ANSI được escape**, để cấu hình không thể vẽ lại terminal hoặc cuộn cảnh báo ra khỏi tầm nhìn.
- **Các ký tự hai chiều (bidirectional) và ký tự ẩn được escape**, để văn bản bạn đọc chính là văn bản được thực thi ([Trojan Source](https://trojansource.codes/)).
- **Đầu ra bị giới hạn** cả về số dòng lẫn kích thước byte, để một cấu hình bị đệm thêm không thể đẩy cảnh báo ra khỏi màn hình.
- **Mỗi dòng cấu hình đều có tiền tố**, để cấu hình không thể giả mạo các dấu phân cách hoặc thông báo riêng của Repomix.
- **Symlink bị từ chối.** Git giữ lại symlink, vì vậy một kho lưu trữ có thể chứa tệp `repomix.config.json` trỏ ra ngoài bản clone. Repomix yêu cầu cấu hình phải là một tệp thông thường bên trong cây thư mục đã clone — nếu không, các byte bạn đã xem xét sẽ không phải là các byte được thực thi.

### Ghi nhớ một quyết định

Chọn "không hỏi lại" sẽ lưu một dấu hiệu trong thư mục tạm của bạn (`$TMPDIR/repomix/trusted-remotes/`), chỉ tài khoản người dùng của bạn mới có quyền đọc và ghi.

Dấu hiệu này được **gắn với nội dung (content-pinned)**: nó ghi lại hash của cấu hình bạn đã chấp thuận. Nếu sau đó kho lưu trữ cung cấp một cấu hình khác, hash sẽ không còn khớp và **bạn sẽ được hỏi lại** — cùng mô hình như `direnv allow`.

::: warning Phạm vi của việc gắn hash
Hash chỉ bao phủ tệp cấu hình chính (entry). Một cấu hình `.ts` / `.js` có thể `import` các tệp khác, và `input.processors` có thể gọi các script bên ngoài; cả hai đều không được hash. Một kho lưu trữ mà bạn đã tin tưởng có thể thay đổi những phần đó trong khi tệp chính vẫn giữ nguyên. Đây là lý do các cấu hình có thể thực thi được gắn nhãn như vậy trong lời nhắc — hãy xem "không hỏi lại" là sự tin tưởng vào kho lưu trữ, chứ không chỉ vào tệp bạn đã đọc.
:::

Các dấu hiệu này nằm trong thư mục tạm, nên các quyết định sẽ hết hạn khi hệ điều hành của bạn xóa thư mục đó. Đây là chủ đích: hết hạn theo hướng "hỏi lại" là hướng an toàn.

### Khi nào lời nhắc bị bỏ qua

| Tình huống | Hành vi |
| --- | --- |
| Có truyền `--force` | Được tin tưởng mà không hỏi. Cờ này có nghĩa là bạn chấp nhận hậu quả; một thông báo được in ra stderr. |
| Shell không tương tác (CI, pipe) | Được tin tưởng mà không hỏi, giữ cho các quy trình tự động hiện có tiếp tục hoạt động. Một thông báo được in ra stderr. |
| Kho lưu trữ đã được tin tưởng | Được tải mà không hỏi, miễn là cấu hình không thay đổi. |
| Sử dụng `--config` tuyệt đối | Cấu hình riêng của kho lưu trữ đã clone không bao giờ được tải, nên không có gì cần xác nhận. |
| Bản clone không có tệp cấu hình | Không có gì để tin tưởng. |

Khi dùng `--stdout`, hoặc khi stdout bị chuyển hướng, lời nhắc không thể hiển thị được. Thay vì âm thầm tin tưởng cấu hình, Repomix báo lỗi kèm hướng dẫn.

### Khuyến nghị

1. Không bật `--remote-trust-config` trừ khi bạn cần dùng cấu hình riêng của kho lưu trữ.
2. Đọc cấu hình trong lời nhắc trước khi trả lời, đặc biệt là `input.processors` và bất kỳ đường dẫn `../` nào.
3. Ưu tiên chọn "Có, chỉ lần này" đối với các kho lưu trữ mà bạn không kiểm soát.
4. Trong CI, hãy nhớ rằng lời nhắc không thể bảo vệ bạn — hãy ghim (pin) phiên bản bạn đóng gói và xem xét nó trước.

## Xử lý cảnh báo bảo mật

Khi Repomix phát hiện thông tin nhạy cảm, bạn có một số tùy chọn:

1. **Sửa vấn đề**: Xóa hoặc thay thế thông tin nhạy cảm trong mã nguồn
2. **Bỏ qua tệp**: Thêm tệp có vấn đề vào `.repomixignore`
3. **Tiếp tục với rủi ro**: Tiếp tục quá trình đóng gói (không được khuyến nghị)
4. **Tùy chỉnh quy tắc**: Điều chỉnh cấu hình Secretlint để giảm cảnh báo sai

## Tài nguyên liên quan

- [Xử lý kho lưu trữ GitHub](/vi/guide/remote-repository-processing) - Đóng gói các kho lưu trữ mà bạn chưa tự clone
- [Cấu hình](/vi/guide/configuration) - Cấu hình kiểm tra bảo mật qua `security.enableSecurityCheck`
- [Tùy chọn dòng lệnh](/vi/guide/command-line-options) - Sử dụng cờ `--no-security-check`
- [Chính sách quyền riêng tư](/vi/guide/privacy) - Tìm hiểu về cách Repomix xử lý dữ liệu
