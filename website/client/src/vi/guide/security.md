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

## Xử lý cảnh báo bảo mật

Khi Repomix phát hiện thông tin nhạy cảm, bạn có một số tùy chọn:

1. **Sửa vấn đề**: Xóa hoặc thay thế thông tin nhạy cảm trong mã nguồn
2. **Bỏ qua tệp**: Thêm tệp có vấn đề vào `.repomixignore`
3. **Tiếp tục với rủi ro**: Tiếp tục quá trình đóng gói (không được khuyến nghị)
4. **Tùy chỉnh quy tắc**: Điều chỉnh cấu hình Secretlint để giảm cảnh báo sai

## Tài nguyên liên quan

- [Cấu hình](/vi/guide/configuration) - Cấu hình kiểm tra bảo mật qua `security.enableSecurityCheck`
- [Tùy chọn dòng lệnh](/vi/guide/command-line-options) - Sử dụng cờ `--no-security-check`
- [Chính sách quyền riêng tư](/vi/guide/privacy) - Tìm hiểu về cách Repomix xử lý dữ liệu
