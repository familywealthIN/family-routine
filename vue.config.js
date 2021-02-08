module.exports = {
  configureWebpack: {
    devServer: {
      proxy: 'http://localhost:3000/graphql',
      headers: { 'Access-Control-Allow-Origin': '*' },
    },
  },
  chainWebpack: (config) => {
    config.plugin('workbox');
    config.plugins.delete('prefetch');
  },
  pwa: {
    name: 'Family Routine',
    themeColor: '#288bd5',
    msTileColor: '#FFFFFF',
    appleMobileWebAppCapable: 'yes',
    appleMobileWebAppStatusBarStyle: 'black',
  },
};
