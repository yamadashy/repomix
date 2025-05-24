declare module 'git-url-parse' {
  import gitUp = require('git-up');

  namespace gitUrlParse {
    interface GitUrl extends gitUp.ParsedUrl {
      /** The Git provider (e.g. `"github.com"`). */
      source: string;
      /** The repository owner. */
      owner: string;
      /** The repository name. */
      name: string;
      /** The repository ref (e.g., "master" or "dev"). */
      ref: string;
      /** A filepath relative to the repository root. */
      filepath: string;
      /** The type of filepath in the url ("blob" or "tree"). */
      filepathtype: string;
      /** The owner and name values in the `owner/name` format. */
      full_name: string;
      /** The organization the owner belongs to. This is CloudForge specific. */
      organization: string;
      /** Whether to add the `.git` suffix or not. */
      git_suffix?: boolean | undefined;
      toString(type?: string): string;
    }

    function stringify(url: GitUrl, type?: string): string;
  }

  /**
   * Parses a Git url.
   * @param url The Git url to parse.
   * @param refs An array of strings representing the refs. This is helpful for URLs with branches containing slashes.
   * @returns The GitUrl object containing parsed information.
   */
  function gitUrlParse(url: string, refs?: string[]): gitUrlParse.GitUrl;

  export = gitUrlParse;
}
