module.exports = {
  transpileDependencies: [
    '@routine-notes/ui',
    '@routine-notes/markdown-editor',
  ],
  configureWebpack: {
    devServer: {
      proxy: 'http://localhost:3000/graphql',
      headers: { 'Access-Control-Allow-Origin': '*' },
    },
    resolve: {
      symlinks: false,
    },
  },
  chainWebpack: (config) => {
    // Exclude .stories.js files from webpack build
    config.module.rule('js').exclude.add(/\.stories\.js$/);

    config.plugins.delete('prefetch');

    // The app's own stylesheets live in packages/ui/styles/app and resolve
    // through node_modules, which would sweep them into chunk-vendors. Keep
    // them in the app chunk, after the vendor CSS, where they sat when they
    // lived in src/, so their place in the cascade is unchanged.
    if (config.optimization.get('splitChunks')) {
      const appStyles = /[\\/]@routine-notes[\\/]ui[\\/]styles[\\/]app[\\/]/;
      config.optimization.splitChunks({
        cacheGroups: {
          ...config.optimization.get('splitChunks').cacheGroups,
          vendors: {
            name: 'chunk-vendors',
            test: (module) => {
              const name = module.nameForCondition && module.nameForCondition();
              return !!name && /[\\/]node_modules[\\/]/.test(name) && !appStyles.test(name);
            },
            priority: -10,
            chunks: 'initial',
          },
        },
      });
    }
    const oneOfsMap = config.module.rule('stylus').oneOfs.store;
    oneOfsMap.forEach((item) => {
      item
        .use('stylus-loader')
        .loader('stylus-loader')
        .tap((options) => {
          if (options.preferPathResolver) {
            delete options.preferPathResolver; // eslint-disable-line no-param-reassign
          }
          return options;
        });
    });
  },
  pwa: {
    name: 'Routine Notes',
    // The app bar of every redesigned screen (AppShell topbar, RoutineTopBar)
    // is #f4f4f4, so the Android status bar / task-switcher tint matches it.
    // The app has no dark theme, so a single (non media-qualified) colour.
    themeColor: '#f4f4f4',
    msTileColor: '#f4f4f4',
    appleMobileWebAppCapable: 'yes',
    // Must be one of default | black | black-translucent ('#FFFFFF' was
    // invalid). `default` = dark status-bar text on a light bar, with the page
    // starting below it; `black-translucent` drew WHITE clock/battery text
    // over the light app bar, which made them unreadable.
    appleMobileWebAppStatusBarStyle: 'default',
    workboxPluginMode: 'InjectManifest',
    manifestOptions: {
      background_color: '#f4f4f4',
      start_url: '/?install=true',
      gcm_sender_id: '350952942983',
      gcm_user_visible_only: true,
    },
    workboxOptions: {
      swSrc: 'src/sw.js',
      exclude: ['_header', '_redirects', 'public/firebase-messaging-sw.js', 'public/firebase.html', '.htaccess'],
    },
  },
  lintOnSave: false,
};
