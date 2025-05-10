import process from 'node:process';
import { cli, command } from 'cleye';
import pc from 'picocolors';
import { getVersion } from '../core/file/packageJsonParse.js';
import { handleError } from '../shared/errorHandle.js';
import { logger, repomixLogLevels } from '../shared/logger.js';
import { runDefaultAction } from './actions/defaultAction.js';
import { runInitAction } from './actions/initAction.js';
import { runMcpAction } from './actions/mcpAction.js';
import { runRemoteAction } from './actions/remoteAction.js';
import { runVersionAction } from './actions/versionAction.js';
import type { CliOptions } from './types.js';

// Semantic mapping for CLI suggestions
// This maps conceptually related terms (not typos) to valid options
const semanticSuggestionMap: Record<string, string[]> = {
  exclude: ['--ignore'],
  reject: ['--ignore'],
  omit: ['--ignore'],
  skip: ['--ignore'],
  blacklist: ['--ignore'],
  save: ['--output'],
  export: ['--output'],
  out: ['--output'],
  file: ['--output'],
  format: ['--style'],
  type: ['--style'],
  syntax: ['--style'],
  debug: ['--verbose'],
  detailed: ['--verbose'],
  silent: ['--quiet'],
  mute: ['--quiet'],
  add: ['--include'],
  with: ['--include'],
  whitelist: ['--include'],
  clone: ['--remote'],
  git: ['--remote'],
  minimize: ['--compress'],
  reduce: ['--compress'],
  'strip-comments': ['--remove-comments'],
  'no-comments': ['--remove-comments'],
  print: ['--stdout'],
  console: ['--stdout'],
  terminal: ['--stdout'],
};

export const run = async () => {
  try {
    const argv = cli({
      name: 'repomix',
      version: await getVersion(),
      parameters: ['[directories...]'],
      // Handle unknown options and provide semantic suggestions
      onUnknownOption: (option: string) => {
        const cleanOption = option.replace(/^-+/, '');
        const semanticMatches = semanticSuggestionMap[cleanOption];

        if (semanticMatches) {
          logger.error(`✖ Unknown option: ${option}`);
          logger.info(`Did you mean: ${semanticMatches.join(' or ')}?`);
          return;
        }

        logger.error(`✖ Unknown option: ${option}`);
      },
      flags: {
        // Basic Options
        version: {
          type: Boolean,
          alias: 'v',
          description: 'show version information',
        },
        // Output Options
        output: {
          type: String,
          alias: 'o',
          description: 'specify the output file name',
        },
        stdout: {
          type: Boolean,
          description: 'output to stdout instead of writing to a file',
        },
        style: {
          type: String,
          description: 'specify the output style (xml, markdown, plain)',
        },
        parsableStyle: {
          type: Boolean,
          description: 'by escaping and formatting, ensure the output is parsable as a document of its type',
        },
        compress: {
          type: Boolean,
          description: 'perform code compression to reduce token count',
        },
        outputShowLineNumbers: {
          type: Boolean,
          description: 'add line numbers to each line in the output',
        },
        copy: {
          type: Boolean,
          description: 'copy generated output to system clipboard',
        },
        fileSummary: {
          type: Boolean,
          default: true,
          description: 'enable file summary section output',
        },
        directoryStructure: {
          type: Boolean,
          default: true,
          description: 'enable directory structure section output',
        },
        files: {
          type: Boolean,
          default: true,
          description: 'enable files content output',
        },
        removeComments: {
          type: Boolean,
          description: 'remove comments',
        },
        removeEmptyLines: {
          type: Boolean,
          description: 'remove empty lines',
        },
        headerText: {
          type: String,
          description: 'specify the header text',
        },
        instructionFilePath: {
          type: String,
          description: 'path to a file containing detailed custom instructions',
        },
        includeEmptyDirectories: {
          type: Boolean,
          description: 'include empty directories in the output',
        },
        gitSortByChanges: {
          type: Boolean,
          default: true,
          description: 'enable sorting files by git change count',
        },
        includeDiffs: {
          type: Boolean,
          description: 'include git diffs in the output (includes both work tree and staged changes separately)',
        },
        // Filter Options
        include: {
          type: String,
          description: 'list of include patterns (comma-separated)',
        },
        ignore: {
          type: String,
          alias: 'i',
          description: 'additional ignore patterns (comma-separated)',
        },
        gitignore: {
          type: Boolean,
          default: true,
          description: 'enable .gitignore file usage',
        },
        defaultPatterns: {
          type: Boolean,
          default: true,
          description: 'enable default patterns',
        },
        // Remote Repository Options
        remote: {
          type: String,
          description: 'process a remote Git repository',
        },
        remoteBranch: {
          type: String,
          description: 'specify the remote branch name, tag, or commit hash (defaults to repository default branch)',
        },
        // Configuration Options
        config: {
          type: String,
          alias: 'c',
          description: 'path to a custom config file',
        },
        init: {
          type: Boolean,
          description: 'initialize a new repomix.config.json file',
        },
        global: {
          type: Boolean,
          description: 'use global configuration (only applicable with --init)',
        },
        // Security Options
        securityCheck: {
          type: Boolean,
          default: true,
          description: 'enable security check',
        },
        // Token Count Options
        tokenCountEncoding: {
          type: String,
          description: 'specify token count encoding (e.g., o200k_base, cl100k_base)',
        },
        // MCP
        mcp: {
          type: Boolean,
          description: 'run as a MCP server',
        },
        // Other Options
        topFilesLen: {
          type: Number,
          description: 'specify the number of top files to display',
        },
        verbose: {
          type: Boolean,
          description: 'enable verbose logging for detailed output',
        },
        quiet: {
          type: Boolean,
          description: 'disable all output to stdout',
        },
      },
      help: {
        description: 'Repomix - Pack your repository into a single AI-friendly file',
      },
    });

    const directories = argv._.length > 0 ? argv._ : ['.'];
    const options: CliOptions = argv.flags as unknown as CliOptions;

    await runCli(directories, process.cwd(), options);
  } catch (error) {
    handleError(error);
  }
};

export const runCli = async (directories: string[], cwd: string, options: CliOptions) => {
  // Detect stdout mode
  // NOTE: For compatibility, currently not detecting pipe mode
  const isForceStdoutMode = options.output === '-';
  if (isForceStdoutMode) {
    options.stdout = true;
  }

  // Set log level based on verbose and quiet flags
  if (options.quiet) {
    logger.setLogLevel(repomixLogLevels.SILENT);
  } else if (options.verbose) {
    logger.setLogLevel(repomixLogLevels.DEBUG);
  } else {
    logger.setLogLevel(repomixLogLevels.INFO);
  }

  // In stdout mode, set log level to SILENT
  if (options.stdout) {
    logger.setLogLevel(repomixLogLevels.SILENT);
  }

  logger.trace('directories:', directories);
  logger.trace('cwd:', cwd);
  logger.trace('options:', options);

  if (options.mcp) {
    return await runMcpAction();
  }

  if (options.version) {
    await runVersionAction();
    return;
  }

  const version = await getVersion();
  logger.log(pc.dim(`\n📦 Repomix v${version}\n`));

  if (options.init) {
    await runInitAction(cwd, options.global || false);
    return;
  }

  if (options.remote) {
    return await runRemoteAction(options.remote, options);
  }

  return await runDefaultAction(directories, cwd, options);
};
