import type { PlasmoCSConfig } from "plasmo"

export const config: PlasmoCSConfig = {
  matches: ["https://github.com/*"],
  run_at: "document_start",
  all_frames: true
}

interface RepositoryInfo {
  owner: string;
  repo: string;
  url: string;
}

interface RepomixButtonOptions {
  text: string;
  href: string;
  iconSrc?: string;
}

// Constants
const BUTTON_CLASS = 'repomix-button';
const ICON_SIZE = 16;
const REPOMIX_BASE_URL = 'https://repomix.com';
const BUTTON_TEXT = 'Repomix';
const DEFAULT_ICON_PATH = 'images/icon-64.png';

// Button functions
function isRepomixButtonAlreadyExists(): boolean {
  return document.querySelector(`.${BUTTON_CLASS}`) !== null;
}

function createRepomixButton(options: RepomixButtonOptions): HTMLElement {
  const container = document.createElement('li');

  const button = document.createElement('a');
  button.className = `${BUTTON_CLASS} btn-sm btn BtnGroup-item`;
  button.href = options.href;
  button.target = '_blank';
  button.rel = 'noopener noreferrer';
  button.title = chrome.i18n.getMessage('openWithRepomix');

  // Create octicon container
  const octicon = document.createElement('span');
  octicon.className = 'octicon';
  octicon.setAttribute('aria-hidden', 'true');

  // Use chrome.runtime.getURL for the icon
  const iconSrc = options.iconSrc || chrome.runtime.getURL(DEFAULT_ICON_PATH);
  octicon.innerHTML = `<img src="${iconSrc}" width="${ICON_SIZE}" height="${ICON_SIZE}" alt="Repomix">`;

  button.appendChild(octicon);

  // Add button text
  const textSpan = document.createElement('span');
  textSpan.textContent = options.text;
  button.appendChild(textSpan);

  container.appendChild(button);
  return container;
}

// GitHub functions
function extractRepositoryInfo(): RepositoryInfo | null {
  const pathMatch = window.location.pathname.match(/^\/([^/]+)\/([^/]+)/);
  if (!pathMatch) {
    return null;
  }

  const [, owner, repo] = pathMatch;
  return {
    owner,
    repo,
    url: `https://github.com/${owner}/${repo}`,
  };
}

function findNavigationContainer(): Element | null {
  return document.querySelector('ul.pagehead-actions');
}

function isRepositoryPage(): boolean {
  // Check if we're on a repository page (not user profile, organization, etc.)
  const pathParts = window.location.pathname.split('/').filter(Boolean);
  return pathParts.length >= 2 && !pathParts[0].startsWith('@');
}

// Main integration functions
function addRepomixButton(): void {
  try {
    // Check if button already exists
    if (isRepomixButtonAlreadyExists()) {
      return;
    }

    // Check if we're on a repository page
    if (!isRepositoryPage()) {
      return;
    }

    // Get repository information
    const repoInfo = extractRepositoryInfo();
    if (!repoInfo) {
      return;
    }

    // Find navigation container
    const navContainer = findNavigationContainer();
    if (!navContainer) {
      return;
    }

    // Create Repomix URL
    const repomixUrl = `${REPOMIX_BASE_URL}/?repo=${encodeURIComponent(repoInfo.url)}`;

    // Create button
    const buttonContainer = createRepomixButton({
      text: BUTTON_TEXT,
      href: repomixUrl,
    });

    // Insert button at the beginning (left side)
    navContainer.prepend(buttonContainer);

    console.log(`Repomix button added for ${repoInfo.owner}/${repoInfo.repo}`);
  } catch (error) {
    console.error('Error adding Repomix button:', error);
  }
}

function observePageChanges(): void {
  // Observe changes to handle GitHub's dynamic navigation
  const observer = new MutationObserver(() => {
    addRepomixButton();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  // Also listen for popstate events (back/forward navigation)
  window.addEventListener('popstate', () => {
    setTimeout(() => addRepomixButton(), 100);
  });
}

function initRepomixIntegration(): void {
  try {
    addRepomixButton();
    observePageChanges();
  } catch (error) {
    console.error('Error initializing Repomix integration:', error);
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => initRepomixIntegration());
} else {
  initRepomixIntegration();
}