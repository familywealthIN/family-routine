let baseConfig;
try {
    baseConfig = require('@routine-notes/config/babel');
} catch (e) {
    baseConfig = require('../config/babel');
}

module.exports = baseConfig;
