# 기본 사용법

## 빠른 시작

저장소 전체를 패키징:
```bash
repomix
```

## 일반적인 사용 사례

### 특정 디렉토리 패키징
```bash
repomix path/to/directory
```

### 특정 파일 포함
[glob 패턴](https://github.com/mrmlnc/fast-glob?tab=readme-ov-file#pattern-syntax) 사용:
```bash
repomix --include "src/**/*.ts,**/*.md"
```

### 파일 제외
```bash
repomix --ignore "**/*.log,tmp/"
```

### 출력을 여러 파일로 분할

대규모 코드베이스로 작업할 때 패키징된 출력이 일부 AI 도구의 파일 크기 제한을 초과할 수 있습니다 (예: Google AI Studio의 1MB 제한). `--split-output`을 사용하여 출력을 자동으로 여러 파일로 분할합니다:

```bash
repomix --split-output 1mb
```

이렇게 하면 다음과 같은 번호가 매겨진 파일이 생성됩니다:
- `repomix-output.1.xml`
- `repomix-output.2.xml`
- `repomix-output.3.xml`

크기는 단위와 함께 지정할 수 있습니다: `500kb`, `1mb`, `2mb`, `1.5mb` 등. 소수점 값도 지원됩니다.

> [!NOTE]
> 컨텍스트를 유지하기 위해 파일은 최상위 디렉토리별로 그룹화됩니다. 단일 파일이나 디렉토리는 여러 출력 파일로 분할되지 않습니다.

### 원격 저장소 처리
```bash
# GitHub URL 사용
repomix --remote https://github.com/user/repo

# 단축형 사용
repomix --remote user/repo

# 특정 브랜치/태그/커밋
repomix --remote user/repo --remote-branch main
repomix --remote user/repo --remote-branch 935b695
```

### 파일 목록 입력 (stdin)

최고의 유연성을 위해 stdin을 통해 파일 경로를 전달하세요:

```bash
# find 명령 사용
find src -name "*.ts" -type f | repomix --stdin

# git을 사용하여 추적된 파일 가져오기
git ls-files "*.ts" | repomix --stdin

# ripgrep (rg) 을 사용하여 파일 찾기
rg --files --type ts | repomix --stdin

# grep을 사용하여 특정 내용을 포함하는 파일 찾기
grep -l "TODO" **/*.ts | repomix --stdin

# ripgrep을 사용하여 특정 내용을 포함하는 파일 찾기
rg -l "TODO|FIXME" --type ts | repomix --stdin

# sharkdp/fd 를 사용하여 파일 찾기
fd -e ts | repomix --stdin

# fzf를 사용하여 모든 파일에서 선택
fzf -m | repomix --stdin

# fzf를 사용한 대화형 파일 선택
find . -name "*.ts" -type f | fzf -m | repomix --stdin

# glob 패턴과 함께 ls 사용
ls src/**/*.ts | repomix --stdin

# 파일 경로가 포함된 파일에서
cat file-list.txt | repomix --stdin

# echo로 직접 입력
echo -e "src/index.ts\nsrc/utils.ts" | repomix --stdin
```

`--stdin` 옵션을 사용하면 파일 경로 목록을 Repomix로 파이프할 수 있어 패킹할 파일 선택에 최고의 유연성을 제공합니다.

`--stdin`을 사용할 때 지정된 파일은 실질적으로 include 패턴에 추가됩니다. 즉, 일반적인 include 및 ignore 동작이 여전히 적용되므로 stdin으로 지정한 파일도 ignore 패턴과 일치하면 제외됩니다.

> [!NOTE]
> `--stdin`을 사용할 때 파일 경로는 상대 경로 또는 절대 경로가 될 수 있으며, Repomix가 자동으로 경로 해석과 중복 제거를 처리합니다.

### 코드 압축

```bash
repomix --compress

# 원격 저장소에서도 사용할 수 있습니다:
repomix --remote yamadashy/repomix --compress
```

### Git 통합

AI 분석을 위한 개발 컨텍스트를 제공하기 위해 Git 정보를 포함합니다:

```bash
# git 차이점 포함 (커밋되지 않은 변경사항)
repomix --include-diffs

# git 커밋 로그 포함 (기본값: 최근 50개 커밋)
repomix --include-logs

# 특정 수의 커밋 포함
repomix --include-logs --include-logs-count 10

# 차이점과 로그 모두 포함
repomix --include-diffs --include-logs
```

이것은 다음과 같은 귀중한 컨텍스트를 추가합니다:
- **최근 변경사항**: Git 차이점은 커밋되지 않은 수정사항을 보여줍니다
- **개발 패턴**: Git 로그는 일반적으로 함께 변경되는 파일을 드러냅니다
- **커밋 히스토리**: 최근 커밋 메시지는 개발 초점에 대한 통찰을 제공합니다
- **파일 관계**: 같은 커밋에서 수정되는 파일들에 대한 이해

### 토큰 수 최적화

코드베이스의 토큰 분포를 이해하는 것은 AI 상호 작용을 최적화하는 데 중요합니다. `--token-count-tree` 옵션을 사용하여 프로젝트 전체의 토큰 사용량을 시각화하세요:

```bash
repomix --token-count-tree
```

이렇게 하면 토큰 수와 함께 코드베이스의 계층 뷰가 표시됩니다:

```
🔢 Token Count Tree:
────────────────────
└── src/ (70,925 tokens)
    ├── cli/ (12,714 tokens)
    │   ├── actions/ (7,546 tokens)
    │   └── reporters/ (990 tokens)
    └── core/ (41,600 tokens)
        ├── file/ (10,098 tokens)
        └── output/ (5,808 tokens)
```

최소 토큰 임계값을 설정하여 큰 파일에 집중할 수도 있습니다:

```bash
repomix --token-count-tree 1000  # 1000개 이상의 토큰을 가진 파일/디렉토리만 표시
```

이를 통해 다음을 수행할 수 있습니다:
- **토큰이 많은 파일 식별** - AI 컨텍스트 제한을 초과할 수 있는 파일 발견
- **파일 선택 최적화** - `--include` 및 `--ignore` 패턴 사용
- **압축 전략 계획** - 가장 큰 기여자를 대상으로 하는 전략
- **콘텐츠와 컨텍스트의 균형** - AI 분석을 위한 코드 준비 시 균형 조정

## 출력 형식

### XML (기본값)
```bash
repomix --style xml
```

### Markdown
```bash
repomix --style markdown
```

### JSON
```bash
repomix --style json
```

### 일반 텍스트
```bash
repomix --style plain
```

## 추가 옵션

### 주석 제거
```bash
repomix --remove-comments
```

### 행 번호 표시
```bash
repomix --output-show-line-numbers
```

### 클립보드에 복사
```bash
repomix --copy
```

### 보안 검사 비활성화
```bash
repomix --no-security-check
```

## 설정

설정 파일 초기화:
```bash
repomix --init
```

더 자세한 설정 옵션은 [설정 가이드](/ko/guide/configuration)를 참조하세요.
