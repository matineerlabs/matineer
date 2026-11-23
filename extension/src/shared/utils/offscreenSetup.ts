export let creatingOffscreen: Promise<void> | null = null;

export async function hasOffscreenDocument(): Promise<boolean> {
  if (typeof chrome !== 'undefined' && chrome.runtime && 'getContexts' in chrome.runtime) {
    const contexts = await chrome.runtime.getContexts({
      contextTypes: ['OFFSCREEN_DOCUMENT' as any],
    });
    return contexts.length > 0;
  } else if (typeof self !== 'undefined' && 'clients' in self) {
    const matchedClients = await (self as any).clients.matchAll();
    for (const client of matchedClients) {
      if (client.url.endsWith('offscreen.html')) {
        return true;
      }
    }
    return false;
  }
  return false;
}

export async function setupOffscreenDocument(): Promise<void> {
  if (creatingOffscreen) {
    return creatingOffscreen;
  }

  creatingOffscreen = (async () => {
    try {
      if (await hasOffscreenDocument()) {
        return;
      }
      const OFFSCREEN_DOCUMENT_PATH = 'offscreen.html';
      await chrome.offscreen.createDocument({
        url: OFFSCREEN_DOCUMENT_PATH,
        reasons: [chrome.offscreen.Reason.DOM_PARSER],
        justification: 'Parse HTML using native DOM parser',
      });
    } finally {
      creatingOffscreen = null;
    }
  })();

  return creatingOffscreen;
}
