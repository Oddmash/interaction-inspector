type Tab = { id?: number };

declare const chrome: {
  action: {
    onClicked: { addListener: (listener: (tab: Tab) => void) => void };
    setBadgeText: (options: { tabId: number; text: string }) => Promise<void>;
  };
  scripting: {
    executeScript: (options: { target: { tabId: number }; files: string[] }) => Promise<unknown>;
  };
};

chrome.action.onClicked.addListener(async ({ id }) => {
  if (id === undefined) return;
  try {
    await chrome.scripting.executeScript({ target: { tabId: id }, files: ['inspector.js'] });
    await chrome.action.setBadgeText({ tabId: id, text: '' });
  } catch {
    await chrome.action.setBadgeText({ tabId: id, text: '×' }).catch(() => {});
  }
});
