# 보안

## 보안 검사 기능

Repomix는 [Secretlint](https://github.com/secretlint/secretlint)를 사용하여 파일 내의 민감한 정보를 감지합니다:
- API 키
- 액세스 토큰
- 인증 정보
- 개인 키
- 환경 변수

## 설정

보안 검사는 기본적으로 활성화되어 있습니다.

명령행에서 비활성화:
```bash
repomix --no-security-check
```

또는 `repomix.config.json`에서 설정:
```json
{
  "security": {
    "enableSecurityCheck": false
  }
}
```

## 보안 조치

1. **바이너리 파일 처리**: 바이너리 파일 내용은 출력에서 제외되지만 전체 저장소 개요를 위해 해당 경로는 디렉토리 구조에 나열됩니다
2. **Git 인식**: `.gitignore` 패턴을 준수
3. **자동 감지**: 다음과 같은 일반적인 보안 문제를 스캔:
    - AWS 자격 증명
    - 데이터베이스 연결 문자열
    - 인증 토큰
    - 개인 키

## 보안 검사에서 문제가 발견된 경우

출력 예시:
```bash
🔍 Security Check:
──────────────────
2 suspicious file(s) detected and excluded:
1. config/credentials.json
  - Found AWS access key
2. .env.local
  - Found database password
```

## 모범 사례

1. 공유하기 전에 반드시 출력 내용 검토
2. `.repomixignore`를 사용하여 민감한 경로 제외
3. 보안 검사 기능 활성화 유지
4. 저장소에서 민감한 파일 제거

## 보안 문제 보고

보안 취약점을 발견하셨다면:
1. 공개 이슈를 생성하지 마세요
2. 이메일: koukun0120@gmail.com
3. 또는 [GitHub 보안 권고](https://github.com/yamadashy/repomix/security/advisories/new) 사용

## 관련 리소스

- [설정](/ko/guide/configuration) - `security.enableSecurityCheck`로 보안 검사 설정
- [명령행 옵션](/ko/guide/command-line-options) - `--no-security-check` 플래그 사용
- [개인정보 보호정책](/ko/guide/privacy) - Repomix의 데이터 처리 방식 알아보기
