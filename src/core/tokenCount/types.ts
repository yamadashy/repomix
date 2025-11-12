export interface FileTokenInfo {
  name: string;
  tokens: number;
  originalTokens?: number;
  truncated?: boolean;
}

export interface DirectoryTokenInfo {
  name: string;
  files: FileTokenInfo[];
  directories?: DirectoryTokenInfo[];
}

export type TokenCountOutput = DirectoryTokenInfo[];
