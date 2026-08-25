/**
 * Tokopedia Analytics - Background Service Worker
 */

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'dataExtracted') {
        chrome.storage.local.set({
            lastExtractedData: request.data,
            lastExtractedTime: new Date().toISOString()
        });
    }
});