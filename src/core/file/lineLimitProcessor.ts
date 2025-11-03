import { Parser, type Tree } from 'web-tree-sitter';
import { ext2Lang } from '../treeSitter/ext2Lang.js';
import type { SupportedLang } from '../treeSitter/lang2Query.js';
import { loadLanguage } from '../treeSitter/loadLanguage.js';
import { LineLimitStrategyRegistry } from './lineLimitStrategies/LineLimitStrategyRegistry.js';
import type {
  LanguageStrategy,
  LineAllocation,
  LineLimitConfig,
  LineLimitResult,
  SourceLine,
  TruncationIndicator,
} from './lineLimitTypes.js';
import { LineLimitError, LineLimitParseError, LineSection } from './lineLimitTypes.js';

/**
 * Core line limiting processor
 */
export class LineLimitProcessor {
  private languageParser: Parser | null = null;
  private strategy: LanguageStrategy | null = null;
  private cache = new Map<string, { tree: Tree; timestamp: number }>();
  private readonly maxAge = 5 * 60 * 1000; // 5 minutes

  /**
   * Initialize the processor for a specific file
   */
  async initialize(filePath: string): Promise<void> {
    const language = this.detectLanguage(filePath);
    if (!language) {
      throw new LineLimitError(`Unsupported language for file: ${filePath}`, filePath, 0);
    }

    try {
      const lang = await loadLanguage(language);
      this.languageParser = new Parser();
      this.languageParser.setLanguage(lang);
      const strategy = LineLimitStrategyRegistry.getStrategy(language);
      if (!strategy) {
        throw new LineLimitError(`No strategy available for language: ${language}`, filePath, 0);
      }
      this.strategy = strategy;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new LineLimitParseError(filePath, 0, new Error(message));
    }
  }

  /**
   * Apply line limiting to file content
   */
  async applyLineLimit(content: string, filePath: string, config: LineLimitConfig): Promise<LineLimitResult> {
    const startTime = Date.now();

    try {
      // Initialize if not already done
      if (!this.languageParser || !this.strategy) {
        await this.initialize(filePath);
      }

      const lines = content.split('\n');
      const originalLineCount = lines.length;

      // Check if line limit is needed
      if (originalLineCount <= config.lineLimit) {
        return this.createNoLimitResult(content, originalLineCount, startTime);
      }

      // Parse the file
      const tree = await this.parseContent(content, filePath);

      // Calculate line allocation
      const allocation = this.calculateLineAllocation(config.lineLimit);

      // Extract sections
      const headerLines = this.extractHeaderLines(lines, tree, allocation.headerLines);
      const coreLines = this.extractCoreLines(lines, tree, allocation.coreLines);
      const footerLines = this.extractFooterLines(lines, tree, allocation.footerLines);

      // Combine and sort selected lines
      const selectedLines = [...headerLines, ...coreLines, ...footerLines]
        .sort((a, b) => a.lineNumber - b.lineNumber)
        .slice(0, config.lineLimit);

      // Create truncation indicators
      const truncationIndicators = this.createTruncationIndicators(
        selectedLines,
        originalLineCount,
        config.showTruncationIndicators,
      );

      // Build result
      const result: LineLimitResult = {
        originalLineCount,
        limitedLineCount: selectedLines.length,
        selectedLines,
        truncatedFunctions: this.getTruncatedFunctions(),
        truncationIndicators,
        metadata: {
          processingTimeMs: Date.now() - startTime,
          algorithm: '30-60-10-distribution',
          language: this.detectLanguage(filePath) || 'unknown',
          allocation,
          functionsAnalyzed: this.getFunctionsAnalyzed(),
          functionsSelected: this.getFunctionsSelected(),
        },
      };

      return result;
    } catch (error) {
      if (error instanceof LineLimitError) {
        throw error;
      }

      const message = error instanceof Error ? error.message : String(error);
      throw new LineLimitParseError(filePath, config.lineLimit, new Error(message));
    }
  }

