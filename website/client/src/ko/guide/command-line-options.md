# 명령행 옵션

## 기본 옵션
- `-v, --version`: 도구 버전 표시

## CLI 입출력 옵션

| 옵션 | 설명 |
|------|------|
| `--verbose` | 상세 디버그 로깅 활성화 (파일 처리, 토큰 수, 구성 세부사항 표시) |
| `--quiet` | 오류를 제외한 모든 콘솔 출력 억제 (스크립팅에 유용) |
| `--stdout` | 파일 대신 표준 출력으로 패키징 결과 직접 출력 (모든 로깅 억제) |
| `--stdin` | 표준 입력에서 파일 경로를 한 줄씩 읽기 (지정된 파일이 직접 처리됨) |
| `--copy` | 처리 후 생성된 출력을 시스템 클립보드에 복사 |
| `--token-count-tree [threshold]` | 토큰 수가 포함된 파일 트리 표시; 선택적 임계값으로 ≥N 토큰 파일만 표시 (예: `--token-count-tree 100`) |
| `--top-files-len <number>` | 요약에 표시할 가장 큰 파일 수 (기본값: `5`) |

## Repomix 출력 옵션

| 옵션 | 설명 |
|------|------|
| `-o, --output <file>` | 출력 파일 경로 (기본값: `repomix-output.xml`, 표준출력은 `"-"` 사용) |
| `--style <style>` | 출력 형식: `xml`, `markdown`, `json`, 또는 `plain` (기본값: `xml`) |
| `--parsable-style` | 유효한 XML/Markdown을 보장하기 위해 특수 문자 이스케이프 (출력에 서식을 깨는 코드가 포함된 경우 필요) |
| `--compress` | Tree-sitter 파싱을 사용하여 핵심 코드 구조 추출 (클래스, 함수, 인터페이스) |
| `--output-show-line-numbers` | 출력의 각 줄에 줄 번호 접두사 추가 |
| `--no-file-summary` | 출력에서 파일 요약 섹션 생략 |
| `--no-directory-structure` | 출력에서 디렉토리 트리 시각화 생략 |
| `--no-files` | 파일 내용 없이 메타데이터만 생성 (저장소 분석에 유용) |
| `--remove-comments` | 패키징 전 모든 코드 주석 제거 |
| `--remove-empty-lines` | 모든 파일에서 빈 줄 제거 |
| `--truncate-base64` | 긴 base64 데이터 문자열을 잘라 출력 크기 축소 |
| `--header-text <text>` | 출력 시작 부분에 포함할 사용자 정의 텍스트 |
| `--instruction-file-path <path>` | 출력에 포함할 사용자 정의 지침이 있는 파일 경로 |
| `--split-output <size>` | 출력을 여러 번호가 매겨진 파일로 분할 (예: `repomix-output.1.xml`); `500kb`, `2mb`, `1.5mb` 등의 크기 지정 |
| `--include-empty-directories` | 디렉토리 구조에 파일이 없는 폴더 포함 |
| `--include-full-directory-structure` | `--include` 패턴 사용 시에도 디렉토리 구조 섹션에 전체 저장소 트리 표시 |
| `--no-git-sort-by-changes` | git 변경 빈도별 파일 정렬 비활성화 (기본값: 가장 자주 변경된 파일 우선) |
| `--include-diffs` | 작업 트리와 스테이징된 변경사항을 보여주는 git diff 섹션 추가 |
| `--include-logs` | 메시지와 변경 파일이 포함된 git 커밋 히스토리 추가 |
| `--include-logs-count <count>` | `--include-logs`와 함께 포함할 최근 커밋 수 (기본값: `50`) |

## 파일 선택 옵션

| 옵션 | 설명 |
|------|------|
| `--include <patterns>` | 이 glob 패턴과 일치하는 파일만 포함 (쉼표로 구분, 예: `"src/**/*.js,*.md"`) |
| `-i, --ignore <patterns>` | 제외할 추가 패턴 (쉼표로 구분, 예: `"*.test.js,docs/**"`) |
| `--no-gitignore` | `.gitignore` 규칙을 파일 필터링에 사용하지 않음 |
| `--no-dot-ignore` | `.ignore` 규칙을 파일 필터링에 사용하지 않음 |
| `--no-default-patterns` | 내장 무시 패턴 적용하지 않음 (`node_modules`, `.git`, 빌드 디렉토리 등) |

