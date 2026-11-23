import { AmcHtmlParser } from '../shared/utils/parser';

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.target !== 'offscreen') {
    return;
  }

  if (message.action === 'PARSE_AMC_HTML') {
    try {
      const html = message.payload.html || '';
      const parser = new AmcHtmlParser();
      const movies = parser.parse(html);
      sendResponse({ success: true, movies });
    } catch (error: any) {
      console.error('[Offscreen] Parsing error:', error);
      sendResponse({ success: false, error: error.message || 'Unknown parsing error' });
    }
  }

  return true; // Keep the message channel open for sendResponse
});
