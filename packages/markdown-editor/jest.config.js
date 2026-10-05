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
};
