import path from 'node:path';
import pc from 'picocolors';
import type { RepomixConfigMerged } from '../config/configSchema.js';
import type { SkippedFileInfo } from '../core/file/fileCollect.js';
import type { PackResult } from '../core/packager.js';
import type { SuspiciousFileResult } from '../core/security/securityCheck.js';
import { logger } from '../shared/logger.js';
import { reportTokenCountTree } from './reporters/tokenCountTreeReporter.js';

/**
 * Convert an absolute path to a relative path if it's under cwd, otherwise return as-is.
 */
export const getDisplayPath = (absolutePath: string, cwd: string): string => {
  return absolutePath.startsWith(cwd) ? path.relative(cwd, absolutePath) : absolutePath;
};

export interface ReportOptions {
  skillDir?: string;
}

/**
 * Resolves the absolute output path for the completion banner.
 * Priority: skill directory > first output file > config file path.
 */
export const resolveOutputPath = (
  cwd: string,
  packResult: PackResult,
  config: RepomixConfigMerged,
  options: ReportOptions,
): string => {
  if (config.skillGenerate !== undefined && options.skillDir) {
    return path.resolve(cwd, options.skillDir);
  }
  if (packResult.outputFiles && packResult.outputFiles.length > 0) {
    return path.resolve(cwd, packResult.outputFiles[0]);
  }
  return path.resolve(cwd, config.output.filePath);
};

/**
 * Reports the results of packing operation including top files, security check, summary, and completion.
 */
export const reportResults = (
  cwd: string,
  packResult: PackResult,
  config: RepomixConfigMerged,
  options: ReportOptions = {},
): void => {
  logger.log('');

  if (config.output.topFilesLength > 0) {
    reportTopFiles(
      packResult.fileCharCounts,
      packResult.fileTokenCounts,
      config.output.topFilesLength,
      packResult.totalTokens,
    );
    logger.log('');
  }

  if (config.output.tokenCountTree) {
    reportTokenCountTree(packResult.processedFiles, packResult.fileTokenCounts, config);
    logger.log('');
  }

  reportSecurityCheck(
    cwd,
    packResult.suspiciousFilesResults,
    packResult.suspiciousGitDiffResults,
    packResult.suspiciousGitLogResults,
    config,
  );
  logger.log('');

  reportSkippedFiles(cwd, packResult.skippedFiles);
  logger.log('');

  reportSummary(cwd, packResult, config, options);
  logger.log('');

  reportCompletion(resolveOutputPath(cwd, packResult, config, options));
};

