# 설치

## npx 사용 (설치 불필요)

```bash
npx repomix@latest
```

## 전역 설치

::: code-group
```bash [npm]
npm install -g repomix
```
```bash [yarn]
yarn global add repomix
```
```bash [pnpm]
pnpm add -g repomix
```
```bash [bun]
bun add -g repomix
```
```bash [Homebrew]
brew install repomix
```
:::

## Docker 설치

Docker를 사용하면 환경 설정 문제를 피할 수 있어 가장 편리한 방법 중 하나입니다. 아래와 같이 실행하세요:

```bash
# 현재 디렉토리 처리
docker run -v .:/app -it --rm ghcr.io/yamadashy/repomix

# 특정 디렉토리 처리
docker run -v .:/app -it --rm ghcr.io/yamadashy/repomix path/to/directory

# 원격 저장소 처리
docker run -v ./output:/app -it --rm ghcr.io/yamadashy/repomix --remote yamadashy/repomix
```

## VSCode 확장 프로그램

커뮤니티에서 관리하는 [Repomix Runner](https://marketplace.visualstudio.com/items?itemName=DorianMassoulier.repomix-runner) 확장 프로그램을 통해 VSCode에서 직접 Repomix를 실행할 수 있습니다.

기능:
- 몇 번의 클릭으로 폴더 패키징
- 파일 또는 콘텐츠 모드로 복사
- 출력 파일 자동 정리
- repomix.config.json 지원

[VSCode 마켓플레이스](https://marketplace.visualstudio.com/items?itemName=DorianMassoulier.repomix-runner)에서 설치하세요.

## 브라우저 확장 프로그램

GitHub 저장소에서 직접 Repomix에 액세스하세요! Chrome 확장 프로그램이 GitHub 저장소 페이지에 편리한 "Repomix" 버튼을 추가합니다.

![Repomix Browser Extension](/images/docs/browser-extension.png)

### 설치
- Chrome 확장 프로그램: [Repomix - Chrome Web Store](https://chromewebstore.google.com/detail/repomix/fimfamikepjgchehkohedilpdigcpkoa)
- Firefox 애드온: [Repomix - Firefox Add-ons](https://addons.mozilla.org/firefox/addon/repomix/)

### 기능
- GitHub 저장소에서 원클릭으로 Repomix 액세스
- 더 많은 흥미로운 기능이 곧 출시됩니다!

## 시스템 요구 사항

- Node.js: 20.0.0 이상
- Git: 원격 저장소 처리 시 필요

## 설치 확인

설치가 완료된 후, 다음 명령어로 Repomix가 정상적으로 작동하는지 확인하세요:

```bash
repomix --version
repomix --help
```
