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
    ],
    passWithNoTests: true,
};
