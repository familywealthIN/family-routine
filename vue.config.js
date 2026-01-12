module.exports = {
  configureWebpack: {
    devServer: {
      proxy: 'http://localhost:3000/graphql',
      headers: { 'Access-Control-Allow-Origin': '*' },
    },
  },
  chainWebpack: (config) => {
    // Exclude .stories.js files from webpack build
    config.module.rule('js').exclude.add(/\.stories\.js$/);

    config.plugins.delete('prefetch');
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
    themeColor: '#FFFFFF',
    msTileColor: '#FFFFFF',
    appleMobileWebAppCapable: 'yes',
    appleMobileWebAppStatusBarStyle: '#FFFFFF',
    workboxPluginMode: 'InjectManifest',
    manifestOptions: {
      start_url: '/?install=true',
      gcm_sender_id: '350952942983',
      gcm_user_visible_only: true,
    },
    workboxOptions: {
      swSrc: 'src/sw.js',
      exclude: ['_header', '_redirects', 'firebase-messaging-sw.js', 'firebase.html', '.htaccess'],
    },
  },
};
