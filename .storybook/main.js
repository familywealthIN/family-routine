module.exports = {
  stories: ['../src/components/**/*.stories.@(js|jsx|ts|tsx)'],
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
    const path = require('path');
    const { VueLoaderPlugin } = require('vue-loader');
    const VuetifyLoaderPlugin = require('vuetify-loader/lib/plugin');

    // Find and update Vue loader configuration
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

    // Add stylus loader for Vuetify
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

    // Ensure VueLoaderPlugin is included
    const hasVueLoaderPlugin = config.plugins.some(
      plugin => plugin.constructor.name === 'VueLoaderPlugin'
    );

    if (!hasVueLoaderPlugin) {
      config.plugins.push(new VueLoaderPlugin());
    }

    // Add VuetifyLoaderPlugin for a-la-carte component imports
    config.plugins.push(new VuetifyLoaderPlugin());

    // Add alias for @ symbol
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, '../src'),
      'vue$': 'vue/dist/vue.esm.js',
    };

    // Ensure extensions are set
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
