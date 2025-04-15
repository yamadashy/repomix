import path from "node:path";
import pc from "picocolors";
import type { RepomixConfigMerged } from "../config/configSchema.js";
import type { SuspiciousFileResult } from "../core/security/securityCheck.js";
import { logger } from "../shared/logger.js";

export const printSummary = (
  totalFiles: number,
  totalTokens: number,
  totalLines: number,
  outputPath: string,
  suspiciousFilesResults: SuspiciousFileResult[],
  config: RepomixConfigMerged
) => {
  let securityCheckMessage = "";
  if (config.security.enableSecurityCheck) {
    if (suspiciousFilesResults.length > 0) {
      securityCheckMessage = pc.yellow(
        `${suspiciousFilesResults.length.toLocaleString()} suspicious file(s) detected and excluded`
      );
    } else {
    }
  } else {
    securityCheckMessage = pc.dim("security check disabled");
  }

  logger.log(`${pc.white("files")} ${pc.white(totalFiles.toLocaleString())}`);
  logger.log(`${pc.white("lines:")} ${pc.white(totalLines.toLocaleString())}`);
  logger.log(
    `${pc.white("tokens:")} ${pc.white(totalTokens.toLocaleString())}`
  );
  logger.log("");
  logger.log(`${pc.white("output:")} ${pc.white(outputPath)}`);
  if (securityCheckMessage)
    logger.log(`${pc.white("security:")} ${pc.white(securityCheckMessage)}`);
};

export const printSecurityCheck = (
  rootDir: string,
  suspiciousFilesResults: SuspiciousFileResult[],
  config: RepomixConfigMerged
) => {
  if (!config.security.enableSecurityCheck) {
    return;
  }

  if (suspiciousFilesResults.length === 0) {
  } else {
    logger.log(
      pc.yellow(
        `${suspiciousFilesResults.length} suspicious file(s) detected and excluded from the output:`
      )
    );
    suspiciousFilesResults.forEach((suspiciousFilesResult, index) => {
      const relativeFilePath = path.relative(
        rootDir,
        suspiciousFilesResult.filePath
      );
      logger.log(`${pc.white(`${index + 1}.`)} ${pc.white(relativeFilePath)}`);
      logger.log(
        pc.dim(`   - ${suspiciousFilesResult.messages.join("\n   - ")}`)
      );
    });
    logger.log(
      pc.yellow(
        "\nThese files have been excluded from the output for security reasons."
      )
    );
    logger.log(
      pc.yellow(
        "Please review these files for potential sensitive information."
      )
    );
  }
};

export const printTopFiles = (
  fileLineCounts: Record<string, number>,
  fileTokenCounts: Record<string, number>,
  topFilesLength: number
) => {
  const topFilesLengthStrLen = topFilesLength.toString().length;
  logger.log(pc.white(`top ${topFilesLength} files`));
  logger.log(
    pc.dim(
      `─────────────────────────────────────────────────${"─".repeat(
        topFilesLengthStrLen
      )}`
    )
  );

  const topFiles = Object.entries(fileLineCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topFilesLength);

  topFiles.forEach(([filePath, lineCount], index) => {
    const tokenCount = fileTokenCounts[filePath];
    const indexString = `${index + 1}.`.padEnd(3, " ");
    logger.log(
      `${pc.white(`${indexString}`)} ${pc.white(filePath)} ${pc.dim(
        `(${lineCount.toLocaleString()} lines, ${tokenCount.toLocaleString()} tokens)`
      )}`
    );
  });
};
