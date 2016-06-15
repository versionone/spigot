(function() {
    var _ = require('underscore');
    var when = require('when');
    var node = require('when/node');
    var sequence = require('when/sequence');
    var parallel = require('when/parallel');
    var V1 = require('./lib/v1');
    var trickle = require('timetrickle');
    var Mustache = require('mustache');

    var Spigot = function(config) {
        var spigot = this;
        this.url = config.url;
        this.username = config.username;
        this.password = config.password;
        this.forever = config.forever;

        this.streamVariables = {
            _number: 0,
            number: function() {
                return this._number++;
            },
            Number: function() {
                return this.number();
            }
        };

        this.commands = {
            create: function(v1, command, callback) {
                var assetType = command.assetType;
                var attributes = command.attributes;
                var times = command.times || 1;
                var j = 0;
                for(var i = 0; i < times; i++) {
                    v1.create(assetType, attributes, function(err, asset) {
                        callback(err, asset, j);
                        j++
                    });
                }

            },
            update: function(v1, command, callback) {
                var oid = command.oid;
                var attributes = command.attributes;
                v1.update(oid, attributes, callback);
            },
            execute: function(v1, command, callback) {
                var oid = command.oid;
                var operation = command.operation;
                v1.executeOperation(oid, operation, callback);
            }
        };

        throttle = function(func) {
            func();
        };

        if (config.throttle) {
            throttle = trickle(config.throttle, config.throttleInterval || 1000);
        }

        this.execute = function(self, v1, command, callback) {
            throttle(function() {
                var a = JSON.stringify(command);
                var b = Mustache.render(a, self.streamVariables);
                var c = JSON.parse(b);
                console.log(c);
                self.commands[c.command](v1, c, function(err, asset, i) {
                    if (err) {
                        console.log(err);
                        return callback(err);
                    }
                    if (asset && asset.name && i) {
                        self.streamVariables[asset.name + " " + i] = asset.oid;
                    }
                    if (asset && asset.name) {
                        self.streamVariables[asset.name] = asset.oid;
                    }
                    if (asset && asset.assetType) {
                        self.streamVariables[asset.assetType] = asset.oid;
                    }
                    callback(err, asset);
                });
            });
        };
    };

    Spigot.prototype.startRateWatcher = function(totalCommands) {
        var self = this;
        self.startTime = +Date.now();
        self.lastTotalSent = 0;
        self.totalSent = 0;
        self.totalCommands = totalCommands;

        self.rateReportInterval = setInterval(function() {
            var now = +Date.now();
            process.stdout.clearLine();
            process.stdout.cursorTo(0);
            process.stdout.write('Rate: ' + (self.totalSent - self.lastTotalSent) + "/s");
            self.lastTotalSent = self.totalSent;
            self.startTime = now;

            if (self.totalSent >= self.totalCommands) {
                clearInterval(self.rateReportInterval);
                console.log("Done");
            }
        }, 1000);
    };

    Spigot.prototype.wrapForExecution = function(data) {
        var self = this;
        var url = data.url || this.url;
        var username = data.username || this.username;
        var password = data.password || this.password;
        var executableCommands = _.map(data.commands, function(command) {

            return function() {
                var v1 = new V1(url, username, password);
                var promiseExecute = node.call(self.execute, self, v1, command);
                promiseExecute.done(function() {
                    ++self.totalSent;
                });
                return promiseExecute;
            }
        });

        return when.all(executableCommands);
    };

    Spigot.prototype.executeSeries = function(data, callback) {
        this.executeBatch(data, sequence, callback);
    };

    Spigot.prototype.executeParallel = function(data, callback) {
        this.executeBatch(data, parallel, callback);
    };

    Spigot.prototype.executeBatch = function(data, method, callback) {
        var self = this;
        var once = true;

        self.createdOids = [];

        when.iterate(function() {
            var executions;
            var payload = data;

            if (!_.isArray(payload))
                payload = [payload];

            executions = when.all(_.map(payload, function(d) {
                return method(self.wrapForExecution(d));
            }));

            return executions;
        }, function() {
            return !self.forever && !once;
        }, function(x) {
            once = false;
            return x;
        }, 0).done(function(x) {
            if(callback)
                callback(null, self.createdOids);
        });
    };

    module.exports = Spigot;
})();
