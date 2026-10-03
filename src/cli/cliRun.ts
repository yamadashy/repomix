import * as fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { Option, program } from 'commander';
import pc from 'picocolors';
import { getVersion } from '../core/file/packageJsonParse.js';
import { isExplicitRemoteUrl, isValidShorthand } from '../core/git/gitRemoteUrl.js';
import { handleError, RepomixError } from '../shared/errorHandle.js';
import { logger, repomixLogLevels } from '../shared/logger.js';
import { parseHumanSizeToBytes } from '../shared/sizeParse.js';
import { redactOptionsForLog, redactUrl } from '../shared/urlRedact.js';
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
  plain: ['--no-color'],
  monochrome: ['--no-color'],
  pipe: ['--stdin'],
  monitor: ['--watch'],
  live: ['--watch'],
  auto: ['--watch'],
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
      .option('--no-color', 'Disable colored output (also respects NO_COLOR env variable, see https://no-color.org)')
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
      .addOption(
        new Option(
          '--output-file-path-style <style>',
          'How file paths are shown in output: target-relative or cwd-relative (default: target-relative)',
        ).choices(['target-relative', 'cwd-relative']),
      )
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
      .option(
        '--remote-trust-config',
        'Trust and load config files from remote repositories (disabled by default for security; asks for confirmation on an interactive terminal)',
      )
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
      .option(
        '--token-budget <number>',
        'Fail with a non-zero exit code when the packed output exceeds N tokens (guard for CI/agent context limits)',
        (v: string) => {
          if (!/^\d+$/.test(v) || Number(v) < 1) {
            throw new RepomixError(`Invalid number for --token-budget: '${v}'. Must be a positive integer.`);
          }
          return Number(v);
        },
      )
      // MCP
      .optionsGroup('MCP')
      .option('--mcp', 'Run as Model Context Protocol server for AI tool integration')
      .option(
        '--sandbox [dir]',
        "With --mcp: confine the MCP server's file tools to a workspace directory (defaults to the working directory; e.g. --sandbox path/to/project). Every path is relative to that root, absolute/host paths are refused, and remote packing, skill generation, and attaching external outputs are disabled.",
      )
      // Skill Generation
      .optionsGroup('Skill Generation (Experimental)')
      .option(
        '--skill-generate [name]',
        'Generate Claude Agent Skills format output to .claude/skills/<name>/ directory (name auto-generated if omitted)',
      )
      .option('--skill-project-name <name>', 'Override the project name used in generated Skills descriptions')
      .option('--skill-output <path>', 'Specify skill output directory path directly (skips location prompt)')
      .option('-f, --force', 'Skip all confirmation prompts (skill directory overwrite, remote config trust)')
      // Watch Mode
      .optionsGroup('Watch Mode')
      .option('-w, --watch', 'Watch for file changes and automatically re-pack')
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
  // Auto-enable file processors for real CLI invocations only. Library callers
  // (`runCli`/`pack`) and MCP tools bypass this endpoint, so they default to OFF.
  // Remote runs downgrade this based on --remote-trust-config in runRemoteAction.
  await runCli(directories, process.cwd(), { enableFileProcessors: true, ...options });
};

/**
 * Validates flags that cannot be combined with --watch. Runs before log-level
 * changes so error messages are not suppressed by --quiet/--stdout.
 */
const validateWatchOptions = (directories: string[], options: CliOptions): void => {
  if (!options.watch) {
    return;
  }
  if (options.remote) {
    throw new RepomixError('--watch cannot be used with --remote. Watch mode only works with local directories.');
  }
  if (options.stdout) {
    throw new RepomixError('--watch cannot be used with --stdout. Watch mode writes to a file.');
  }
  if (options.stdin) {
    throw new RepomixError('--watch cannot be used with --stdin. Watch mode discovers files automatically.');
  }
  if (options.copy) {
    throw new RepomixError(
      '--watch cannot be used with --copy. Watch mode re-packs on every change, which would repeatedly overwrite the clipboard.',
    );
  }
  if (options.splitOutput) {
    throw new RepomixError(
      '--watch cannot be used with --split-output. Watch mode does not yet support split output files.',
    );
  }
  if (options.skillGenerate !== undefined) {
    throw new RepomixError(
      '--watch cannot be used with --skill-generate. Watch mode does not support skill generation.',
    );
  }
  if (directories.length === 1 && isExplicitRemoteUrl(directories[0])) {
    throw new RepomixError('--watch cannot be used with remote URLs. Watch mode only works with local directories.');
  }
};

/**
 * Canonicalize the --sandbox workspace root for the always-on path guard. realpath
 * resolves symlinks (e.g. macOS /tmp -> /private/tmp) so the guard, output
 * virtualization, and error scrubbing all agree with the realpaths resolveWithinRoot
 * returns; a lexical-only root would silently weaken every guard that compares
 * canonical child paths against it.
 *
 * Windows quirk: fs.realpath throws EPERM on some perfectly accessible directories
 * (notably the 8.3 short-name temp path C:\Users\RUNNER~1\...). resolveWithinRoot
 * already tolerates this by falling back to the lexical root, so match it here: when
 * realpath fails but the directory genuinely exists, use the lexical (already
 * absolute) root instead of refusing to start. A truly missing/inaccessible root
 * still fails closed. The kernel sandbox grants on the directory OBJECT, not its
 * name, so a short-name lexical root is confined identically — and because the guard
 * canonicalizes root and candidates with the same realpath+lexical-fallback, they
 * stay consistent.
 */
