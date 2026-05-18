module.exports = {
    testEnvironment: 'node',
    rootDir: '.',
    moduleFileExtensions: ['js', 'json'],
    transform: {
        '^.+\\.js$': 'babel-jest',
    },
    testMatch: [
        '**/tests/**/*.spec.(js|ts)',
        '**/tests/**/*.test.(js|ts)',
        '**/*.test.(js|ts)',
    ],
    testEnvironmentOptions: {
        url: 'http://localhost/',
    },
};
