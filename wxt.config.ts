import {defineConfig} from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
    extensionApi: 'chrome',
    modules: ['@wxt-dev/module-react'],
    manifest: {
        permissions: ['storage'],
        web_accessible_resources: [
            {
                resources: ["loader.js"],
                matches: [
                    'https://*.squig.link/*',
                    'https://graph.hangout.audio/*'
                ]
            },
        ]
    }
});
