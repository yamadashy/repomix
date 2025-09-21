const injectContentToTab = async (tab: chrome.tabs.Tab): Promise<void> => {
  // Skip if URL is undefined
  if (!tab.url) {
    return;
  }

  // Skip if tab is discarded
  if (tab.discarded) {
    return;
  }

  // Skip if tab ID is undefined
  if (tab.id === undefined) {
    return;
  }

  // Skip if not a GitHub URL
  if (!tab.url.startsWith('https://github.com/')) {
    return;
  }

  try {
    const manifest = chrome.runtime.getManifest();

    // Inject CSS
    if (manifest.content_scripts?.[0]?.css) {
      await chrome.scripting.insertCSS({
        target: { tabId: tab.id },
        files: manifest.content_scripts[0].css,
      });
    }

    // Inject JavaScript
    if (manifest.content_scripts?.[0]?.js) {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: manifest.content_scripts[0].js,
      });
    }
  } catch (error) {
    console.error('Error injecting content script:', error);
  }
};

// Update extension content for tabs
chrome.tabs.query({}, async (tabs: chrome.tabs.Tab[]) => {
  for (const tab of tabs) {
    try {
      await injectContentToTab(tab);
    } catch (e) {
      console.error(e);
    }
  }
});