# Repomix Explorer Skill (Agent Skills)

Repomix는 AI 코딩 어시스턴트가 Repomix CLI를 사용하여 코드베이스를 분석하고 탐색할 수 있게 해주는 바로 사용 가능한 **Repomix Explorer** 스킬을 제공합니다.

이 스킬은 Claude Code, Cursor, Codex, GitHub Copilot 등 다양한 AI 도구에서 작동하도록 설계되었습니다.

## 빠른 설치

```bash
npx add-skill yamadashy/repomix --skill repomix-explorer
```

이 명령은 AI 어시스턴트의 스킬 디렉토리(예: `.claude/skills/`)에 스킬을 설치하여 즉시 사용할 수 있게 합니다.

## 기능

설치 후 자연어 지시로 코드베이스를 분석할 수 있습니다.

#### 원격 저장소 분석

```text
"What's the structure of this repo?
https://github.com/facebook/react"
```

#### 로컬 코드베이스 탐색

```text
"What's in this project?
~/projects/my-app"
```

이것은 코드베이스를 이해하는 것뿐만 아니라 다른 저장소를 참조하여 기능을 구현하고 싶을 때도 유용합니다.

## 작동 방식

Repomix Explorer 스킬은 AI 어시스턴트를 완전한 워크플로우로 안내합니다:

1. **repomix 명령 실행** - 저장소를 AI 친화적인 형식으로 패킹
2. **출력 파일 분석** - 패턴 검색(grep)을 사용하여 관련 코드 찾기
3. **인사이트 제공** - 구조, 메트릭, 실행 가능한 권장 사항 보고

## 사용 사례 예시

### 새로운 코드베이스 이해하기

```text
"I want to understand the architecture of this project.
https://github.com/vercel/next.js"
```

AI가 repomix를 실행하고 출력을 분석하여 코드베이스의 구조화된 개요를 제공합니다.

### 특정 패턴 찾기

```text
"Find all authentication-related code in this repository."
```

AI가 인증 패턴을 검색하고 파일별로 결과를 분류하며 인증이 어떻게 구현되었는지 설명합니다.

### 자신의 프로젝트 참조하기

```text
"I want to implement a similar feature to what I did in my other project.
~/projects/my-other-app"
```

AI가 다른 저장소를 분석하고 자신의 구현을 참조하는 것을 도와줍니다.

## 스킬 내용

이 스킬에는 다음이 포함됩니다:

- **사용자 의도 인식** - 사용자가 코드베이스 분석을 요청하는 다양한 방식 이해
- **Repomix 명령 가이드** - 사용할 옵션 파악 (`--compress`, `--include` 등)
- **분석 워크플로우** - 패킹된 출력을 탐색하기 위한 구조화된 접근 방식
- **모범 사례** - 전체 파일을 읽기 전에 grep을 사용하는 것과 같은 효율성 팁

## 관련 리소스

- [Agent Skills 생성](/ko/guide/agent-skills-generation) - 코드베이스에서 자신만의 스킬 생성
- [Claude Code 플러그인](/ko/guide/claude-code-plugins) - Claude Code용 Repomix 플러그인
- [MCP 서버](/ko/guide/mcp-server) - 대체 통합 방법
