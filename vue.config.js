module.exports = {
  configureWebpack: {
    devServer: {
      proxy: 'http://localhost:3000/graphql',
      headers: { 'Access-Control-Allow-Origin': '*' },
    },
  },
  chainWebpack: (config) => {
    config.plugins.delete('prefetch');
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
      exclude: ['_header', '_redirects', 'public/firebase-messaging-sw.js', 'public/firebase.html', '.htaccess'],
    },
  },
};
