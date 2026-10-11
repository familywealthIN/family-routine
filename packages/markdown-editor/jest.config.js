let baseConfig;
try {
    baseConfig = require('@routine-notes/config/jest');
} catch (e) {
    baseConfig = require('../config/jest');
}

module.exports = {
    ...baseConfig,
    rootDir: '.',
    testMatch: ['**/*.test.(js|jsx|ts|tsx)'],
    // `vue-easymde`'s package main is its own uncompiled `.vue` SFC, so the
    // editor's contract with it can only be tested if that file is transformed
    // like ours (webpack does the same thing through transpileDependencies).
    transformIgnorePatterns: [
        '/node_modules/(?!(@vue/composition-api|@babel/runtime|vue-easymde)/)',
    ],
};
