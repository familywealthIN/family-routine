var exec = require('cordova/exec');

var SoftKeyChecker = {
    hasSoftKeys: function(successCallback, errorCallback) {
        exec(successCallback, errorCallback, "SoftKeyChecker", "hasSoftKeys", []);
    }
};

module.exports = SoftKeyChecker;
