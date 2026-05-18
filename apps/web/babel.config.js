module.exports = {
    presets: [
        ['@vue/app', { useBuiltIns: 'usage' }],
        ['@babel/preset-env', { targets: { node: 'current' } }],
    ],
    plugins: [
        '@babel/plugin-transform-arrow-functions',
        '@babel/plugin-proposal-optional-chaining',
    ],
};
