# 명령행 옵션

## 기본 옵션
- `-v, --version`: 도구 버전 표시

## CLI 입출력 옵션
- `--verbose`: 자세한 로깅 활성화
- `--quiet`: 표준 출력으로의 모든 출력 비활성화
- `--stdout`: 파일에 쓰는 대신 표준 출력으로 출력 (`--output` 옵션과 함께 사용할 수 없음)
- `--stdin`: 파일을 자동으로 발견하는 대신 표준 입력에서 파일 경로 읽기
- `--copy`: 생성된 출력을 시스템 클립보드에 추가로 복사
- `--token-count-tree [threshold]`: 토큰 수 요약과 함께 파일 트리 표시 (선택사항: 최소 토큰 수 임계값). 큰 파일을 식별하고 AI 컨텍스트 제한에 대한 토큰 사용량을 최적화하는 데 유용
- `--top-files-len <number>`: 요약에 표시할 상위 파일 수 (기본값: 5, 예: --top-files-len 20)

## Repomix 출력 옵션
- `-o, --output <file>`: 출력 파일 경로 (기본값: repomix-output.xml, 표준출력은 "-" 사용)
- `--style <type>`: 출력 형식: xml, markdown, json, 또는 plain (기본값: xml)
- `--parsable-style`: 선택된 스타일 스키마를 기반으로 파싱 가능한 출력 활성화. 이는 토큰 수를 증가시킬 수 있습니다.
- `--compress`: 토큰 수를 줄이기 위해 필수 함수 및 클래스 시그니처에 초점을 맞춘 지능형 코드 추출 수행
- `--output-show-line-numbers`: 출력에 행 번호 표시
- `--no-file-summary`: 파일 요약 섹션 출력 비활성화
- `--no-directory-structure`: 디렉토리 구조 섹션 출력 비활성화
- `--no-files`: 파일 내용 출력 비활성화 (메타데이터 전용 모드)
- `--remove-comments`: 지원되는 파일 타입에서 주석 제거
- `--remove-empty-lines`: 출력에서 빈 줄 제거
- `--truncate-base64`: Base64 데이터 문자열 자르기 활성화
- `--header-text <text>`: 파일 헤더에 포함할 사용자 정의 텍스트
- `--instruction-file-path <path>`: 상세한 사용자 정의 지침이 포함된 파일 경로
- `--split-output <size>`: 출력을 여러 번호가 매겨진 파일로 분할 (예: repomix-output.1.xml, repomix-output.2.xml); 500kb, 2mb, 1.5mb 등의 크기 지정
- `--include-empty-directories`: 출력에 빈 디렉토리 포함
- `--include-full-directory-structure`: --include 패턴 사용 시에도 디렉토리 구조 섹션에 전체 저장소 트리 표시
- `--include-diffs`: 출력에 git 차이점 포함 (작업 트리와 스테이징된 변경사항을 별도로 포함)
- `--include-logs`: 출력에 git 로그 포함 (날짜, 메시지, 파일 경로를 포함한 커밋 히스토리)
- `--include-logs-count <count>`: 포함할 git 로그 커밋 수 (기본값: 50)
- `--no-git-sort-by-changes`: Git 변경 횟수별 파일 정렬 비활성화 (기본적으로 활성화됨)

## 파일 선택 옵션
- `--include <patterns>`: 포함 패턴 목록 (쉼표로 구분)
- `-i, --ignore <patterns>`: 추가 무시 패턴 (쉼표로 구분)
- `--no-gitignore`: .gitignore 파일 사용 비활성화
- `--no-dot-ignore`: .ignore 파일 사용 비활성화
- `--no-default-patterns`: 기본 패턴 비활성화

## 원격 저장소 옵션
- `--remote <url>`: 원격 저장소 처리
- `--remote-branch <name>`: 원격 브랜치 이름, 태그 또는 커밋 해시 지정 (기본값은 저장소 기본 브랜치)

## 구성 옵션
- `-c, --config <path>`: 사용자 정의 구성 파일 경로
- `--init`: 구성 파일 생성
- `--global`: 글로벌 구성 사용

## 보안 옵션
- `--no-security-check`: API 키와 암호 같은 민감한 데이터 스캔 건너뛰기

## 토큰 수 옵션
- `--token-count-encoding <encoding>`: 카운팅용 토크나이저 모델: o200k_base (GPT-4o), cl100k_base (GPT-3.5/4) 등 (기본값: o200k_base)

## MCP 옵션
- `--mcp`: AI 도구 통합을 위한 Model Context Protocol 서버로 실행

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

