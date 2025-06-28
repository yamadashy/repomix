# 명령줄 옵션

## 기본 옵션
- `-v, --version`: 버전 표시

## 출력 옵션
- `-o, --output <file>`: 출력 파일 이름 (기본값: `repomix-output.txt`)
- `--stdout`: 파일에 쓰는 대신 표준 출력으로 출력 (`--output` 옵션과 함께 사용 불가)
- `--style <type>`: 출력 스타일 (`plain`, `xml`, `markdown`) (기본값: `xml`)
- `--parsable-style`: 선택한 스타일 스키마에 기반한 파싱 가능한 출력 활성화 (기본값: `false`)
- `--compress`: 함수와 클래스 시그니처에 중점을 두고 구현 세부 사항을 제거하는 지능형 코드 추출을 수행합니다. 자세한 내용과 예제는 [코드 압축 가이드](code-compress)를 참조하세요.
- `--output-show-line-numbers`: 줄 번호 추가 (기본값: `false`)
- `--copy`: 클립보드에 복사 (기본값: `false`)
- `--no-file-summary`: 파일 요약 비활성화 (기본값: `true`)
- `--no-directory-structure`: 디렉토리 구조 비활성화 (기본값: `true`)
- `--no-files`: 파일 내용 출력 비활성화 (메타데이터 전용 모드) (기본값: `true`)
- `--remove-comments`: 주석 제거 (기본값: `false`)
- `--remove-empty-lines`: 빈 줄 제거 (기본값: `false`)
- `--header-text <text>`: 파일 헤더에 포함할 사용자 정의 텍스트
- `--instruction-file-path <path>`: 상세한 사용자 정의 지침이 포함된 파일 경로
- `--include-empty-directories`: 출력에 빈 디렉토리 포함 (기본값: `false`)
- `--include-diffs`: git 차이점을 출력에 포함 (작업 트리 및 스테이지된 변경 사항이 별도로 포함됨) (기본값: `false`)
- `--no-git-sort-by-changes`: git 변경 횟수로 파일 정렬 비활성화 (기본값: `true`)

## 필터 옵션
- `--include <patterns>`: 포함할 패턴 (쉼표로 구분)
- `-i, --ignore <patterns>`: 무시할 패턴 (쉼표로 구분)
- `--no-gitignore`: .gitignore 파일 사용 비활성화
- `--no-default-patterns`: 기본 패턴 비활성화

## 원격 저장소 옵션
- `--remote <url>`: 원격 저장소 처리
- `--remote-branch <name>`: 원격 브랜치 이름, 태그 또는 커밋 해시 지정 (기본값은 저장소의 기본 브랜치)

## 설정 옵션
- `-c, --config <path>`: 사용자 정의 설정 파일 경로
- `--init`: 설정 파일 생성
- `--global`: 전역 설정 사용

## 보안 옵션
- `--no-security-check`: 보안 검사 비활성화 (기본값: `true`)

## 토큰 카운트 옵션
- `--token-count-encoding <encoding>`: 토큰 카운트 인코딩 지정 (예: `o200k_base`, `cl100k_base`) (기본값: `o200k_base`)

## 기타 옵션
- `--top-files-len <number>`: 표시할 상위 파일 수 (기본값: `5`)
- `--verbose`: 상세 로깅 활성화
- `--quiet`: 표준 출력에 대한 모든 출력 비활성화

## 예제

```bash
# 기본 사용법
repomix

# 사용자 정의 출력
repomix -o output.xml --style xml

# 표준 출력으로 출력
repomix --stdout > custom-output.txt

# 표준 출력으로 출력 후 다른 명령으로 파이프 (예: simonw/llm)
repomix --stdout | llm "이 코드가 무엇을 하는지 설명해주세요"

# 압축을 사용한 사용자 정의 출력
repomix --compress

# 특정 파일 처리
repomix --include "src/**/*.ts" --ignore "**/*.test.ts"

# 브랜치를 지정한 원격 저장소
repomix --remote https://github.com/user/repo/tree/main

# 커밋을 지정한 원격 저장소
repomix --remote https://github.com/user/repo/commit/836abcd7335137228ad77feb28655d85712680f1

# 단축형을 사용한 원격 저장소
repomix --remote user/repo

# stdin에서 파일 목록 (자동 감지)
find src -name "*.ts" -type f | repomix
git ls-files "*.js" | repomix
echo -e "src/index.ts\nsrc/utils.ts" | repomix
```
