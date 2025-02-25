export default defineContentScript({
  matches: [
    'https://*.squig.link/*',
    'https://graph.hangout.audio/*'
  ],
  async main() {
      const result = await browser.storage.local.get('extensionEnabled');

      const enabled = result.extensionEnabled !== undefined ? result.extensionEnabled : true;

      if (enabled) {
          await injectScript('/loader.js', {
              keepInDom: true,
          });
      }
  },
});


