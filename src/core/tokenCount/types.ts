export interface FileTokenInfo {
  name: string;
  tokens: number;
}

export interface DirectoryTokenInfo {
  name: string;
  files: FileTokenInfo[];
  directories?: DirectoryTokenInfo[];
}

export type TokenCountOutput = DirectoryTokenInfo[];
