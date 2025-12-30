import process from 'node:process';
import { Option, program } from 'commander';
import pc from 'picocolors';
import { getVersion } from '../core/file/packageJsonParse.js';
import { handleError, RepomixError } from '../shared/errorHandle.js';
import { logger, repomixLogLevels } from '../shared/logger.js';
import { parseHumanSizeToBytes } from '../shared/sizeParse.js';
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
  pipe: ['--stdin'],
};

export const run = async () => {
  try {
    program
      .description('Repomix - Pack your repository into a single AI-friendly file')
      .argument('[directories...]', 'list of directories to process', ['.'])
      // Basic Options
      .optionsGroup('Basic Options')
      .option('-v, --version', 'Show version information and exit')
      // CLI Input/Output Options
      .optionsGroup('CLI Input/Output Options')
      .addOption(
        new Option(
          '--verbose',
          'Enable detailed debug logging (shows file processing, token counts, and configuration details)',
        ).conflicts('quiet'),
      )
      .addOption(
        new Option('--quiet', 'Suppress all console output except errors (useful for scripting)').conflicts('verbose'),
      )
      .addOption(
        new Option(
          '--stdout',
          'Write packed output directly to stdout instead of a file (suppresses all logging)',
        ).conflicts('output'),
      )
      .option('--stdin', 'Read file paths from stdin, one per line (specified files are processed directly)')
      .option('--copy', 'Copy the generated output to system clipboard after processing')
      .option(
        '--token-count-tree [threshold]',
        'Show file tree with token counts; optional threshold to show only files with ≥N tokens (e.g., --token-count-tree 100)',
        (value: string | boolean) => {
          if (typeof value === 'string') {
            if (!/^\d+$/.test(value)) {
              throw new RepomixError(`Invalid token count threshold: '${value}'. Must be a non-negative integer.`);
            }
            return Number(value);
          }
          return value;
        },
      )
      .option(
        '--top-files-len <number>',
        'Number of largest files to show in summary (default: 5, e.g., --top-files-len 20)',
        (v: string) => {
          if (!/^\d+$/.test(v)) {
            throw new RepomixError(`Invalid number for --top-files-len: '${v}'. Must be a non-negative integer.`);
          }
          return Number(v);
        },
      )
      // Repomix Output Options
      .optionsGroup('Repomix Output Options')
      .option('-o, --output <file>', 'Output file path (default: repomix-output.xml, use "-" for stdout)')
      .option('--style <type>', 'Output format: xml, markdown, json, or plain (default: xml)')
      .option(
        '--parsable-style',
        'Escape special characters to ensure valid XML/Markdown (needed when output contains code that breaks formatting)',
      )
      .option(
        '--compress',
        'Extract essential code structure (classes, functions, interfaces) using Tree-sitter parsing',
      )
      .option('--output-show-line-numbers', 'Prefix each line with its line number in the output')
      .option('--no-file-summary', 'Omit the file summary section from output')
      .option('--no-directory-structure', 'Omit the directory tree visualization from output')
      .option('--no-files', 'Generate metadata only without file contents (useful for repository analysis)')
      .option('--remove-comments', 'Strip all code comments before packing')
      .option('--remove-empty-lines', 'Remove blank lines from all files')
      .option('--truncate-base64', 'Truncate long base64 data strings to reduce output size')
      .option('--header-text <text>', 'Custom text to include at the beginning of the output')
      .option('--instruction-file-path <path>', 'Path to file containing custom instructions to include in output')
      .addOption(
        new Option(
          '--split-output <size>',
          'Split output into multiple numbered files (e.g., repomix-output.1.xml, repomix-output.2.xml); size like 500kb, 2mb, or 2.5mb',
        ).argParser(parseHumanSizeToBytes),
      )
      .option('--include-empty-directories', 'Include folders with no files in directory structure')
      .option(
        '--include-full-directory-structure',
        'Show entire repository tree in the Directory Structure section, even when using --include patterns',
      )
      .option(
        '--no-git-sort-by-changes',
        "Don't sort files by git change frequency (default: most changed files first)",
      )
      .option('--include-diffs', 'Add git diff section showing working tree and staged changes')
      .option('--include-logs', 'Add git commit history with messages and changed files')
      .option(
        '--include-logs-count <count>',
        'Number of recent commits to include with --include-logs (default: 50)',
        (v: string) => {
          if (!/^\d+$/.test(v)) {
            throw new RepomixError(`Invalid number for --include-logs-count: '${v}'. Must be a non-negative integer.`);
          }
          return Number(v);
        },
      )
      // File Selection Options
      .optionsGroup('File Selection Options')
      .option(
        '--include <patterns>',
        'Include only files matching these glob patterns (comma-separated, e.g., "src/**/*.js,*.md")',
      )
      .option('-i, --ignore <patterns>', 'Additional patterns to exclude (comma-separated, e.g., "*.test.js,docs/**")')
      .option('--no-gitignore', "Don't use .gitignore rules for filtering files")
      .option('--no-dot-ignore', "Don't use .ignore rules for filtering files")
      .option('--no-default-patterns', "Don't apply built-in ignore patterns (node_modules, .git, build dirs, etc.)")
      // Remote Repository Options
      .optionsGroup('Remote Repository Options')
      .option('--remote <url>', 'Clone and pack a remote repository (GitHub URL or user/repo format)')
      .option('--remote-branch <name>', "Specific branch, tag, or commit to use (default: repository's default branch)")
      // Configuration Options
      .optionsGroup('Configuration Options')
      .option('-c, --config <path>', 'Use custom config file instead of repomix.config.json')
      .option('--init', 'Create a new repomix.config.json file with defaults')
      .option('--global', 'With --init, create config in home directory instead of current directory')
      // Security Options
      .optionsGroup('Security Options')
      .option('--no-security-check', 'Skip scanning for sensitive data like API keys and passwords')
      // Token Count Options
      .optionsGroup('Token Count Options')
      .option(
        '--token-count-encoding <encoding>',
        'Tokenizer model for counting: o200k_base (GPT-4o), cl100k_base (GPT-3.5/4), etc. (default: o200k_base)',
      )
      // MCP
      .optionsGroup('MCP')
      .option('--mcp', 'Run as Model Context Protocol server for AI tool integration')
      // Skill Generation
      .optionsGroup('Skill Generation (Experimental)')
      .option(
        '--skill-generate [name]',
        'Generate Claude Agent Skills format output to .claude/skills/<name>/ directory (name auto-generated if omitted)',
      )
      .option('--skill-output <path>', 'Specify skill output directory path directly (skips location prompt)')
      .option('-f, --force', 'Skip all confirmation prompts (currently: skill directory overwrite)')
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

  // Skip version header in stdin mode to avoid interfering with piped output from interactive tools like fzf
  if (!options.stdin) {
    const version = await getVersion();
    logger.log(pc.dim(`\n📦 Repomix v${version}\n`));
  }

  if (options.init) {
    await runInitAction(cwd, options.global || false);
    return;
  }

  if (options.remote) {
    return await runRemoteAction(options.remote, options);
  }

  return await runDefaultAction(directories, cwd, options);
};
