const path = require('path');

module.exports = {
    stories: [
        '../../../packages/ui/**/*.stories.@(js|jsx|ts|tsx)',
        '../../../packages/markdown-editor/**/*.stories.@(js|jsx|ts|tsx)',
    ],
    addons: [
        '@storybook/addon-links',
        '@storybook/addon-essentials',
        '@storybook/addon-a11y',
        '@storybook/addon-viewport',
    ],
    framework: '@storybook/vue',
    core: {
        builder: 'webpack4',
    },
    webpackFinal: async (config) => {
        const { VueLoaderPlugin } = require('vue-loader');
        const VuetifyLoaderPlugin = require('vuetify-loader/lib/plugin');

        const vueLoaderIndex = config.module.rules.findIndex(
            rule => rule.test && rule.test.toString().includes('vue')
        );

        if (vueLoaderIndex === -1) {
            config.module.rules.push({
                test: /\.vue$/,
                loader: 'vue-loader',
                options: {
                    compilerOptions: {
                        preserveWhitespace: false,
                    },
                },
            });
        }

        config.module.rules.push({
            test: /\.styl(us)?$/,
            use: [
                'style-loader',
                'css-loader',
                {
                    loader: 'stylus-loader',
                    options: {
                        stylusOptions: {
                            includeCSS: true,
                        },
                    },
                },
            ],
        });

        const hasVueLoaderPlugin = config.plugins.some(
            plugin => plugin.constructor.name === 'VueLoaderPlugin'
        );

        if (!hasVueLoaderPlugin) {
            config.plugins.push(new VueLoaderPlugin());
        }

        config.plugins.push(new VuetifyLoaderPlugin());

        // Design, utils, constants and composables all live in @family-routine/ui.
        // Deliberately no alias to apps/web-app so storybook remains isolated.
        config.resolve.alias = {
            ...config.resolve.alias,
            '@family-routine/ui': path.resolve(__dirname, '../../../packages/ui'),
            '@family-routine/markdown-editor': path.resolve(__dirname, '../../../packages/markdown-editor'),
            'vue$': 'vue/dist/vue.esm.js',
        };

        config.resolve.symlinks = false;

        config.resolve.extensions = [
            ...config.resolve.extensions,
            '.vue',
            '.css',
            '.scss',
            '.sass',
            '.styl',
            '.stylus',
        ];

        return config;
    },
};
