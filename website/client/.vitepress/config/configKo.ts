import { type DefaultTheme, defineConfig } from 'vitepress';

export const configKo = defineConfig({
  lang: 'ko',
  description: '코드베이스를 AI 친화적인 형식으로 패키징',
  themeConfig: {
    nav: [
      { text: '가이드', link: '/ko/guide/', activeMatch: '^/ko/guide/' },
      {
        text: 'Chrome 확장 프로그램',
        link: 'https://chromewebstore.google.com/detail/repomix/fimfamikepjgchehkohedilpdigcpkoa',
      },
      { text: 'Discord 참여', link: 'https://discord.gg/wNYzTwZFku' },
    ],
    sidebar: {
      '/ko/guide/': [
        {
          text: '소개',
          items: [
            { text: '시작하기', link: '/ko/guide/' },
            { text: '설치', link: '/ko/guide/installation' },
            { text: '기본 사용법', link: '/ko/guide/usage' },
            { text: '프롬프트 예제', link: '/ko/guide/prompt-examples' },
            { text: '사용 사례', link: '/ko/guide/use-cases' },
          ],
        },
        {
          text: '가이드',
          items: [
            { text: '출력 형식', link: '/ko/guide/output' },
            { text: '명령줄 옵션', link: '/ko/guide/command-line-options' },
            { text: '설정', link: '/ko/guide/configuration' },
            { text: '사용자 정의 지침', link: '/ko/guide/custom-instructions' },
            { text: 'GitHub 저장소 처리', link: '/ko/guide/remote-repository-processing' },
            { text: '주석 제거', link: '/ko/guide/comment-removal' },
            { text: '코드 압축', link: '/ko/guide/code-compress' },
            { text: '보안', link: '/ko/guide/security' },
          ],
        },
        {
          text: '고급',
          items: [
            { text: 'MCP 서버', link: '/ko/guide/mcp-server' },
            { text: 'Claude Code 플러그인', link: '/ko/guide/claude-code-plugins' },
            { text: 'Agent Skills 생성', link: '/ko/guide/agent-skills-generation' },
            { text: 'Repomix Explorer Skill', link: '/ko/guide/repomix-explorer-skill' },
            { text: 'GitHub Actions', link: '/ko/guide/github-actions' },
            { text: 'Repomix를 라이브러리로 사용하기', link: '/ko/guide/development/using-repomix-as-a-library' },
            { text: 'AI 지원 개발 팁', link: '/ko/guide/tips/best-practices' },
          ],
        },
        {
          text: '커뮤니티',
          items: [
            { text: '커뮤니티 프로젝트', link: '/ko/guide/community-projects' },
            { text: 'Repomix에 기여하기', link: '/ko/guide/development/' },
            { text: '후원자', link: '/ko/guide/sponsors' },
            { text: 'Privacy Policy', link: '/ko/guide/privacy' },
          ],
        },
      ],
    },
  },
});

export const configKoSearch: DefaultTheme.LocalSearchOptions['locales'] = {
  ko: {
    translations: {
      button: {
        buttonText: '검색',
        buttonAriaLabel: '검색',
      },
      modal: {
        noResultsText: '검색 결과가 없습니다',
        resetButtonTitle: '검색 초기화',
        backButtonTitle: '뒤로',
        displayDetails: '상세 정보 표시',
        footer: {
          selectText: '선택',
          navigateText: '이동',
          closeText: '닫기',
        },
      },
    },
  },
};