export const reportSummary = (
  cwd: string,
  packResult: PackResult,
  config: RepomixConfigMerged,
  options: ReportOptions = {},
) => {
  let securityCheckMessage = '';
  if (config.security.enableSecurityCheck) {
    if (packResult.suspiciousFilesResults.length > 0) {
      securityCheckMessage = pc.yellow(
        `${packResult.suspiciousFilesResults.length.toLocaleString()} suspicious file(s) detected and excluded`,
      );
    } else {
      securityCheckMessage = '✔ No suspicious files detected';
    }
  } else {
    securityCheckMessage = pc.dim('Security check disabled');
  }

  logger.log('📊 Pack Summary:');
  logger.log(pc.dim('────────────────'));
  logger.log(`  Total Files: ${packResult.totalFiles.toLocaleString()} files`);
  logger.log(` Total Tokens: ${packResult.totalTokens.toLocaleString()} tokens`);
  logger.log(`  Total Chars: ${packResult.totalCharacters.toLocaleString()} chars`);

  // Show skill output path or regular output path
  if (config.skillGenerate !== undefined && options.skillDir) {
    const skillDirPath = path.resolve(cwd, options.skillDir);
    logger.log(`       Output: ${skillDirPath} ${pc.dim('(skill directory)')}`);
  } else {
    if (packResult.outputFiles && packResult.outputFiles.length > 0) {
      const first = packResult.outputFiles[0];
      const last = packResult.outputFiles[packResult.outputFiles.length - 1];
      const firstAbsPath = path.resolve(cwd, first);
      const lastAbsPath = path.resolve(cwd, last);

      logger.log(
        packResult.outputFiles.length === 1
          ? `       Output: ${firstAbsPath}`
          : `       Output: ${firstAbsPath} ${pc.dim('…')} ${lastAbsPath} ${pc.dim(`(${packResult.outputFiles.length} parts)`)}`,
      );
    } else {
      const outputPath = path.resolve(cwd, config.output.filePath);
      logger.log(`       Output: ${outputPath}`);
    }
  }
  logger.log(`     Security: ${securityCheckMessage}`);

  if (config.output.git?.includeDiffs) {
    let gitDiffsMessage = '';
    if (packResult.gitDiffTokenCount) {
      gitDiffsMessage = `✔ Git diffs included ${pc.dim(`(${packResult.gitDiffTokenCount.toLocaleString()} tokens)`)}`;
    } else {
      gitDiffsMessage = pc.dim('✖ No git diffs included');
    }
    logger.log(`    Git Diffs: ${gitDiffsMessage}`);
  }

  if (config.output.git?.includeLogs) {
    let gitLogsMessage = '';
    if (packResult.gitLogTokenCount) {
      gitLogsMessage = `✔ Git logs included ${pc.dim(`(${packResult.gitLogTokenCount.toLocaleString()} tokens)`)}`;
    } else {
      gitLogsMessage = pc.dim('✖ No git logs included');
    }
    logger.log(`     Git Logs: ${gitLogsMessage}`);
  }
};

export const reportSecurityCheck = (
  rootDir: string,
  suspiciousFilesResults: SuspiciousFileResult[],
  suspiciousGitDiffResults: SuspiciousFileResult[],
  suspiciousGitLogResults: SuspiciousFileResult[],
  config: RepomixConfigMerged,
) => {
  if (!config.security.enableSecurityCheck) {
    return;
  }

  logger.log('🔎 Security Check:');
  logger.log(pc.dim('──────────────────'));

  // Report results for files
  if (suspiciousFilesResults.length === 0) {
    logger.log(`${pc.green('✔')} No suspicious files detected.`);
  } else {
    logger.log(pc.yellow(`${suspiciousFilesResults.length} suspicious file(s) detected and excluded from the output:`));
    suspiciousFilesResults.forEach((suspiciousFilesResult, index) => {
      const relativeFilePath = path.relative(rootDir, suspiciousFilesResult.filePath);
      const indexString = `${index + 1}.`.padEnd(3, ' ');
      logger.log(`${indexString}${relativeFilePath}`);
      const issueCount = suspiciousFilesResult.messages.length;
      const issueText = issueCount === 1 ? 'security issue' : 'security issues';
      logger.log(pc.dim(`   - ${issueCount} ${issueText} detected`));
    });
    logger.log(pc.yellow('\nThese files have been excluded from the output for security reasons.'));
    logger.log(pc.yellow('Please review these files for potential sensitive information.'));
  }

  // Report git-related security issues
  reportSuspiciousGitContent('Git diffs', suspiciousGitDiffResults);
  reportSuspiciousGitContent('Git logs', suspiciousGitLogResults);
};

const reportSuspiciousGitContent = (title: string, results: SuspiciousFileResult[]) => {
  if (results.length === 0) {
    return;
  }

  logger.log('');
  logger.log(pc.yellow(`${results.length} security issue(s) found in ${title}:`));
  results.forEach((suspiciousResult, index) => {
    const indexString = `${index + 1}.`.padEnd(3, ' ');
    logger.log(`${indexString}${suspiciousResult.filePath}`);
    const issueCount = suspiciousResult.messages.length;
    const issueText = issueCount === 1 ? 'security issue' : 'security issues';
    logger.log(pc.dim(`   - ${issueCount} ${issueText} detected`));
  });
  logger.log(pc.yellow(`\nNote: ${title} with security issues are still included in the output.`));
  logger.log(pc.yellow(`Please review the ${title.toLowerCase()} before sharing the output.`));
};

