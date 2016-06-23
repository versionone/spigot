'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _url = require('url');

var _url2 = _interopRequireDefault(_url);

var _v1jssdk = require('v1jssdk');

var _v1jssdk2 = _interopRequireDefault(_v1jssdk);

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

    this._v1 = new _v1jssdk2.default.V1Meta({
        hostname: hostname,
        instance: instance,
        port: port,
        protocol: protocol,
        username: username,
        password: password,
        post: function post(url, data, headerObj) {},
        get: function get(url, data) {}
    });

    this.create = function (assetType, attributes, callback) {

        _this._v1.create(assetType, attributes).then(function (rawResult) {
            if (!rawResult) return callback;
            var result = {
                oid: rawResult._v1_id,
                assetType: rawResult._v1_id.split(':')[0],
                name: rawResult._v1_current_data.Name
            };

            callback(null, result);
        }).catch(function (error) {
            console.log(error);
        });
    };

    this.update = function (oid, attributes, callback) {
        var _oid$split = oid.split(":");

        var _oid$split2 = _slicedToArray(_oid$split, 2);

        var assetType = _oid$split2[0];
        var id = _oid$split2[1];

        _this._v1.update(assetType, id, attributes).then(function (rawResult) {
            if (!rawResult) {
                return callback(new Error());
            }
            callback(null, rawResult._v1_current_data);
        }).catch(function (error) {
            console.log(error);
        });
    };

    this.executeOperation = function (oid, operation, callback) {
        _this._v1.executeOperation(oid, operation).then(function (rawResult) {
            if (!rawResult) {
                callback(new Error());
            }
            var result = rawResult._v1_current_data;
            callback(null, result);
        }).catch(function (error) {
            console.log(error);
        });
    };
};

exports.default = V1;