  /**
   * Detect language from file extension
   */
  private detectLanguage(filePath: string): SupportedLang | undefined {
    const ext = filePath.split('.').pop()?.toLowerCase();
    if (!ext) {
      return undefined;
    }

    // Handle both .js and javascript extensions
    if (ext === 'js' || ext === 'javascript') {
      return 'javascript' as SupportedLang;
    }

    return ext2Lang[ext as keyof typeof ext2Lang] as SupportedLang;
  }

  /**
   * Parse content with caching
   */
  private async parseContent(content: string, filePath: string): Promise<Tree> {
    const cacheKey = `${filePath}:${this.hashContent(content)}`;

    // Check cache
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (!cached) {
        throw new Error('Cache entry not found');
      }
      if (Date.now() - cached.timestamp < this.maxAge) {
        return cached.tree;
      }
    }

    // Parse content
    if (!this.languageParser) {
      throw new Error('Language parser not initialized');
    }

    const tree = this.languageParser.parse(content);

    if (!tree) {
      throw new Error('Failed to parse content');
    }

    // Cache result
    this.cache.set(cacheKey, { tree, timestamp: Date.now() });

    // Cleanup old entries
    this.cleanupCache();

    return tree;
  }

  /**
   * Hash content for caching
   */
  private hashContent(content: string): string {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }

  /**
   * Cleanup old cache entries
   */
  private cleanupCache(): void {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.maxAge) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Calculate line allocation based on 30/60/10 distribution
   */
  private calculateLineAllocation(totalLimit: number): LineAllocation {
    const headerLines = Math.floor(totalLimit * 0.3);
    const coreLines = Math.floor(totalLimit * 0.6);
    const footerLines = Math.floor(totalLimit * 0.1);

    return {
      headerLines,
      coreLines,
      footerLines,
    };
  }

  /**
   * Extract header lines
   */
  private extractHeaderLines(lines: string[], tree: Tree, maxLines: number): SourceLine[] {
    if (!this.strategy) {
      return [];
    }

    const headerLineNumbers = this.strategy.identifyHeaderLines(lines, tree);
    const selectedLines: SourceLine[] = [];

    for (const lineNumber of headerLineNumbers) {
      if (selectedLines.length >= maxLines) {
        break;
      }

      if (lineNumber < lines.length) {
        selectedLines.push({
          lineNumber,
          content: lines[lineNumber],
          section: LineSection.HEADER,
          importance: 0.9, // High importance for header
          nodeType: 'header',
        });
      }
    }

    return selectedLines;
  }

  /**
   * Extract core logic lines
   */
  private extractCoreLines(lines: string[], tree: Tree, maxLines: number): SourceLine[] {
    if (!this.strategy) {
      return [];
    }

    const functions = this.strategy.analyzeFunctions(lines, tree);
    this.setFunctionsAnalyzed(functions.length);

    // Sort functions by complexity
    functions.sort((a, b) => b.complexity - a.complexity);

    const selectedLines: SourceLine[] = [];
    const selectedFunctionCount = Math.min(functions.length, Math.ceil(maxLines / 10)); // Assume ~10 lines per function

    for (let i = 0; i < selectedFunctionCount && selectedLines.length < maxLines; i++) {
      const func = functions[i];
      func.isSelected = true;

      // Select lines from this function
      const availableLines = Math.min(func.lineCount, maxLines - selectedLines.length);
      for (let j = 0; j < availableLines; j++) {
        const lineNumber = func.startLine + j;
        if (lineNumber < lines.length) {
          selectedLines.push({
            lineNumber,
            content: lines[lineNumber],
            section: LineSection.CORE,
            importance: func.complexity,
            nodeType: 'function',
          });
        }
      }
    }

    this.setFunctionsSelected(selectedFunctionCount);
    return selectedLines;
  }

  /**
   * Extract footer lines
   */
  private extractFooterLines(lines: string[], tree: Tree, maxLines: number): SourceLine[] {
    if (!this.strategy) {
      return [];
    }

    const footerLineNumbers = this.strategy.identifyFooterLines(lines, tree);
    const selectedLines: SourceLine[] = [];

    for (const lineNumber of footerLineNumbers) {
      if (selectedLines.length >= maxLines) {
        break;
      }

      if (lineNumber < lines.length) {
        selectedLines.push({
          lineNumber,
          content: lines[lineNumber],
          section: LineSection.FOOTER,
          importance: 0.7, // Medium importance for footer
          nodeType: 'footer',
        });
      }
    }

    return selectedLines;
  }

  /**
   * Create truncation indicators
   */
  private createTruncationIndicators(
    selectedLines: SourceLine[],
    originalLineCount: number,
    showIndicators: boolean,
  ): TruncationIndicator[] {
    if (!showIndicators) {
      return [];
    }

    const indicators: TruncationIndicator[] = [];

    // Add indicator at the end if content was truncated
    if (selectedLines.length < originalLineCount) {
      const lastSelectedLine = selectedLines[selectedLines.length - 1];
      indicators.push({
        position: lastSelectedLine ? lastSelectedLine.lineNumber + 1 : 1,
        type: 'block',
        description: `... ${originalLineCount - selectedLines.length} lines truncated`,
      });
    }

    return indicators;
  }

  /**
   * Create result when no limiting is needed
   */
  private createNoLimitResult(content: string, originalLineCount: number, startTime: number): LineLimitResult {
    const lines = content.split('\n');
    const selectedLines: SourceLine[] = lines.map((line, index) => ({
      lineNumber: index,
      content: line,
      section: LineSection.CORE,
      importance: 1.0,
      nodeType: 'content',
    }));

    return {
      originalLineCount,
      limitedLineCount: originalLineCount,
      selectedLines,
      truncatedFunctions: [],
      truncationIndicators: [],
      metadata: {
        processingTimeMs: Date.now() - startTime,
        algorithm: 'no-limit',
        language: 'unknown',
        allocation: {
          headerLines: 0,
          coreLines: originalLineCount,
          footerLines: 0,
        },
        functionsAnalyzed: 0,
        functionsSelected: 0,
      },
    };
  }

  // Private fields for tracking metrics
  private functionsAnalyzed = 0;
  private functionsSelected = 0;

  private setFunctionsAnalyzed(count: number): void {
    this.functionsAnalyzed = count;
  }

  private setFunctionsSelected(count: number): void {
    this.functionsSelected = count;
  }

  private getFunctionsAnalyzed(): number {
    return this.functionsAnalyzed;
  }

  private getFunctionsSelected(): number {
    return this.functionsSelected;
  }

  private getTruncatedFunctions(): string[] {
    // This would be implemented based on which functions were not selected
    return [];
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    if (this.languageParser) {
      this.languageParser.delete();
      this.languageParser = null;
    }
    this.strategy = null;
    this.cache.clear();
  }
}

