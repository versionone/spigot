'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _url = require('url');

var _url2 = _interopRequireDefault(_url);

var _v1jssdk = require('v1jssdk');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var V1 = function V1(v1Url, username, password) {
    var _this = this;

    _classCallCheck(this, V1);

    var urlInfo = _url2.default.parse(v1Url);
    var hostname = urlInfo.hostname;
    var instance = urlInfo.pathname.replace('/', '');
    var protocol = urlInfo.protocol.replace(':', '');
    var port = urlInfo.port;
    if (!urlInfo.port) port = protocol == "https" ? 443 : 80;

    this._server = new _v1jssdk.V1Server(hostname, instance, username, password, port, protocol);
    this._v1 = new _v1jssdk.V1Meta(this._server);

    this.create = function (assetType, attributes, callback) {
        _this._v1.create(assetType, attributes, function (err, rawResult) {
            if (err) console.log(err);

            if (!rawResult) return callback;
            var result = {
                oid: rawResult._v1_id,
                assetType: rawResult._v1_id.split(':')[0],
                name: rawResult._v1_current_data.Name
            };

            callback(null, result);
        });
    };

    this.update = function (oid, attributes, callback) {
        var idTokens = oid.split(":");
        var assetType = idTokens[0];
        var id = idTokens[1];
        _this._v1.update(assetType, id, attributes, function (err, rawResult) {
            if (err) console.log(err);

            if (!rawResult) return callback(err);
            var result = rawResult._v1_current_data;
            callback(null, result);
        });
    };

    this.executeOperation = function (oid, operation, callback) {
        var idTokens = oid.split(":");
        var assetType = idTokens[0];
        var id = idTokens[1];
        var op = {
            asset_type_name: assetType,
            id: id,
            opname: operation
        };

        _this._server.execute_operation(op, function (err, rawResult) {
            if (err) console.log(err);

            if (!rawResult) return callback(err);
            var result = rawResult._v1_current_data;
            callback(null, result);
        });
    };
};

exports.default = V1;