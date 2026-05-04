import { installDesign } from '@family-routine/ui/design';

// Single source of truth for Vuetify + theme + fonts + icon fonts + base CSS.
installDesign();

export const decorators = [
    (story) => ({
        components: { story },
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
