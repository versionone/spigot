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


    var formattedUrl = url.slice(-1) === '/' ? url.substring(0, url.length - 1) : url;
    var v1Url = formattedUrl || 'http://localhost/VersionOne.Web';

    var spigot = new _spigot2.default({
        url: v1Url,
        username: username,
        password: password,
        throttle: throttle,
        throttleInterval: throttleinterval,
        forever: forever
    });

    (0, _metaEnforcer2.default)(v1Url, data).then(function (transformedData, err) {
        if (parallel) {
            console.log('Executing in a parallel');
            spigot.executeParallel(transformedData);
        } else {
            console.log('Executing in sequence');
            spigot.executeSeries(transformedData);
        }
    });
};