## 원격 저장소 옵션

| 옵션 | 설명 |
|------|------|
| `--remote <url>` | 원격 저장소 클론 및 패키징 (GitHub URL 또는 `user/repo` 형식) |
| `--remote-branch <name>` | 사용할 특정 브랜치, 태그 또는 커밋 (기본값: 저장소의 기본 브랜치) |
| `--remote-trust-config` | 원격 저장소의 설정 파일을 신뢰하고 로드 (보안상 기본적으로 비활성화) |

## 구성 옵션

| 옵션 | 설명 |
|------|------|
| `-c, --config <path>` | `repomix.config.json` 대신 사용자 정의 구성 파일 사용 |
| `--init` | 기본 설정으로 새 `repomix.config.json` 파일 생성 |
| `--global` | `--init`과 함께 사용하여 현재 디렉토리 대신 홈 디렉토리에 구성 생성 |

## 보안 옵션
- `--no-security-check`: API 키와 암호 같은 민감한 데이터 스캔 건너뛰기

## 토큰 수 옵션
- `--token-count-encoding <encoding>`: 카운팅용 토크나이저 모델: o200k_base (GPT-4o), cl100k_base (GPT-3.5/4) 등 (기본값: o200k_base)

## MCP 옵션
- `--mcp`: AI 도구 통합을 위한 Model Context Protocol 서버로 실행

## Agent Skills 생성 옵션

| 옵션 | 설명 |
|------|------|
| `--skill-generate [name]` | Claude Agent Skills 형식 출력을 `.claude/skills/<name>/` 디렉토리에 생성 (이름 생략 시 자동 생성) |
| `--skill-output <path>` | 스킬 출력 디렉토리 경로를 직접 지정 (위치 선택 프롬프트 건너뜀) |
| `-f, --force` | 모든 확인 프롬프트 건너뜀 (예: 스킬 디렉토리 덮어쓰기) |

## 관련 리소스

- [설정](/ko/guide/configuration) - CLI 플래그 대신 설정 파일로 옵션 지정
- [출력 형식](/ko/guide/output) - XML, Markdown, JSON, 일반 텍스트 형식 상세 정보
- [코드 압축](/ko/guide/code-compress) - `--compress`와 Tree-sitter의 작동 방식
- [보안](/ko/guide/security) - `--no-security-check`로 비활성화되는 기능

## 예시

```bash
# 기본 사용법
repomix

# 사용자 정의 출력 파일과 형식
repomix -o my-output.xml --style xml

# 표준 출력으로 출력
repomix --stdout > custom-output.txt

# 표준 출력으로 출력한 후 다른 명령으로 파이프 (예: simonw/llm)
repomix --stdout | llm "이 코드가 무엇을 하는지 설명해주세요."

# 압축을 사용한 사용자 정의 출력
repomix --compress

# Git 통합 기능
repomix --include-logs   # git 로그 포함 (기본 50개 커밋)
repomix --include-logs --include-logs-count 10  # 최근 10개 커밋 포함
repomix --include-diffs --include-logs  # 차이점과 로그 모두 포함

# 패턴으로 특정 파일 처리
repomix --include "src/**/*.ts,*.md" --ignore "*.test.js,docs/**"

# 브랜치가 있는 원격 저장소
repomix --remote https://github.com/user/repo/tree/main

# 커밋이 있는 원격 저장소
repomix --remote https://github.com/user/repo/commit/836abcd7335137228ad77feb28655d85712680f1

# 축약형을 사용한 원격 저장소
repomix --remote user/repo

# stdin을 사용한 파일 목록
find src -name "*.ts" -type f | repomix --stdin
git ls-files "*.js" | repomix --stdin
echo -e "src/index.ts\nsrc/utils.ts" | repomix --stdin

# 토큰 수 분석
repomix --token-count-tree
repomix --token-count-tree 1000  # 1000개 이상의 토큰을 가진 파일/디렉토리만 표시
```