export const reportTopFiles = (
  fileCharCounts: Record<string, number>,
  fileTokenCounts: Record<string, number>,
  topFilesLength: number,
  totalTokens: number,
) => {
  const topFilesLengthStrLen = topFilesLength.toString().length;
  logger.log(`📈 Top ${topFilesLength} Files by Token Count:`);
  logger.log(pc.dim(`─────────────────────────────${'─'.repeat(topFilesLengthStrLen)}`));

  // Filter files that have token counts (top candidates by char count)
  const filesWithTokenCounts = Object.entries(fileTokenCounts)
    .filter(([, tokenCount]) => tokenCount > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topFilesLength);

  // Use the actual total tokens from the entire output

  filesWithTokenCounts.forEach(([filePath, tokenCount], index) => {
    const charCount = fileCharCounts[filePath];
    const percentageOfTotal = totalTokens > 0 ? Number(((tokenCount / totalTokens) * 100).toFixed(1)) : 0;
    const indexString = `${index + 1}.`.padEnd(3, ' ');
    logger.log(
      `${indexString} ${filePath} ${pc.dim(`(${tokenCount.toLocaleString()} tokens, ${charCount.toLocaleString()} chars, ${percentageOfTotal}%)`)}`,
    );
  });
};

export const reportSkippedFiles = (_rootDir: string, skippedFiles: SkippedFileInfo[]) => {
  const binaryContentFiles = skippedFiles.filter((file) => file.reason === 'binary-content');

  if (binaryContentFiles.length === 0) {
    return;
  }

  logger.log('📄 Binary Files Detected:');
  logger.log(pc.dim('─────────────────────────'));

  if (binaryContentFiles.length === 1) {
    logger.log(pc.yellow('1 file detected as binary by content inspection:'));
  } else {
    logger.log(pc.yellow(`${binaryContentFiles.length} files detected as binary by content inspection:`));
  }

  binaryContentFiles.forEach((file, index) => {
    const indexString = `${index + 1}.`.padEnd(3, ' ');
    logger.log(`${indexString}${file.path}`);
  });

  logger.log(pc.yellow('\nThese files have been excluded from the output.'));
  logger.log(pc.yellow('Please review these files if you expected them to contain text content.'));
};

const getOutputSummary = (outputPaths: string | string[]) => {
  const normalizedOutputPaths = Array.isArray(outputPaths) ? outputPaths : [outputPaths];

  if (normalizedOutputPaths.length === 1) {
    return {
      heading: '📁 Output file generated at:',
      lines: [normalizedOutputPaths[0]],
    };
  }

  const outputDirectories = [...new Set(normalizedOutputPaths.map((outputPath) => path.dirname(outputPath)))];

  if (outputDirectories.length === 1) {
    return {
      heading: `📁 ${normalizedOutputPaths.length} output files generated in:`,
      lines: [outputDirectories[0]],
    };
  }

  return {
    heading: `📁 ${normalizedOutputPaths.length} output files generated:`,
    lines: normalizedOutputPaths,
  };
};

export const reportCompletion = (outputPaths: string | string[]) => {
  logger.log(pc.green('🎉 All Done!'));
  logger.log('Your repository has been successfully packed.');

  const outputSummary = getOutputSummary(outputPaths);

  logger.log('');
  logger.log(outputSummary.heading);
  outputSummary.lines.forEach((outputPath) => {
    logger.log(`   ${pc.bold(pc.cyan(pc.underline(outputPath)))}`);
  });

  logger.log('');
  logger.log(`💡 Repomix is now available in your browser! Try it at ${pc.underline('https://repomix.com')}`);
};
