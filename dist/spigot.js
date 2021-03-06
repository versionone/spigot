'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _mustache = require('mustache');

var _mustache2 = _interopRequireDefault(_mustache);

var _node = require('when/node');

var _node2 = _interopRequireDefault(_node);

var _parallel = require('when/parallel');

var _parallel2 = _interopRequireDefault(_parallel);

var _sequence = require('when/sequence');

var _sequence2 = _interopRequireDefault(_sequence);

var _timetrickle = require('timetrickle');

var _timetrickle2 = _interopRequireDefault(_timetrickle);

var _v = require('./v1');

var _v2 = _interopRequireDefault(_v);

var _Oid = require('v1sdk/dist/Oid');

var _Oid2 = _interopRequireDefault(_Oid);

var _when = require('when');

var _when2 = _interopRequireDefault(_when);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Spigot = function Spigot(_ref) {
    var _this = this;

    var url = _ref.url;
    var username = _ref.username;
    var password = _ref.password;
    var forever = _ref.forever;
    var throttle = _ref.throttle;
    var throttleInterval = _ref.throttleInterval;

    _classCallCheck(this, Spigot);

    this.url = url;
    this.username = username;
    this.password = password;
    this.forever = forever;
    this.throttle = throttle;
    this.throttleInterval = throttleInterval;
    this.totalSent = 0;
    this.createdOids = [];

    this.streamVariables = {
        _number: 0,
        number: function number() {
            return _this._number++;
        },
        Number: function Number() {
            return _this.number();
        }
    };

    this.commands = {
        create: create,
        update: update,
        execute: execute
    };

    this.throttler = this.throttle ? (0, _timetrickle2.default)(this.throttle, this.throttleInterval || 1000) : function (func) {
        return func();
    };

    this.execute = function (self, v1, command, callback) {
        _this.throttler(function () {
            var a = JSON.stringify(command);
            var b = _mustache2.default.render(a, _this.streamVariables);
            var c = JSON.parse(b);
            console.log(c);
            _this.commands[c.command](v1, c).then(function (results) {
                var assets = Array.isArray(results) ? results : [results];
                assets.forEach(function (asset, i) {
                    if (asset) {
                        var oid = asset.id.split(':', 2).join(':');
                        if (asset.Attributes && asset.Attributes && asset.Attributes.Name) {
                            var name = assets.length > 1 ? '' + asset.Attributes.Name.value + (i + 1) : '' + asset.Attributes.Name.value;
                            _this.streamVariables[name] = oid;
                        }
                        if (asset.href) {
                            var type = asset.href.split('rest-1.v1/Data')[1].split('/')[1];
                            _this.streamVariables[type] = oid;
                        }
                    }
                    callback(null, asset);
                });
            }).catch(function (error) {
                console.log(error);
                callback(error);
            });
        });
    };
    this.startRateWatcher = function (totalCommands) {
        _this.startTime = +Date.now();
        _this.lastTotalSent = 0;
        _this.totalSent = 0;
        _this.totalCommands = totalCommands;

        _this.rateReportInterval = setInterval(function () {
            var now = +Date.now();
            process.stdout.clearLine();
            process.stdout.cursorTo(0);
            process.stdout.write('Rate: ' + (_this.totalSent - _this.lastTotalSent) + "/s");
            _this.lastTotalSent = _this.totalSent;
            _this.startTime = now;

            if (_this.totalSent >= _this.totalCommands) {
                clearInterval(_this.rateReportInterval);
                console.log("Done");
            }
        }, 1000);
    };

    this.wrapForExecution = function (data) {
        var url = _this.url;
        var username = data.username || _this.username;
        var password = data.password || _this.password;
        var executableCommands = data.commands.map(function (command) {
            return function () {
                var v1 = (0, _v2.default)(url, username, password);
                var promiseExecute = _node2.default.call(_this.execute, _this, v1, command);
                promiseExecute.done(function () {
                    ++_this.totalSent;
                });
                return promiseExecute;
            };
        });

        return Promise.all(executableCommands);
    };

    this.executeSeries = function (data, callback) {
        _this.executeBatch(data, _sequence2.default, callback);
    };

    this.executeParallel = function (data, callback) {
        _this.executeBatch(data, _parallel2.default, callback);
    };

    this.executeBatch = function (data, method, callback) {
        var once = true;
        _when2.default.iterate(function () {
            var payload = Array.isArray(data) ? data : [data];
            var executions = Promise.all(payload.map(function (d) {
                return method(_this.wrapForExecution(d));
            }));
            return executions;
        }, function () {
            return !_this.forever && !once;
        }, function (x) {
            once = false;
            return x;
        }, 0).done(function () {
            if (callback) callback(null, _this.createdOids);
        });
    };
};

exports.default = Spigot;


var create = function create(v1, command) {
    var assetType = command.assetType;
    var attributes = command.attributes;
    var times = command.times;

    var Times = Array.apply(null, { length: times || 1 }).map(Number.call, Number);
    return Promise.all(Times.map(function () {
        return v1.create(assetType, attributes);
    }));
};

var update = function update(v1, command) {
    var oid = command.oid;
    var attributes = command.attributes;

    var _ref2 = new _Oid2.default(oid);

    var idNumber = _ref2.idNumber;
    var type = _ref2.type;

    return v1.update(idNumber, type, attributes, '');
};

var execute = function execute(v1, command) {
    var oid = command.oid;
    var operation = command.operation;

    return v1.executeOperation(oid, operation);
};