/**
 * Apply line limiting to file content
 */
export const applyLineLimit = async (
  content: string,
  filePath: string,
  lineLimit: number,
  config: Partial<LineLimitConfig> = {},
): Promise<{
  content: string;
  truncation?: { truncated: boolean; originalLineCount: number; truncatedLineCount: number; lineLimit: number };
}> => {
  const finalConfig: LineLimitConfig = {
    lineLimit,
    preserveStructure: true,
    showTruncationIndicators: true,
    enableCaching: true,
    ...config,
  };

  const processor = new LineLimitProcessor();

  try {
    const result = await processor.applyLineLimit(content, filePath, finalConfig);

    // Rebuild content with selected lines
    const limitedContent = result.selectedLines.map((line) => line.content).join('\n');

    // Add truncation indicators if enabled
    if (finalConfig.showTruncationIndicators && result.truncationIndicators.length > 0) {
      const lines = limitedContent.split('\n');
      for (const indicator of result.truncationIndicators) {
        if (indicator.position <= lines.length) {
          lines.splice(indicator.position - 1, 0, `// ${indicator.description}`);
        }
      }
      return {
        content: lines.join('\n'),
        truncation: {
          truncated: result.originalLineCount > lineLimit,
          originalLineCount: result.originalLineCount,
          truncatedLineCount: result.limitedLineCount,
          lineLimit,
        },
      };
    }

    return {
      content: limitedContent,
      truncation: {
        truncated: result.originalLineCount > lineLimit,
        originalLineCount: result.originalLineCount,
        truncatedLineCount: result.limitedLineCount,
        lineLimit,
      },
    };
  } finally {
    processor.dispose();
  }
};
