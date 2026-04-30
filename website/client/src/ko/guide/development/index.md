# Repomix에 기여하기

Repomix에 관심을 가져주셔서 감사합니다! 🚀 프로젝트를 더 좋게 만들기 위한 여러분의 도움을 환영합니다. 이 가이드는 프로젝트에 기여하는 방법을 안내합니다.

## 기여 방법

- **저장소 스타하기**: [저장소에 스타](https://github.com/yamadashy/repomix)를 눌러 지원해주세요!
- **이슈 생성하기**: 버그를 발견하셨나요? 새로운 기능 아이디어가 있으신가요? [이슈를 생성](https://github.com/yamadashy/repomix/issues)하여 알려주세요.
- **풀 리퀘스트 제출하기**: 수정하거나 개선할 점을 찾으셨나요? PR을 제출해주세요!
- **소문내기**: 소셜 미디어, 블로그 또는 기술 커뮤니티에서 Repomix에 대한 경험을 공유해주세요.
- **Repomix 사용하기**: 실제 사용에서 오는 피드백이 가장 가치 있습니다. 여러분의 프로젝트에 Repomix를 통합해보세요!
- **후원하기**: [후원자가 되어](https://github.com/sponsors/yamadashy) Repomix 개발을 지원해주세요.

## 빠른 시작

```bash
git clone https://github.com/yamadashy/repomix.git
cd repomix
npm install
```

## 개발 명령어

```bash
# CLI 실행
npm run repomix

# 테스트 실행
npm run test
npm run test-coverage

# 코드 린트
npm run lint
```

## 코드 스타일

- 린트 및 포맷팅에 [Biome](https://biomejs.dev/)을 사용합니다.
- 테스트 용이성을 위해 의존성 주입을 사용합니다.
- 파일 길이를 250줄 미만으로 유지합니다.
- 새로운 기능에 대한 테스트를 추가합니다.

## Pull Request 가이드라인

1. 모든 테스트를 실행합니다.
2. 린트 검사를 통과합니다.
3. 문서를 업데이트합니다.
4. 기존 코드 스타일을 따릅니다.

## 개발 환경 설정

### 필수 구성 요소

- Node.js ≥ 20.0.0
- Git
- npm
- Docker (선택 사항, 웹사이트 실행 또는 컨테이너화된 개발용)

### 로컬 개발

Repomix 로컬 개발 환경을 설정하려면:

```bash
# 저장소 복제
git clone https://github.com/yamadashy/repomix.git
cd repomix

# 의존성 설치
npm install

# CLI 실행
npm run repomix
```

### Nix 개발

[Nix](https://nixos.org/download) flakes가 활성화되어 있다면, Node.js 24와 Git이 미리 설치된 재현 가능한 개발 셸에 들어갈 수 있습니다:

```bash
nix develop
```

셸 내부에서 표준 `npm` 워크플로우가 예상대로 동작합니다:

```bash
npm ci
npm run build
npm run test
npm run lint
```

참고: 이 셸은 Repomix 자체를 개발하기 위한 것이며, CLI로 설치하기 위한 것이 아닙니다.

### Docker 개발

Docker를 사용하여 Repomix를 실행할 수도 있습니다:

```bash
# 이미지 빌드
docker build -t repomix .

# 컨테이너 실행
docker run -v ./:/app -it --rm repomix
```

### 프로젝트 구조

프로젝트는 다음 디렉토리로 구성되어 있습니다:

```
src/
├── cli/          # CLI 구현
├── config/       # 구성 처리
├── core/         # 핵심 기능
│   ├── file/     # 파일 처리
│   ├── metrics/  # 메트릭스 계산
│   ├── output/   # 출력 생성
│   ├── security/ # 보안 검사
├── mcp/          # MCP 서버 통합
└── shared/       # 공유 유틸리티
tests/            # src/ 구조를 반영한 테스트
website/          # 문서 웹사이트
├── client/       # 프론트엔드 (VitePress)
└── server/       # 백엔드 API
```

## 웹사이트 개발

Repomix 웹사이트는 [VitePress](https://vitepress.dev/)로 구축되었습니다. 로컬에서 웹사이트를 실행하려면:

```bash
# 전제 조건: 시스템에 Docker가 설치되어 있어야 합니다

# 웹사이트 개발 서버 시작
npm run website

# http://localhost:5173/에서 웹사이트에 액세스
```

문서를 업데이트할 때는 먼저 영어 버전만 업데이트하면 됩니다. 다른 언어로의 번역은 메인테이너가 처리합니다.

## 릴리스 프로세스

메인테이너와 기여자를 위한 릴리스 프로세스:

1. 버전 업데이트
```bash
npm version patch  # 또는 minor/major
```

2. 테스트 및 빌드 실행
```bash
npm run test-coverage
npm run build
```

3. 게시
```bash
npm publish
```

새 버전은 메인테이너에 의해 관리됩니다. 릴리스가 필요하다고 생각되면 이슈를 열어 논의하세요.

## 도움이 필요하신가요?

- [이슈 열기](https://github.com/yamadashy/repomix/issues)
- [Discord 참여](https://discord.gg/wNYzTwZFku)
