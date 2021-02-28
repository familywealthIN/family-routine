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
    name: 'Family Routine',
    themeColor: '#288bd5',
    msTileColor: '#FFFFFF',
    appleMobileWebAppCapable: 'yes',
    appleMobileWebAppStatusBarStyle: 'black',
    workboxOptions: {
      exclude: ['_header', '_redirects', 'firebase-messaging-sw.js', 'firebase.html', '.htaccess'],
    },
  },
};
