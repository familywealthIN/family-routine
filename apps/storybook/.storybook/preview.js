import { VApp, VContent } from 'vuetify/lib';
import { installDesign } from '@routine-notes/ui/design';

// Single source of truth for Vuetify + theme + fonts + icon fonts + base CSS.
installDesign();

export const decorators = [
    // VApp/VContent are imported here because `vuetify/lib` is a-la-carte and
    // vuetify-loader only auto-registers tags in .vue templates, not in this
    // string template. Without them every story rendered outside a real v-app
    // (an unknown element), so it missed the app root's theme classes.
    (story) => ({
        components: { story, VApp, VContent },
        template: '<v-app><v-content><story /></v-content></v-app>',
    }),
];

export const parameters = {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
        matchers: {
            color: /(background|color)$/i,
            date: /Date$/,
        },
    },
    backgrounds: {
        default: 'light',
        values: [
            {
                name: 'light',
                value: '#ffffff',
            },
            {
                name: 'dark',
                value: '#333333',
            },
        ],
    },
};
