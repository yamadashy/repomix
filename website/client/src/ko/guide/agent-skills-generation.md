# Agent Skills 생성

Repomix는 [Claude Agent Skills](https://docs.anthropic.com/en/docs/claude-code/skills) 형식의 출력을 생성하여 AI 어시스턴트의 재사용 가능한 코드베이스 참조로 사용할 수 있는 구조화된 Skills 디렉토리를 생성할 수 있습니다.

이 기능은 특히 원격 저장소의 구현을 참조하고 싶을 때 강력한 힘을 발휘합니다. 오픈소스 프로젝트에서 Skills를 생성하면 자신의 코드를 작성하면서 Claude에게 특정 패턴이나 구현을 참조하도록 쉽게 요청할 수 있습니다.

단일 패키지 파일을 생성하는 대신, Skills 생성은 AI 이해와 grep 친화적인 검색에 최적화된 여러 참조 파일을 포함하는 구조화된 디렉토리를 생성합니다.

> [!NOTE]
> 이것은 실험적인 기능입니다. 출력 형식과 옵션은 사용자 피드백에 따라 향후 릴리스에서 변경될 수 있습니다.

## 기본 사용법

로컬 디렉토리에서 Skills 생성:

```bash
# 현재 디렉토리에서 Skills 생성
repomix --skill-generate

# 사용자 정의 Skills 이름으로 생성
repomix --skill-generate my-project-reference

# 특정 디렉토리에서 생성
repomix path/to/directory --skill-generate

# 원격 저장소에서 생성
repomix --remote https://github.com/user/repo --skill-generate
```

## Skills 저장 위치 선택

명령을 실행하면 Repomix가 Skills 저장 위치를 선택하도록 요청합니다:

1. **Personal Skills** (`~/.claude/skills/`) - 머신의 모든 프로젝트에서 사용 가능
2. **Project Skills** (`.claude/skills/`) - git을 통해 팀과 공유

Skills 디렉토리가 이미 존재하면 덮어쓰기 확인 메시지가 표시됩니다.

> [!TIP]
> Project Skills를 생성할 때는 대용량 파일의 커밋을 피하기 위해 `.gitignore`에 추가하는 것을 고려하세요:
> ```gitignore
> .claude/skills/repomix-reference-*/
> ```

## 생성되는 구조

Skills는 다음 구조로 생성됩니다:

```text
.claude/skills/<skill-name>/
├── SKILL.md                    # 메인 Skills 메타데이터 및 문서
└── references/
    ├── summary.md              # 목적, 형식 및 통계
    ├── project-structure.md    # 행 수가 포함된 디렉토리 트리
    ├── files.md                # 모든 파일 내용 (grep 친화적)
    └── tech-stack.md           # 언어, 프레임워크, 종속성
```

### 파일 설명

#### SKILL.md

메인 Skills 파일로 다음을 포함합니다:
- Skills 이름, 설명 및 프로젝트 정보
- 파일 수, 행 수 및 토큰 수
- Skills 사용 방법 개요
- 파일 위치 및 형식 설명
- 일반적인 사용 사례 및 팁

#### references/summary.md

포함 내용:
- **목적**: AI 사용을 위한 참조 코드베이스임을 설명
- **파일 구조**: 각 참조 파일의 내용 문서화
- **사용 지침**: Skills를 효과적으로 사용하는 방법
- **통계**: 파일 유형, 언어 및 가장 큰 파일별 분류

#### references/project-structure.md

파일 탐색을 위한 파일당 행 수가 포함된 디렉토리 트리:

```text
src/
  index.ts (42 lines)
  utils/
    helpers.ts (128 lines)
    math.ts (87 lines)
```

#### references/files.md

grep 친화적인 검색에 최적화된 구문 강조 헤더가 있는 모든 파일 내용:

````markdown
## File: src/index.ts
```typescript
import { sum } from './utils/helpers';

export function main() {
  console.log(sum(1, 2));
}
```
````

#### references/tech-stack.md

종속성 파일에서 자동 감지된 기술 스택:
- **언어**: TypeScript, JavaScript, Python 등
- **프레임워크**: React, Next.js, Express, Django 등
- **런타임 버전**: Node.js, Python, Go 등
- **패키지 관리자**: npm, pnpm, poetry 등
- **종속성**: 모든 직접 및 개발 종속성
- **설정 파일**: 감지된 모든 설정 파일

감지 대상 파일: `package.json`, `requirements.txt`, `Cargo.toml`, `go.mod`, `.nvmrc`, `pyproject.toml` 등.

## 자동 생성 Skills 이름

이름이 제공되지 않으면 Repomix가 다음 패턴으로 자동 생성합니다:

```bash
repomix src/ --skill-generate                # → repomix-reference-src
repomix --remote user/repo --skill-generate  # → repomix-reference-repo
repomix --skill-generate CustomName          # → custom-name (kebab-case로 정규화)
```

Skills 이름은:
- kebab-case(소문자, 하이픈 구분)로 변환
- 최대 64자로 제한
- 경로 탐색으로부터 보호

## Repomix 옵션과의 통합

Skills 생성은 모든 표준 Repomix 옵션을 지원합니다:

```bash
# 파일 필터링과 함께 Skills 생성
repomix --skill-generate --include "src/**/*.ts" --ignore "**/*.test.ts"

# 압축과 함께 Skills 생성
repomix --skill-generate --compress

# 원격 저장소에서 Skills 생성
repomix --remote yamadashy/repomix --skill-generate

# 특정 출력 형식 옵션과 함께 Skills 생성
repomix --skill-generate --remove-comments --remove-empty-lines
```

### 문서 전용 Skills

`--include`를 사용하면 GitHub 저장소의 문서만 포함된 Skills를 생성할 수 있습니다. 코드를 작성하면서 Claude가 특정 라이브러리나 프레임워크 문서를 참조하도록 할 때 유용합니다:

```bash
# Claude Code Action 문서
repomix --remote https://github.com/anthropics/claude-code-action --include docs --skill-generate

# Vite 문서
repomix --remote https://github.com/vitejs/vite --include docs --skill-generate

# React 문서
repomix --remote https://github.com/reactjs/react.dev --include src/content --skill-generate
```

## 제한 사항

`--skill-generate` 옵션은 다음과 함께 사용할 수 없습니다:
- `--stdout` - Skills 출력은 파일 시스템에 쓰기가 필요함
- `--copy` - Skills 출력은 디렉토리이므로 클립보드에 복사할 수 없음

## 생성된 Skills 사용

생성 후 Claude에서 Skills를 사용할 수 있습니다:

1. **Claude Code**: `~/.claude/skills/` 또는 `.claude/skills/`에 저장되면 자동으로 사용 가능
2. **Claude Web**: 코드베이스 분석을 위해 Skills 디렉토리를 Claude에 업로드
3. **팀 공유**: 팀 전체 액세스를 위해 `.claude/skills/`를 저장소에 커밋

## 예제 워크플로우

### 개인 참조 라이브러리 만들기

```bash
# 흥미로운 오픈소스 프로젝트를 클론하고 분석
repomix --remote facebook/react --skill-generate react-reference

# Skills가 ~/.claude/skills/react-reference/에 저장됨
# 이제 모든 Claude 대화에서 React 코드베이스를 참조할 수 있음
```

### 팀 프로젝트 문서화

```bash
# 프로젝트 디렉토리에서
cd my-project

# 팀을 위한 Skills 생성
repomix --skill-generate

# 프롬프트에서 "Project Skills" 선택
# Skills가 .claude/skills/repomix-reference-my-project/에 저장됨

# 커밋하고 팀과 공유
git add .claude/skills/
git commit -m "Add codebase reference Skills"
```

## 관련 리소스

- [Claude Code 플러그인](/ko/guide/claude-code-plugins) - Claude Code용 Repomix 플러그인에 대해 알아보기
- [MCP 서버](/ko/guide/mcp-server) - 대체 통합 방법
- [코드 압축](/ko/guide/code-compress) - 압축으로 토큰 수 줄이기
- [설정](/ko/guide/configuration) - Repomix 동작 사용자 지정
