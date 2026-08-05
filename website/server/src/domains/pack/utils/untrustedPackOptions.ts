import type { CliOptions } from 'repomix';
import type { PackOptions } from '../../../types.js';

/**
 * Builds the `runDefaultAction` options for packing a directory whose contents
 * came from outside this server — an uploaded archive or a cloned repository.
 *
 * Both callers go through here so that `skipLocalConfig` cannot be present on
 * one path and missing on the other. That is not a hypothetical: the two option
 * objects were written out separately and drifted, and the ZIP upload path spent
 * that time importing — and therefore executing — `repomix.config.*` files out
 * of uploaded archives.
 *
 * `CliOptions` extends commander's `OptionValues`, which has an index signature,
 * so a misspelled flag here type-checks silently. The tests around each caller
 * are what actually pin the flag reaching `runDefaultAction`.
 */
export const buildUntrustedPackCliOptions = ({
  outputFilePath,
  format,
  options,
  securityCheck,
}: {
  outputFilePath: string;
  format: string;
  options: PackOptions;
  // The one setting the two paths genuinely disagree on, so it stays a decision
  // the caller makes rather than something baked in here.
  securityCheck: boolean;
}): CliOptions =>
  ({
    output: outputFilePath,
    style: format,
    parsableStyle: options.outputParsable,
    removeComments: options.removeComments,
    removeEmptyLines: options.removeEmptyLines,
    outputShowLineNumbers: options.showLineNumbers,
    fileSummary: options.fileSummary,
    directoryStructure: options.directoryStructure,
    compress: options.compress,
    securityCheck,
    topFilesLen: 10,
    include: options.includePatterns,
    ignore: options.ignorePatterns,
    quiet: true, // Suppress CLI output; this runs inside a request handler
    // The packed tree is attacker-controlled. Loading a config from it runs the
    // config module in this process, before packing and before the security
    // check ever looks at file contents.
    skipLocalConfig: true,
  }) as CliOptions;
