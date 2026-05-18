let baseConfig;
try {
    baseConfig = require('@routine-notes/config/jest');
} catch (e) {
    baseConfig = require('../config/jest');
}

module.exports = {
    ...baseConfig,
    rootDir: '.',
    testMatch: [
        '**/*.test.(js|jsx|ts|tsx)',
        '**/tests/**/*.spec.(js|jsx|ts|tsx)',
    ],
    moduleNameMapper: {
        ...baseConfig.moduleNameMapper,
        '^@routine-notes/ui/(.*)$': '<rootDir>/$1',
    },
};
