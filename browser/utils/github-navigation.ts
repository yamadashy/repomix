// GitHub is rolling out a React-based repository header that replaces the
// legacy `ul.pagehead-actions` list with `ul[data-testid="repo-header-actions"]`.
// Keep the legacy selector as a fallback while the rollout is in progress.
export function findNavigationContainer(): Element | null {
  return (
    document.querySelector('ul[data-testid="repo-header-actions"]') ?? document.querySelector('ul.pagehead-actions')
  );
}
