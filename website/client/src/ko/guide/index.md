# Repomix 시작하기

<script setup>
import HomeBadges from '../../../components/HomeBadges.vue'
import YouTubeVideo from '../../../components/YouTubeVideo.vue'
import { VIDEO_IDS } from '../../../utils/videos'
</script>

Repomix는 전체 저장소를 AI 친화적인 단일 파일로 패키징하는 도구입니다. ChatGPT, Claude, Gemini, Grok, DeepSeek, Perplexity, Gemma, Llama 등의 대규모 언어 모델(LLM)에 코드베이스를 제공하는 데 도움이 되도록 설계되었습니다.

<YouTubeVideo :videoId="VIDEO_IDS.REPOMIX_DEMO" />

<HomeBadges />

<br>
<!--@include: ../../shared/sponsors-section.md-->

## 빠른 시작

프로젝트 디렉토리에서 다음 명령을 실행하세요.

```bash
npx repomix@latest
```

이게 전부입니다! AI 친화적인 형식으로 전체 저장소를 포함하는 `repomix-output.xml` 파일이 생성됩니다.

그런 다음 이 파일을 다음과 같은 프롬프트와 함께 AI 어시스턴트에 보낼 수 있습니다.

```
이 파일에는 저장소의 모든 파일이 하나로 결합되어 있습니다.
코드를 리팩터링하고 싶으니 먼저 검토해 주세요.
```

AI는 전체 코드베이스를 분석하고 포괄적인 인사이트를 제공합니다.

![Repomix 파일 사용 예시 1](/images/docs/repomix-file-usage-1.png)

특정 변경 사항을 논의할 때 AI가 코드 생성을 도울 수 있습니다. Claude의 Artifacts와 같은 기능을 사용하면 상호 의존적인 여러 파일을 받을 수도 있습니다.

![Repomix 파일 사용 예시 2](/images/docs/repomix-file-usage-2.png)

즐거운 코딩 되세요! 🚀

## 왜 Repomix인가요?

Repomix는 ChatGPT, Claude, Gemini, Grok 등 원하는 구독 서비스와 자유롭게 사용할 수 있으며, Repomix 자체에는 추가 비용이 없습니다. 코드베이스 전체를 컨텍스트로 제공하기 때문에 파일을 일일이 탐색할 필요 없이, 더 빠르고 정확한 분석이 가능합니다.

코드베이스 전체를 컨텍스트로 활용하면 구현 계획 수립, 버그 조사, 서드파티 라이브러리 보안 점검, 문서 생성 등 다양한 작업에 Repomix를 활용할 수 있습니다.

## 핵심 기능

- **AI 최적화 출력**: AI가 처리하기 쉬운 형식으로 코드베이스를 정리합니다
- **토큰 카운팅**: LLM 컨텍스트 제한에 맞춰 토큰 사용량을 추적합니다
- **Git 연동**: `.gitignore`와 `.git/info/exclude` 파일을 자동으로 반영합니다
- **보안 중심**: 민감한 정보를 자동으로 감지합니다
- **다양한 출력 형식**: 일반 텍스트, XML, Markdown 중에서 선택할 수 있습니다

## 다음 단계

- [설치 가이드](installation.md): Repomix를 설치하는 다양한 방법
- [사용 가이드](usage.md): 기본 및 고급 기능에 대해 알아보기
- [구성](configuration.md): 필요에 맞게 Repomix를 사용자 정의하기
- [보안 기능](security.md): 보안 검사에 대해 알아보기
- [출력 형식](output.md): AI 모델에 가장 적합한 출력 형식 선택
- [MCP 서버](mcp-server.md): AI 어시스턴트와 Repomix를 직접 통합

## 커뮤니티

[Discord 커뮤니티](https://discord.gg/wNYzTwZFku)에 참여하세요:
- Repomix에 대한 도움 받기
- 경험 공유
- 새로운 기능 제안
- 다른 사용자와 소통

## 지원

버그를 발견했거나 도움이 필요하신가요?
- [GitHub에 이슈 열기](https://github.com/yamadashy/repomix/issues)
- Discord 서버에 참여하기
- [문서 확인하기](https://repomix.com)
