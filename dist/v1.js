'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _superagent = require('superagent');

var _superagent2 = _interopRequireDefault(_superagent);

var _url = require('url');

var _url2 = _interopRequireDefault(_url);

var _v1sdk = require('v1sdk');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = function (v1Url, username, password) {
    var urlInfo = _url2.default.parse(v1Url);
    var hostname = urlInfo.hostname;
    var instance = urlInfo.pathname.replace('/', '');
    var protocol = urlInfo.protocol.replace(':', '');
    var port = urlInfo.port;
    if (!urlInfo.port) port = protocol == "https" ? 443 : 80;

    return new _v1sdk.V1Meta({
        hostname: hostname,
        instance: instance,
        port: port,
        protocol: protocol,
        username: username,
        password: password,
        postFn: function postFn(url, data, headerObj) {
            return new Promise(function (resolve, reject) {
                _superagent2.default.post(url).send(data).set(headerObj).end(function (error, response) {
                    error ? reject(error) : resolve(response.body);
                });
            });
        }
    });
};