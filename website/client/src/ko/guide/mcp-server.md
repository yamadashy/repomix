# MCP 서버

Repomix는 AI 어시스턴트가 코드베이스와 직접 상호작용할 수 있게 해주는 [Model Context Protocol (MCP)](https://modelcontextprotocol.io)를 지원합니다. MCP 서버로 실행하면 Repomix는 AI 어시스턴트가 수동 파일 준비 없이 로컬 또는 원격 저장소를 분석용으로 패키징할 수 있는 도구를 제공합니다.

## Repomix를 MCP 서버로 실행하기

Repomix를 MCP 서버로 실행하려면 `--mcp` 플래그를 사용하세요:

```bash
repomix --mcp
```

이렇게 하면 Repomix가 MCP 서버 모드로 시작되어 Model Context Protocol을 지원하는 AI 어시스턴트에서 사용할 수 있게 됩니다.

## 사용 가능한 MCP 도구

MCP 서버로 실행할 때 Repomix는 다음 도구를 제공합니다:

### pack_codebase

이 도구는 로컬 코드 디렉토리를 AI 분석용 통합 파일로 패키징합니다.

**매개변수:**
- `directory`: (필수) 패키징할 디렉토리의 절대 경로
- `compress`: (선택, 기본값: true) 토큰 수를 줄이기 위해 지능형 코드 추출을 수행할지 여부
- `includePatterns`: (선택) 쉼표로 구분된 포함 패턴 목록
- `ignorePatterns`: (선택) 쉼표로 구분된 제외 패턴 목록

**예시:**
```json
{
  "directory": "/path/to/your/project",
  "compress": true,
  "includePatterns": "src/**/*.ts,**/*.md",
  "ignorePatterns": "**/*.log,tmp/"
}
```

### pack_remote_repository

이 도구는 GitHub 저장소를 가져와 클론하고 AI 분석용 통합 파일로 패키징합니다.

**매개변수:**
- `remote`: (필수) GitHub 저장소 URL 또는 사용자/저장소 형식(예: yamadashy/repomix)
- `compress`: (선택, 기본값: true) 토큰 수를 줄이기 위해 지능형 코드 추출을 수행할지 여부
- `includePatterns`: (선택) 쉼표로 구분된 포함 패턴 목록
- `ignorePatterns`: (선택) 쉼표로 구분된 제외 패턴 목록

**예시:**
```json
{
  "remote": "yamadashy/repomix",
  "compress": true,
  "includePatterns": "src/**/*.ts,**/*.md",
  "ignorePatterns": "**/*.log,tmp/"
}
```

## MCP 서버 구성하기

Claude와 같은 AI 어시스턴트와 함께 Repomix를 MCP 서버로 사용하려면 MCP 설정을 구성해야 합니다:

### Cline(VS Code 확장)의 경우

`cline_mcp_settings.json` 파일을 편집하세요:

```json
{
  "mcpServers": {
    "repomix": {
      "command": "npx",
      "args": [
        "-y",
        "repomix",
        "--mcp"
      ]
    }
  }
}
```

### Claude Desktop의 경우

Cline의 구성과 유사하게 `claude_desktop_config.json` 파일을 편집하세요.

## Repomix를 MCP 서버로 사용하는 이점

Repomix를 MCP 서버로 사용하면 여러 이점이 있습니다:

1. **직접 통합**: AI 어시스턴트가 수동 파일 준비 없이 코드베이스를 직접 분석할 수 있습니다.
2. **효율적인 워크플로우**: 파일을 수동으로 생성하고 업로드할 필요가 없어 코드 분석 프로세스가 간소화됩니다.
3. **일관된 출력**: AI 어시스턴트가 일관되고 최적화된 형식으로 코드베이스를 받을 수 있습니다.
4. **고급 기능**: 코드 압축, 토큰 카운팅, 보안 검사와 같은 Repomix의 모든 기능을 활용할 수 있습니다.

구성이 완료되면 AI 어시스턴트가 Repomix의 기능을 직접 사용하여 코드베이스를 분석할 수 있어 코드 분석 워크플로우가 더 효율적이 됩니다.
