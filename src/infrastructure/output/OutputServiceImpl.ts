/**
 * Implementation of output generation service
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { XMLBuilder } from 'fast-xml-parser';
import Handlebars from 'handlebars';
import type { RepomixConfigMerged } from '../../shared/config/configSchema.js';
import { OutputGeneratorContext } from '../../shared/config/ConfigTypes.js';
import { RepomixError } from '../../shared/errorHandle.js';
import { generateTreeString } from '../filesystem/fileTreeGenerate.js';
import type { ProcessedFile } from '../filesystem/fileTypes.js';
import type { GitDiffResult } from '../git/gitDiffHandle.js';
import type { OutputService } from './OutputService.js';

export class OutputServiceImpl implements OutputService {
  constructor(private readonly config: RepomixConfigMerged) {}

  /**
   * Generate output for a repository
   */
  async generateOutput(
    rootDirs: string[],
    processedFiles: ProcessedFile[],
    allFilePaths: string[],
    emptyDirPaths: string[],
    gitDiffResult?: GitDiffResult,
  ): Promise<string> {
    const outputGeneratorContext = await this.buildOutputGeneratorContext(
      rootDirs,
      allFilePaths,
      emptyDirPaths,
      processedFiles,
      gitDiffResult,
    );

    const renderContext = this.createRenderContext(outputGeneratorContext);

    if (!this.config.output.parsableStyle) {
      return this.generateHandlebarOutput(renderContext);
    }

    switch (this.config.output.style) {
      case 'xml':
        return this.generateParsableXmlOutput(renderContext);
      default:
        return this.generateHandlebarOutput(renderContext);
    }
  }

  /**
   * Write output to file
   */
  async writeOutput(output: string): Promise<void> {
    if (this.config.output.stdout) {
      process.stdout.write(output);
      return;
    }

    const outputPath = path.resolve(this.config.cwd, this.config.output.filePath);

    try {
      await fs.writeFile(outputPath, output, 'utf-8');
    } catch (error) {
      throw new RepomixError(
        `Failed to write output to ${outputPath}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  private buildOutputGeneratorContext(
    rootDirs: string[],
    allFilePaths: string[],
    emptyDirPaths: string[],
    processedFiles: ProcessedFile[],
    gitDiffResult?: GitDiffResult,
  ) {
    return {
      generationDate: new Date().toISOString(),
      treeString: generateTreeString(allFilePaths, emptyDirPaths),
      processedFiles,
      config: this.config,
      instruction: '',
      gitDiffResult,
    };
  }

  private createRenderContext(outputGeneratorContext: OutputGeneratorContext) {
    return {};
  }

  private generateHandlebarOutput(renderContext: Record<string, unknown>): string {
    return '';
  }

  private generateParsableXmlOutput(renderContext: Record<string, unknown>): string {
    return '';
  }
}
