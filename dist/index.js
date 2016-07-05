'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _spigot = require('./spigot');

var _spigot2 = _interopRequireDefault(_spigot);

var _metaEnforcer = require('./metaEnforcer');

var _metaEnforcer2 = _interopRequireDefault(_metaEnforcer);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = function (cmdArgs, data) {
    var url = cmdArgs.url;
    var username = cmdArgs.username;
    var password = cmdArgs.password;
    var throttle = cmdArgs.throttle;
    var throttleinterval = cmdArgs.throttleinterval;
    var forever = cmdArgs.forever;
    var parallel = cmdArgs.parallel;


    var v1Url = url || 'http://localhost/VersionOne.Web';
    var formattedUrl = v1Url.slice(-1) === '/' ? v1Url.substring(0, v1Url.length - 1) : v1Url;
    console.log('making calls to ', formattedUrl);

    var spigot = new _spigot2.default({
        url: formattedUrl,
        username: username,
        password: password,
        throttle: throttle,
        throttleInterval: throttleinterval,
        forever: forever
    });

    (0, _metaEnforcer2.default)(formattedUrl, data).then(function (transformedData, err) {
        if (parallel) {
            console.log('Executing in a parallel');
            spigot.executeParallel(transformedData);
        } else {
            console.log('Executing in sequence');
            spigot.executeSeries(transformedData);
        }
    });
};