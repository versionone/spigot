(function() {
    var _ = require('underscore');
    var sequence = require('when/sequence');
    var parallel = require('when/parallel');
    var V1 = require('./v1');
    var trickle = require('timetrickle');

    var CommandProcessor = function(config) {
        this.url = config.url;
        this.username = config.username;
        this.password = config.password;

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

        this.execute = function(v1, command, callback) {
            var self = this;
            throttle(function(){
              self.commands[command.command](v1, command, callback)
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

            return function(callback) {
                var v1 = new V1(url, username, password);
                self.execute(v1, command, function(err, result) {
                    ++self.totalSent;
                    callback(err, result);
                });
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
        if (_.isArray(data))
            _.each(data, function(d) {
                method(self.wrapForExecution(d), self.report);
            });
        else {
            this.startRateWatcher(data.commands.length);
            method(self.wrapForExecution(data), self.report);
        }
    }

    module.exports = CommandProcessor;
})();
