import { type DefaultTheme, defineConfig } from 'vitepress';

export const configVi = defineConfig({
  lang: 'vi',
  description: 'Đóng gói codebase của bạn thành các định dạng thân thiện với AI',
  themeConfig: {
    nav: [
      { text: 'Hướng dẫn', link: '/vi/guide/', activeMatch: '^/vi/guide/' },
      {
        text: 'Tiện ích Chrome',
        link: 'https://chromewebstore.google.com/detail/repomix/fimfamikepjgchehkohedilpdigcpkoa',
      },
      { text: 'Tham gia Discord', link: 'https://discord.gg/wNYzTwZFku' },
    ],
    sidebar: {
      '/vi/guide/': [
        {
          text: 'Giới thiệu',
          items: [
            { text: 'Bắt đầu', link: '/vi/guide/' },
            { text: 'Cài đặt', link: '/vi/guide/installation' },
            { text: 'Sử dụng cơ bản', link: '/vi/guide/usage' },
            { text: 'Ví dụ Prompt', link: '/vi/guide/prompt-examples' },
            { text: 'Trường Hợp Sử Dụng', link: '/vi/guide/use-cases' },
          ],
        },
        {
          text: 'Hướng dẫn',
          items: [
            { text: 'Định dạng đầu ra', link: '/vi/guide/output' },
            { text: 'Tùy chọn dòng lệnh', link: '/vi/guide/command-line-options' },
            { text: 'Cấu hình', link: '/vi/guide/configuration' },
            { text: 'Hướng dẫn tùy chỉnh', link: '/vi/guide/custom-instructions' },
            { text: 'Xử lý kho lưu trữ GitHub', link: '/vi/guide/remote-repository-processing' },
            { text: 'Xóa bình luận', link: '/vi/guide/comment-removal' },
            { text: 'Nén mã', link: '/vi/guide/code-compress' },
            { text: 'Bảo mật', link: '/vi/guide/security' },
          ],
        },
        {
          text: 'Nâng cao',
          items: [
            { text: 'Máy chủ MCP', link: '/vi/guide/mcp-server' },
            { text: 'Plugin Claude Code', link: '/vi/guide/claude-code-plugins' },
            { text: 'Tạo Agent Skills', link: '/vi/guide/agent-skills-generation' },
            { text: 'Repomix Explorer Skill', link: '/vi/guide/repomix-explorer-skill' },
            { text: 'GitHub Actions', link: '/vi/guide/github-actions' },
            {
              text: 'Sử dụng Repomix như một thư viện',
              link: '/vi/guide/development/using-repomix-as-a-library',
            },
            { text: 'Mẹo phát triển hỗ trợ AI', link: '/vi/guide/tips/best-practices' },
          ],
        },
        {
          text: 'Cộng đồng',
          items: [
            { text: 'Dự án Cộng đồng', link: '/vi/guide/community-projects' },
            { text: 'Đóng góp cho Repomix', link: '/vi/guide/development/' },
            { text: 'Nhà tài trợ', link: '/vi/guide/sponsors' },
            { text: 'Privacy Policy', link: '/vi/guide/privacy' },
          ],
        },
      ],
    },
  },
});

export const configViSearch: DefaultTheme.LocalSearchOptions['locales'] = {
  vi: {
    translations: {
      button: {
        buttonText: 'Tìm kiếm',
        buttonAriaLabel: 'Tìm kiếm',
      },
      modal: {
        noResultsText: 'Không tìm thấy kết quả',
        resetButtonTitle: 'Đặt lại tìm kiếm',
        backButtonTitle: 'Quay lại',
        displayDetails: 'Hiển thị chi tiết',
        footer: {
          selectText: 'Chọn',
          navigateText: 'Điều hướng',
          closeText: 'Đóng',
        },
      },
    },
  },
};
