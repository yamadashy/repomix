# Claude Code 플러그인

Repomix는 [Claude Code](https://docs.anthropic.com/en/docs/claude-code/overview)용 공식 플러그인을 제공하여 AI 기반 개발 환경과 원활하게 통합됩니다. 이 플러그인을 사용하면 자연어 명령을 사용하여 Claude Code 내에서 직접 코드베이스를 분석하고 패키징할 수 있습니다.

## 설치

### 1. Repomix 플러그인 마켓플레이스 추가

먼저 Claude Code에 Repomix 플러그인 마켓플레이스를 추가합니다:

```text
/plugin marketplace add yamadashy/repomix
```

### 2. 플러그인 설치

다음 명령을 사용하여 플러그인을 설치합니다:

```text
# MCP 서버 플러그인 설치 (권장 기반)
/plugin install repomix-mcp@repomix

# 명령 플러그인 설치 (기능 확장)
/plugin install repomix-commands@repomix

# 저장소 탐색기 플러그인 설치 (AI 기반 분석)
/plugin install repomix-explorer@repomix
```

::: tip 플러그인 관계
`repomix-mcp` 플러그인을 기반으로 권장합니다. `repomix-commands` 플러그인은 편리한 슬래시 명령을 제공하고, `repomix-explorer`는 AI 기반 분석 기능을 추가합니다. 독립적으로 설치할 수 있지만, 세 가지 모두 사용하면 가장 포괄적인 경험을 제공합니다.
:::

### 대안: 대화형 설치

대화형 플러그인 설치 프로그램을 사용할 수도 있습니다:

```text
/plugin
```

사용 가능한 플러그인을 탐색하고 설치할 수 있는 대화형 인터페이스가 열립니다.

## 사용 가능한 플러그인

### 1. repomix-mcp (MCP 서버 플러그인)

MCP 서버 통합을 통해 AI 기반 코드베이스 분석을 제공하는 기본 플러그인입니다.

**기능:**
- 로컬 및 원격 저장소 패키징
- 패키징된 출력 검색
- 내장 보안 스캔으로 파일 읽기 ([Secretlint](https://github.com/secretlint/secretlint))
- 자동 Tree-sitter 압축 (토큰 약 70% 감소)

### 2. repomix-commands (슬래시 명령 플러그인)

자연어 지원과 함께 편리한 슬래시 명령을 제공합니다.

**사용 가능한 명령:**
- `/repomix-commands:pack-local` - 다양한 옵션으로 로컬 코드베이스 패키징
- `/repomix-commands:pack-remote` - 원격 GitHub 저장소 패키징 및 분석

### 3. repomix-explorer (AI 분석 에이전트 플러그인)

Repomix CLI를 사용하여 코드베이스를 지능적으로 탐색하는 AI 기반 저장소 분석 에이전트입니다.

**기능:**
- 자연어를 사용한 코드베이스 탐색 및 분석
- 지능적인 패턴 발견 및 코드 구조 이해
- grep 및 대상 파일 읽기를 사용한 점진적 분석
- 대형 저장소를 위한 자동 컨텍스트 관리

**사용 가능한 명령:**
- `/repomix-explorer:explore-local` - AI 지원으로 로컬 코드베이스 분석
- `/repomix-explorer:explore-remote` - AI 지원으로 원격 GitHub 저장소 분석

**작동 방식:**
1. `npx repomix@latest`를 실행하여 저장소 패키징
2. Grep 및 Read 도구를 사용하여 출력을 효율적으로 검색
3. 과도한 컨텍스트 소비 없이 포괄적인 분석 제공

## 사용 예제

### 로컬 코드베이스 패키징

자연어 지침과 함께 `/repomix-commands:pack-local` 명령을 사용합니다:

```text
/repomix-commands:pack-local
이 프로젝트를 Markdown 형식으로 압축하여 패키징
```

기타 예제:
- "src 디렉토리만 패키징"
- "TypeScript 파일을 행 번호와 함께 패키징"
- "JSON 형식으로 출력 생성"

### 원격 저장소 패키징

`/repomix-commands:pack-remote` 명령을 사용하여 GitHub 저장소를 분석합니다:

```text
/repomix-commands:pack-remote yamadashy/repomix
yamadashy/repomix 저장소에서 TypeScript 파일만 패키징
```

기타 예제:
- "main 브랜치를 압축하여 패키징"
- "문서 파일만 포함"
- "특정 디렉토리 패키징"

### AI로 로컬 코드베이스 탐색

AI 기반 분석을 위해 `/repomix-explorer:explore-local` 명령을 사용합니다:

```text
/repomix-explorer:explore-local ./src
인증 관련 코드를 모두 찾아줘
```

기타 예제:
- "이 프로젝트의 구조를 분석해줘"
- "주요 컴포넌트를 보여줘"
- "모든 API 엔드포인트를 찾아줘"

### AI로 원격 저장소 탐색

GitHub 저장소를 분석하려면 `/repomix-explorer:explore-remote` 명령을 사용합니다:

```text
/repomix-explorer:explore-remote facebook/react
주요 컴포넌트 아키텍처를 보여줘
```

기타 예제:
- "저장소의 모든 React 훅을 찾아줘"
- "프로젝트 구조를 설명해줘"
- "에러 바운더리는 어디에 정의되어 있어?"

## 관련 리소스

- [MCP 서버 문서](/guide/mcp-server) - 기본 MCP 서버에 대해 알아보기
- [구성](/guide/configuration) - Repomix 동작 사용자 지정
- [보안](/guide/security) - 보안 기능 이해
- [명령줄 옵션](/guide/command-line-options) - 사용 가능한 CLI 옵션

## 플러그인 소스 코드

플러그인 소스 코드는 Repomix 저장소에서 확인할 수 있습니다:

- [플러그인 마켓플레이스](https://github.com/yamadashy/repomix/tree/main/.claude-plugin)
- [MCP 플러그인](https://github.com/yamadashy/repomix/tree/main/.claude/plugins/repomix-mcp)
- [명령 플러그인](https://github.com/yamadashy/repomix/tree/main/.claude/plugins/repomix-commands)
- [저장소 탐색기 플러그인](https://github.com/yamadashy/repomix/tree/main/.claude/plugins/repomix-explorer)

## 피드백 및 지원

Claude Code 플러그인에 대한 문제가 발생하거나 제안이 있는 경우:

- [GitHub에서 이슈 열기](https://github.com/yamadashy/repomix/issues)
- [Discord 커뮤니티 가입](https://discord.gg/wNYzTwZFku)
- [기존 토론 보기](https://github.com/yamadashy/repomix/discussions)
