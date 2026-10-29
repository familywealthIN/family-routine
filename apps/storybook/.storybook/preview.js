import Vue from 'vue';
import * as vuetifyLib from 'vuetify/lib';
import { VApp, VContent } from 'vuetify/lib';
import { installDesign } from '@routine-notes/ui/design';
import tokens from '../../../packages/design/tokens.json';

// Single source of truth for Vuetify + theme + fonts + icon fonts + base CSS.
installDesign();

// Stories write <v-btn>, <v-stepper> … in string templates, which
// vuetify-loader never sees (it registers tags only in .vue files). Unregistered,
// they render as unknown elements: bare text, no Vuetify styling. Register every
// Vuetify component and directive so a story's markup renders as it does in the
// app. Storybook only; the app keeps its a-la-carte build.
Object.entries(vuetifyLib).forEach(([name, value]) => {
    if (/^V[A-Z]/.test(name) && value) Vue.component(name, value);
});
Object.entries(vuetifyLib.directives).forEach(([name, directive]) => {
    Vue.directive(name.replace(/[A-Z]/g, (c, i) => (i ? '-' : '') + c.toLowerCase()), directive);
});

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

const color = (name) => tokens.color.tokens.find((t) => t.name === name).value;

export const parameters = {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
        matchers: {
            color: /(background|color)$/i,
            date: /Date$/,
        },
    },
    // The same order and backgrounds as the Claude Design project (packages/design):
    // foundations first, then the atomic levels; stories sit on the app background.
    options: {
        storySort: { order: ['Foundations', 'Atoms', 'Molecules', 'Organisms'] },
    },
    backgrounds: {
        default: 'app',
        values: [
            { name: 'app', value: color('bg-app') },
            { name: 'surface', value: color('surface') },
            { name: 'dark', value: '#333333' },
        ],
    },
};
