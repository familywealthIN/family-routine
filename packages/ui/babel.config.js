let baseConfig;
try {
    baseConfig = require('@family-routine/config/babel');
} catch (e) {
    baseConfig = require('../config/babel');
}

module.exports = baseConfig;
