(function() {
    var _ = require('underscore');
    var when = require('when');
    var node = require('when/node');
    var sequence = require('when/sequence');
    var parallel = require('when/parallel');
    var V1 = require('./v1');
    var trickle = require('timetrickle');
    var Mustache = require('mustache');

    var CommandProcessor = function(config) {
        this.url = config.url;
        this.username = config.username;
        this.password = config.password;
        this.forever = config.forever;

        this.streamVariables = {
            _number: 0,
            number: function() {
                return this._number++;
            }
        };

        this.commands = {
            create: function(v1, command, callback) {
                var assetType = command.assetType
                var attributes = command.attributes
                v1.create(assetType, attributes, callback);
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
        }

        throttle = function(func){
          func();
        };
        if(config.throttle) {
          throttle = trickle(config.throttle, 1000);
        }

        this.execute = function(self, v1, command, callback) {
            throttle(function(){
                var a = JSON.stringify(command);
                var b = Mustache.render(a, self.streamVariables);
                var c = JSON.parse(b);
                console.log(c);
              self.commands[c.command](v1, c, function(err, asset) {
                if(err) return callback(err);
                if(asset.assetType)
                    self.streamVariables[asset.assetType.toLowerCase()] = asset.oid;
                callback(err, asset);
              });
            });
        };
    };

    CommandProcessor.prototype.startRateWatcher = function(totalCommands) {
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

    CommandProcessor.prototype.wrapForExecution = function(data) {
        var self = this;
        var url = data.url || this.url;
        var username = data.username || this.username;
        var password = data.password || this.password;
        var executableCommands = _.map(data.commands, function(command) {

            return function() {
                var v1 = new V1(url, username, password);
                var promiseExecute = node.call(self.execute, self, v1, command);
                promiseExecute.done(function(){
                    ++self.totalSent;
                });
                return promiseExecute;
            }
        });

        return executableCommands;
    };

    CommandProcessor.prototype.report = function(err, results) {
        if (err) {
            console.log("Error:", err)
        }
    }

    CommandProcessor.prototype.executeSeries = function(data) {
        this.executeBatch(data, sequence);
    };

    CommandProcessor.prototype.executeParallel = function(data) {
        this.executeBatch(data, parallel);
    };

    CommandProcessor.prototype.executeBatch = function(data, method) {
        var self = this;
        var once = true;

        when.iterate(function(){
            if (_.isArray(data))
                return _.map(data, function(d) {
                    return method(self.wrapForExecution(d), self.report);
                });
            else {
                self.startRateWatcher(data.commands.length);
                return method(self.wrapForExecution(data), self.report);
            }
        }, function() {
            return !self.forever && !once;
        }, function(x) {
            console.log(x);
            once = false;
        }, 0).done();
    };

    module.exports = CommandProcessor;
})();
