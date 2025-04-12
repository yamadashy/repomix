import process from 'node:process';
import { Command, Option, program } from 'commander';
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
    program
      .description('Repomix - Pack your repository into a single AI-friendly file')
      .argument('[directories...]', 'list of directories to process', ['.'])
      // Basic Options
      .optionsGroup('Basic Options')
      .option('-v, --version', 'show version information')
      // Output Options
      .optionsGroup('Output Options')
      .option('-o, --output <file>', 'specify the output file name')
      .addOption(new Option('--stdout', 'output to stdout instead of writing to a file').conflicts('output'))
      .option('--style <type>', 'specify the output style (xml, markdown, plain)')
      .option('--parsable-style', 'by escaping and formatting, ensure the output is parsable as a document of its type')
      .option('--compress', 'perform code compression to reduce token count')
      .option('--output-show-line-numbers', 'add line numbers to each line in the output')
      .option('--copy', 'copy generated output to system clipboard')
      .option('--no-file-summary', 'disable file summary section output')
      .option('--no-directory-structure', 'disable directory structure section output')
      .option('--no-files', 'disable files content output (metadata-only mode)')
      .option('--remove-comments', 'remove comments')
      .option('--remove-empty-lines', 'remove empty lines')
      .option('--header-text <text>', 'specify the header text')
      .option('--instruction-file-path <path>', 'path to a file containing detailed custom instructions')
      .option('--include-empty-directories', 'include empty directories in the output')
      .option('--no-git-sort-by-changes', 'disable sorting files by git change count')
      .option(
        '--include-diffs',
        'include git diffs in the output (includes both work tree and staged changes separately)',
      )
      // Filter Options
      .optionsGroup('Filter Options')
      .option('--include <patterns>', 'list of include patterns (comma-separated)')
      .option('--force-include <patterns>', 'list of patterns to include, overriding ignores (comma-separated)')
      .option('-i, --ignore <patterns>', 'additional ignore patterns (comma-separated)')
      .option('--no-gitignore', 'disable .gitignore file usage')
      .option('--no-default-patterns', 'disable default patterns')
      // Remote Repository Options
      .optionsGroup('Remote Repository Options')
      .option('--remote <url>', 'process a remote Git repository')
      .option(
        '--remote-branch <name>',
        'specify the remote branch name, tag, or commit hash (defaults to repository default branch)',
      )
      // Configuration Options
      .optionsGroup('Configuration Options')
      .option('-c, --config <path>', 'path to a custom config file')
      .option('--init', 'initialize a new repomix.config.json file')
      .option('--global', 'use global configuration (only applicable with --init)')
      // Security Options
      .optionsGroup('Security Options')
      .option('--no-security-check', 'disable security check')
      // Token Count Options
      .optionsGroup('Token Count Options')
      .option('--token-count-encoding <encoding>', 'specify token count encoding (e.g., o200k_base, cl100k_base)')
      // MCP
      .optionsGroup('MCP')
      .option('--mcp', 'run as a MCP server')
      // Other Options
      .optionsGroup('Other Options')
      .option('--top-files-len <number>', 'specify the number of top files to display', Number.parseInt)
      .addOption(new Option('--verbose', 'enable verbose logging for detailed output').conflicts('quiet'))
      .addOption(new Option('--quiet', 'disable all output to stdout').conflicts('verbose'))
      .action(commanderActionEndpoint);

    // Custom error handling function
    const configOutput = program.configureOutput();
    const originalOutputError = configOutput.outputError || ((str, write) => write(str));

    program.configureOutput({
      outputError: (str, write) => {
        // Check if this is an unknown option error
        if (str.includes('unknown option')) {
          const match = str.match(/unknown option '?(-{1,2}[^ ']+)'?/i);
          if (match?.[1]) {
            const unknownOption = match[1];
            const cleanOption = unknownOption.replace(/^-+/, '');

            // Check if the option has a semantic match
            const semanticMatches = semanticSuggestionMap[cleanOption];
            if (semanticMatches) {
              // We have a direct semantic match
              logger.error(`✖ Unknown option: ${unknownOption}`);
              logger.info(`Did you mean: ${semanticMatches.join(' or ')}?`);
              return;
            }
          }
        }

        // Fall back to the original Commander error handler
        originalOutputError(str, write);
      },
    });

    await program.parseAsync(process.argv);
  } catch (error) {
    handleError(error);
    process.exit(1);
  }
};

const commanderActionEndpoint = async (directories: string[], options: CliOptions = {}) => {
  await runCli(directories, process.cwd(), options);
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
