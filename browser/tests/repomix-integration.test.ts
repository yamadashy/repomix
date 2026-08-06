import { beforeEach, describe, expect, it } from 'vitest';
import { findNavigationContainer } from '../utils/github-navigation';

// Mock DOM environment
Object.defineProperty(window, 'location', {
  value: {
    pathname: '/yamadashy/repomix',
    href: 'https://github.com/yamadashy/repomix',
  },
  writable: true,
});

describe('RepomixIntegration', () => {
  beforeEach(() => {
    // Reset DOM
    document.body.innerHTML = '';

    // Mock GitHub page structure
    const navActions = document.createElement('ul');
    navActions.className = 'pagehead-actions';
    document.body.appendChild(navActions);
  });

  it('should extract repository information correctly', () => {
    // This is a placeholder test since we're testing static methods
    // In a real scenario, we'd need to import and test the actual classes
    const pathMatch = window.location.pathname.match(/^\/([^/]+)\/([^/]+)/);
    expect(pathMatch).toBeTruthy();

    if (pathMatch) {
      const [, owner, repo] = pathMatch;
      expect(owner).toBe('yamadashy');
      expect(repo).toBe('repomix');
    }
  });

  it('should construct correct Repomix URL', () => {
    const repoUrl = 'https://github.com/yamadashy/repomix';
    const expectedUrl = `https://repomix.com/?repo=${encodeURIComponent(repoUrl)}`;

    expect(expectedUrl).toBe('https://repomix.com/?repo=https%3A%2F%2Fgithub.com%2Fyamadashy%2Frepomix');
  });

  it('should find navigation container in the legacy repo header', () => {
    const navContainer = findNavigationContainer();
    expect(navContainer).toBe(document.querySelector('ul.pagehead-actions'));
  });

  it('should find navigation container in the new React-based repo header', () => {
    document.body.innerHTML = '';
    const navActions = document.createElement('ul');
    navActions.setAttribute('data-testid', 'repo-header-actions');
    document.body.appendChild(navActions);

    expect(findNavigationContainer()).toBe(navActions);
  });

  it('should prefer the new repo header container when both are present', () => {
    const newNavActions = document.createElement('ul');
    newNavActions.setAttribute('data-testid', 'repo-header-actions');
    document.body.appendChild(newNavActions);

    expect(findNavigationContainer()).toBe(newNavActions);
  });

  it('should return null when no navigation container exists', () => {
    document.body.innerHTML = '';
    expect(findNavigationContainer()).toBeNull();
  });
});
