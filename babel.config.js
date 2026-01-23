module.exports = {
  presets: [
    ['@vue/app', { useBuiltIns: 'usage' }],
  ],
  plugins: [
    '@babel/plugin-transform-arrow-functions',
    '@babel/plugin-proposal-optional-chaining',
  ],
};
