import type { RepomixConfigMerged } from '../../config/configSchema.js';
import type { ProcessedFile } from '../file/fileTypes.js';
import type { GitDiffResult } from '../git/gitDiffHandle.js';
import type { GitLogCommit, GitLogResult } from '../git/gitLogHandle.js';

export interface OutputGeneratorContext {
  generationDate: string;
  treeString: string;
  processedFiles: ProcessedFile[];
  config: RepomixConfigMerged;
  instruction: string;
  gitDiffResult: GitDiffResult | undefined;
  gitLogResult: GitLogResult | undefined;
}

export interface RenderContext {
  readonly generationHeader: string;
  readonly summaryPurpose: string;
  readonly summaryFileFormat: string;
  readonly summaryUsageGuidelines: string;
  readonly summaryNotes: string;
  readonly headerText: string | undefined;
  readonly instruction: string;
  readonly treeString: string;
  readonly processedFiles: ReadonlyArray<ProcessedFile>;
  readonly fileLineCounts: Record<string, number>;
  readonly fileSummaryEnabled: boolean;
  readonly directoryStructureEnabled: boolean;
  readonly filesEnabled: boolean;
  readonly escapeFileContent: boolean;
  readonly markdownCodeBlockDelimiter: string;
  readonly gitDiffEnabled: boolean;
  readonly gitDiffWorkTree: string | undefined;
  readonly gitDiffStaged: string | undefined;
  readonly gitLogEnabled: boolean;
  readonly gitLogContent: string | undefined;
  readonly gitLogCommits: GitLogCommit[] | undefined;
}
