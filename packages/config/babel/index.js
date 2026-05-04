module.exports = {
    presets: [
        ['@babel/preset-env', { targets: { node: 'current' } }],
    ],
    plugins: [
        '@babel/plugin-transform-arrow-functions',
        '@babel/plugin-proposal-optional-chaining',
    ],
    env: {
        test: {
            presets: [
                ['@babel/preset-env', { targets: { node: 'current' } }],
            ],
        },
    },
};