export const canonicalizeSandboxRoot = async (
  requestedRoot: string,
  deps = { realpath: (p: string) => fs.realpath(p), stat: (p: string) => fs.stat(p) },
): Promise<string> => {
  try {
    return await deps.realpath(requestedRoot);
  } catch (realpathError) {
    try {
      if ((await deps.stat(requestedRoot)).isDirectory()) {
        return path.resolve(requestedRoot);
      }
    } catch {
      // Directory is genuinely missing/inaccessible — fall through to fail closed.
    }
    const message = realpathError instanceof Error ? realpathError.message : String(realpathError);
    throw new RepomixError(
      `--sandbox workspace directory could not be resolved (${message}). Ensure it exists and is accessible.`,
    );
  }
};

export const runCli = async (directories: string[], cwd: string, options: CliOptions) => {
  // Detect stdout mode
  // NOTE: For compatibility, currently not detecting pipe mode
  const isForceStdoutMode = options.output === '-';
  if (isForceStdoutMode) {
    options.stdout = true;
  }

  // Validate --watch conflicts early, before log level changes can suppress error messages
  validateWatchOptions(directories, options);

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

  // A positional argument can itself be a remote URL, and `options.remote` holds
  // one by definition, so both are redacted before being dumped.
  logger.trace('directories:', directories.map(redactUrl));
  logger.trace('cwd:', cwd);
  logger.trace('options:', redactOptionsForLog(options));

  const sandboxed = options.sandbox != null && options.sandbox !== false;

  if (sandboxed && !options.mcp) {
    logger.warn('--sandbox has no effect without --mcp; it only confines the MCP server.');
  }

  if (options.mcp) {
    // A string value of --sandbox is the workspace dir to confine to; otherwise use cwd.
    const requestedRoot = typeof options.sandbox === 'string' ? path.resolve(cwd, options.sandbox) : cwd;
    // Canonicalize the root so the guard/virtualization/error-scrubbing agree with the
    // realpaths resolveWithinRoot returns. Runs before any agent connects, so surfacing
    // the operator's own path in a resolution error is fine.
    const sandboxRoot = sandboxed ? await canonicalizeSandboxRoot(requestedRoot) : requestedRoot;
    const { runMcpAction } = await import('./actions/mcpAction.js');
    return await runMcpAction({ sandboxed, cwd: sandboxRoot });
  }

  if (options.version) {
    const { runVersionAction } = await import('./actions/versionAction.js');
    await runVersionAction();
    return;
  }

  // Skip version header in stdin mode to avoid interfering with piped output from interactive tools like fzf
  if (!options.stdin) {
    const version = await getVersion();
    logger.log(pc.dim(`\n📦 Repomix v${version}\n`));
  }

  if (options.init) {
    const { runInitAction } = await import('./actions/initAction.js');
    await runInitAction(cwd, options.global || false);
    return;
  }

  if (options.remote) {
    const { runRemoteAction } = await import('./actions/remoteAction.js');
    return await runRemoteAction(options.remote, options);
  }

  // Auto-detect explicit remote URLs (https://, git@, ssh://, git://) in positional arguments
  if (directories.length === 1 && isExplicitRemoteUrl(directories[0])) {
    logger.trace(`Auto-detected remote URL from positional argument: ${redactUrl(directories[0])}`);
    const { runRemoteAction } = await import('./actions/remoteAction.js');
    return await runRemoteAction(directories[0], options);
  }

  if (options.watch) {
    const { runWatchAction } = await import('./actions/watchAction.js');
    return await runWatchAction(directories, cwd, options);
  }

  // Auto-detect GitHub shorthand (owner/repo) in positional arguments.
  // Shorthand is ambiguous with relative local paths, so it is only treated as remote when:
  //   1. the argument does not exist as a local path, and
  //   2. the repository is confirmed reachable on GitHub (HEAD-only `git ls-remote` probe).
  // A mistyped local path (e.g. `src/uitls`) fails the probe and falls through to the
  // regular local-path handling instead of triggering an unintended clone attempt.
  // Skipped in stdin mode, where positional directory arguments are rejected.
  if (directories.length === 1 && !options.stdin && isValidShorthand(directories[0])) {
    const localPathExists = await fs.access(path.resolve(cwd, directories[0])).then(
      () => true,
      // EACCES/EPERM mean the path exists but is inaccessible — keep local-path precedence
      // and only fall through to the remote probe when the path is truly missing.
      (error: NodeJS.ErrnoException) => !['ENOENT', 'ENOTDIR'].includes(error.code ?? ''),
    );
    if (!localPathExists) {
      const { checkRemoteRepoExists } = await import('../core/git/gitRemoteHandle.js');
      if (await checkRemoteRepoExists(`https://github.com/${directories[0]}.git`)) {
        logger.log(
          pc.dim(
            `Detected GitHub repository shorthand: ${directories[0]} (prefix with ./ to treat it as a local path)\n`,
          ),
        );
        const { runRemoteAction } = await import('./actions/remoteAction.js');
        return await runRemoteAction(directories[0], options);
      }
      logger.trace(`Argument matches owner/repo shorthand but is not a reachable GitHub repository: ${directories[0]}`);
    }
  }

  const { runDefaultAction } = await import('./actions/defaultAction.js');
  return await runDefaultAction(directories, cwd, options);
};
